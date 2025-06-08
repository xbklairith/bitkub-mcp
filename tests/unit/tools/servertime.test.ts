import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { serverTimeTool } from '../../../src/tools/market/servertime.js';
import { BitkubPublicClient } from '../../../src/bitkub/client.js';
import { MCPError } from '../../../src/types/mcp.js';

vi.mock('../../../src/bitkub/client.js');

describe('ServerTime Tool', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getServerTime: vi.fn(),
    };
    vi.mocked(BitkubPublicClient.getInstance).mockReturnValue(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct metadata', () => {
    expect(serverTimeTool.name).toBe('bitkub_servertime');
    expect(serverTimeTool.description).toBe('Get Bitkub exchange server timestamp for synchronization');
    expect(serverTimeTool.inputSchema.properties).toEqual({});
    expect(serverTimeTool.inputSchema.required).toBeUndefined();
  });

  it('should fetch server time successfully', async () => {
    const mockServerTimeData = {
      timestamp: 1640995200,
    };

    mockClient.getServerTime.mockResolvedValue(mockServerTimeData);

    const result = await serverTimeTool.handler({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      timestamp: 1640995200,
      formatted: new Date(1640995200 * 1000).toISOString(),
    });
    expect(mockClient.getServerTime).toHaveBeenCalled();
    expect(result.metadata).toHaveProperty('timestamp');
    expect(result.metadata).toHaveProperty('latency');
  });

  it('should format timestamp correctly', async () => {
    const testTimestamp = 1640995200; // 2022-01-01 00:00:00 UTC
    const expectedDate = new Date(testTimestamp * 1000).toISOString();

    mockClient.getServerTime.mockResolvedValue({ timestamp: testTimestamp });

    const result = await serverTimeTool.handler({});

    expect(result.success).toBe(true);
    expect(result.data.formatted).toBe(expectedDate);
    expect(result.data.timestamp).toBe(testTimestamp);
  });

  it('should handle current timestamp', async () => {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    mockClient.getServerTime.mockResolvedValue({ timestamp: currentTimestamp });

    const result = await serverTimeTool.handler({});

    expect(result.success).toBe(true);
    expect(result.data.timestamp).toBe(currentTimestamp);
    expect(typeof result.data.formatted).toBe('string');
    expect(result.data.formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should handle zero timestamp', async () => {
    mockClient.getServerTime.mockResolvedValue({ timestamp: 0 });

    const result = await serverTimeTool.handler({});

    expect(result.success).toBe(true);
    expect(result.data.timestamp).toBe(0);
    expect(result.data.formatted).toBe('1970-01-01T00:00:00.000Z');
  });

  it('should handle MCP errors', async () => {
    const error = new MCPError('Service unavailable', 'SERVICE_UNAVAILABLE');
    mockClient.getServerTime.mockRejectedValue(error);

    const result = await serverTimeTool.handler({});

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Service unavailable',
      details: undefined,
    });
  });

  it('should handle generic errors', async () => {
    const error = new Error('Network timeout');
    mockClient.getServerTime.mockRejectedValue(error);

    const result = await serverTimeTool.handler({});

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'SERVERTIME_ERROR',
      message: 'Failed to fetch server time',
      details: error,
    });
  });

  it('should handle malformed timestamp response', async () => {
    mockClient.getServerTime.mockResolvedValue({ timestamp: 'invalid' });

    const result = await serverTimeTool.handler({});

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('INVALID_RESPONSE');
    expect(result.error.message).toBe('Invalid timestamp format');
  });
});