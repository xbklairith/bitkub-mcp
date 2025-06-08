import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tradesTool } from '../../../src/tools/market/trades.js';
import { BitkubPublicClient } from '../../../src/bitkub/client.js';
import { MCPError } from '../../../src/types/mcp.js';

vi.mock('../../../src/bitkub/client.js');

describe('Trades Tool', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getTrades: vi.fn(),
    };
    vi.mocked(BitkubPublicClient.getInstance).mockReturnValue(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct metadata', () => {
    expect(tradesTool.name).toBe('bitkub_trades');
    expect(tradesTool.description).toBe('Get recent trades for a specific trading pair');
    expect(tradesTool.inputSchema.properties).toHaveProperty('symbol');
    expect(tradesTool.inputSchema.properties).toHaveProperty('limit');
    expect(tradesTool.inputSchema.required).toContain('symbol');
  });

  it('should fetch trades with default limit', async () => {
    const mockTradesData = {
      THB_BTC: [
        {
          timestamp: 1640995200,
          rate: '3500000.00',
          amount: '0.5',
          side: 'buy' as const,
        },
        {
          timestamp: 1640995100,
          rate: '3499500.00',
          amount: '1.0',
          side: 'sell' as const,
        },
        {
          timestamp: 1640995000,
          rate: '3500200.00',
          amount: '0.25',
          side: 'buy' as const,
        },
      ],
    };

    mockClient.getTrades.mockResolvedValue(mockTradesData);

    const result = await tradesTool.handler({ symbol: 'THB_BTC' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockTradesData);
    expect(mockClient.getTrades).toHaveBeenCalledWith('THB_BTC', 100);
    expect(result.metadata).toHaveProperty('timestamp');
    expect(result.metadata).toHaveProperty('latency');
  });

  it('should fetch trades with custom limit', async () => {
    const mockTradesData = {
      THB_BTC: [
        {
          timestamp: 1640995200,
          rate: '3500000.00',
          amount: '0.5',
          side: 'buy' as const,
        },
      ],
    };

    mockClient.getTrades.mockResolvedValue(mockTradesData);

    const result = await tradesTool.handler({ symbol: 'THB_BTC', limit: 1 });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockTradesData);
    expect(mockClient.getTrades).toHaveBeenCalledWith('THB_BTC', 1);
  });

  it('should validate symbol pattern', () => {
    const symbolProperty = tradesTool.inputSchema.properties.symbol;
    expect(symbolProperty).toHaveProperty('pattern', '^[A-Z]+_[A-Z]+$');
  });

  it('should validate limit constraints', () => {
    const limitProperty = tradesTool.inputSchema.properties.limit;
    expect(limitProperty).toHaveProperty('minimum', 1);
    expect(limitProperty).toHaveProperty('maximum', 1000);
  });

  it('should handle invalid limit values', async () => {
    const result = await tradesTool.handler({ symbol: 'THB_BTC', limit: 0 });

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'INVALID_PARAMETER',
      message: 'Limit must be between 1 and 1000',
      details: undefined,
    });
  });

  it('should handle limit too high', async () => {
    const result = await tradesTool.handler({ symbol: 'THB_BTC', limit: 1500 });

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'INVALID_PARAMETER',
      message: 'Limit must be between 1 and 1000',
      details: undefined,
    });
  });

  it('should handle empty trades response', async () => {
    const mockTradesData = { THB_BTC: [] };
    mockClient.getTrades.mockResolvedValue(mockTradesData);

    const result = await tradesTool.handler({ symbol: 'THB_BTC' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockTradesData);
    expect(result.data.THB_BTC).toHaveLength(0);
  });

  it('should handle MCP errors', async () => {
    const error = new MCPError('Invalid symbol', 'INVALID_SYMBOL');
    mockClient.getTrades.mockRejectedValue(error);

    const result = await tradesTool.handler({ symbol: 'THB_XYZ' });

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'INVALID_SYMBOL',
      message: 'Invalid symbol',
      details: undefined,
    });
  });

  it('should handle generic errors', async () => {
    const error = new Error('API unavailable');
    mockClient.getTrades.mockRejectedValue(error);

    const result = await tradesTool.handler({ symbol: 'THB_BTC' });

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'TRADES_ERROR',
      message: 'Failed to fetch trades data',
      details: error,
    });
  });
});