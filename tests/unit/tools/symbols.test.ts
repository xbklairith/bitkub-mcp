import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { symbolsTool } from '../../../src/tools/market/symbols.js';
import { BitkubPublicClient } from '../../../src/bitkub/client.js';
import { MCPError } from '../../../src/types/mcp.js';

vi.mock('../../../src/bitkub/client.js');

describe('Market Symbols Tool', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getSymbols: vi.fn(),
    };
    vi.mocked(BitkubPublicClient.getInstance).mockReturnValue(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct metadata with new name', () => {
    expect(symbolsTool.name).toBe('bitkub_market_symbols');
    expect(symbolsTool.description).toBe('Get list of all available trading pairs on Bitkub exchange');
    expect(symbolsTool.inputSchema.properties).toEqual({});
  });

  it('should fetch symbols successfully', async () => {
    const mockSymbolsData = {
      result: [
        { id: 1, symbol: 'THB_BTC', info: 'Bitcoin' },
        { id: 2, symbol: 'THB_ETH', info: 'Ethereum' },
        { id: 3, symbol: 'THB_ADA', info: 'Cardano' },
      ],
    };

    mockClient.getSymbols.mockResolvedValue(mockSymbolsData);

    const result = await symbolsTool.handler();

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockSymbolsData);
    expect(mockClient.getSymbols).toHaveBeenCalled();
    expect(result.metadata).toHaveProperty('timestamp');
    expect(result.metadata).toHaveProperty('latency');
  });

  it('should handle empty symbols list', async () => {
    const mockSymbolsData = { result: [] };
    mockClient.getSymbols.mockResolvedValue(mockSymbolsData);

    const result = await symbolsTool.handler();

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockSymbolsData);
    expect(result.data.result).toHaveLength(0);
  });

  it('should handle MCP errors', async () => {
    const error = new MCPError('Service unavailable', 'SERVICE_UNAVAILABLE');
    mockClient.getSymbols.mockRejectedValue(error);

    const result = await symbolsTool.handler();

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Service unavailable',
      details: undefined,
    });
  });

  it('should handle generic errors', async () => {
    const error = new Error('Connection timeout');
    mockClient.getSymbols.mockRejectedValue(error);

    const result = await symbolsTool.handler();

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'SYMBOLS_ERROR',
      message: 'Failed to fetch symbols data',
      details: error,
    });
  });
});