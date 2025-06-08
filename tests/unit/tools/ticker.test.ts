import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tickerTool } from '../../../src/tools/market/ticker.js';
import { BitkubPublicClient } from '../../../src/bitkub/client.js';
import { MCPError } from '../../../src/types/mcp.js';

vi.mock('../../../src/bitkub/client.js');

describe('Ticker Tool', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getTicker: vi.fn(),
    };
    vi.mocked(BitkubPublicClient.getInstance).mockReturnValue(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct metadata', () => {
    expect(tickerTool.name).toBe('bitkub_ticker');
    expect(tickerTool.description).toBe('Get current ticker information for all symbols or a specific trading pair');
    expect(tickerTool.inputSchema.properties).toHaveProperty('symbol');
  });

  it('should fetch all tickers when no symbol provided', async () => {
    const mockTickerData = {
      THB_BTC: {
        id: 1,
        last: '3500000.00',
        lowestAsk: '3500100.00',
        highestBid: '3499900.00',
        percentChange: '2.50',
        baseVolume: '50.25',
        quoteVolume: '175875000.00',
      },
      THB_ETH: {
        id: 2,
        last: '120000.00',
        lowestAsk: '120050.00',
        highestBid: '119950.00',
        percentChange: '1.25',
        baseVolume: '100.50',
        quoteVolume: '12060000.00',
      },
    };

    mockClient.getTicker.mockResolvedValue(mockTickerData);

    const result = await tickerTool.handler({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockTickerData);
    expect(mockClient.getTicker).toHaveBeenCalledWith(undefined);
    expect(result.metadata).toHaveProperty('timestamp');
    expect(result.metadata).toHaveProperty('latency');
  });

  it('should fetch specific ticker when symbol provided', async () => {
    const mockTickerData = {
      THB_BTC: {
        id: 1,
        last: '3500000.00',
        lowestAsk: '3500100.00',
        highestBid: '3499900.00',
        percentChange: '2.50',
        baseVolume: '50.25',
        quoteVolume: '175875000.00',
      },
    };

    mockClient.getTicker.mockResolvedValue(mockTickerData);

    const result = await tickerTool.handler({ symbol: 'THB_BTC' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockTickerData);
    expect(mockClient.getTicker).toHaveBeenCalledWith('THB_BTC');
  });

  it('should validate symbol pattern', () => {
    const symbolProperty = tickerTool.inputSchema.properties.symbol;
    expect(symbolProperty).toHaveProperty('pattern', '^[A-Z]+_[A-Z]+$');
  });

  it('should handle MCP errors', async () => {
    const error = new MCPError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
    mockClient.getTicker.mockRejectedValue(error);

    const result = await tickerTool.handler({ symbol: 'THB_BTC' });

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded',
      details: undefined,
    });
  });

  it('should handle generic errors', async () => {
    const error = new Error('Network error');
    mockClient.getTicker.mockRejectedValue(error);

    const result = await tickerTool.handler({});

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'TICKER_ERROR',
      message: 'Failed to fetch ticker data',
      details: error,
    });
  });
});