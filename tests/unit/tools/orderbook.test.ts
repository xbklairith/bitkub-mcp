import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { orderBookTool } from '../../../src/tools/market/orderbook.js';
import { BitkubPublicClient } from '../../../src/bitkub/client.js';
import { MCPError } from '../../../src/types/mcp.js';

vi.mock('../../../src/bitkub/client.js');

describe('OrderBook Tool', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getOrderBook: vi.fn(),
    };
    vi.mocked(BitkubPublicClient.getInstance).mockReturnValue(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct metadata', () => {
    expect(orderBookTool.name).toBe('bitkub_orderbook');
    expect(orderBookTool.description).toBe('Get order book depth (bids and asks) for a specific trading pair');
    expect(orderBookTool.inputSchema.properties).toHaveProperty('symbol');
    expect(orderBookTool.inputSchema.properties).toHaveProperty('limit');
    expect(orderBookTool.inputSchema.required).toContain('symbol');
  });

  it('should fetch order book with default limit', async () => {
    const mockOrderBookData = {
      bids: [
        [3499900, 0.5, 1749950],
        [3499800, 1.0, 3499800],
        [3499700, 2.0, 6999400],
      ],
      asks: [
        [3500100, 0.3, 1050030],
        [3500200, 0.8, 2800160],
        [3500300, 1.5, 5250450],
      ],
    };

    mockClient.getOrderBook.mockResolvedValue(mockOrderBookData);

    const result = await orderBookTool.handler({ symbol: 'THB_BTC' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockOrderBookData);
    expect(mockClient.getOrderBook).toHaveBeenCalledWith('THB_BTC', 100);
    expect(result.metadata).toHaveProperty('timestamp');
    expect(result.metadata).toHaveProperty('latency');
  });

  it('should fetch order book with custom limit', async () => {
    const mockOrderBookData = {
      bids: [[3499900, 0.5, 1749950]],
      asks: [[3500100, 0.3, 1050030]],
    };

    mockClient.getOrderBook.mockResolvedValue(mockOrderBookData);

    const result = await orderBookTool.handler({ symbol: 'THB_BTC', limit: 1 });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockOrderBookData);
    expect(mockClient.getOrderBook).toHaveBeenCalledWith('THB_BTC', 1);
  });

  it('should validate symbol pattern', () => {
    const symbolProperty = orderBookTool.inputSchema.properties.symbol;
    expect(symbolProperty).toHaveProperty('pattern', '^[A-Z]+_[A-Z]+$');
  });

  it('should validate limit constraints', () => {
    const limitProperty = orderBookTool.inputSchema.properties.limit;
    expect(limitProperty).toHaveProperty('minimum', 1);
    expect(limitProperty).toHaveProperty('maximum', 1000);
  });

  it('should handle invalid limit values', async () => {
    const result = await orderBookTool.handler({ symbol: 'THB_BTC', limit: 0 });

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'INVALID_PARAMETER',
      message: 'Limit must be between 1 and 1000',
      details: undefined,
    });
  });

  it('should handle limit too high', async () => {
    const result = await orderBookTool.handler({ symbol: 'THB_BTC', limit: 1500 });

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'INVALID_PARAMETER',
      message: 'Limit must be between 1 and 1000',
      details: undefined,
    });
  });

  it('should handle MCP errors', async () => {
    const error = new MCPError('Symbol not found', 'SYMBOL_NOT_FOUND');
    mockClient.getOrderBook.mockRejectedValue(error);

    const result = await orderBookTool.handler({ symbol: 'THB_XYZ' });

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'SYMBOL_NOT_FOUND',
      message: 'Symbol not found',
      details: undefined,
    });
  });

  it('should handle generic errors', async () => {
    const error = new Error('Connection timeout');
    mockClient.getOrderBook.mockRejectedValue(error);

    const result = await orderBookTool.handler({ symbol: 'THB_BTC' });

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'ORDERBOOK_ERROR',
      message: 'Failed to fetch order book data',
      details: error,
    });
  });
});