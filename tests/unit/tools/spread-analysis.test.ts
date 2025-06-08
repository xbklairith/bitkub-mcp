import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spreadAnalysisTool } from '../../../src/tools/market/spread-analysis.js';
import { BitkubPublicClient } from '../../../src/bitkub/client.js';
import { MCPError } from '../../../src/types/mcp.js';

vi.mock('../../../src/bitkub/client.js');

describe('Spread Analysis Tool', () => {
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
    expect(spreadAnalysisTool.name).toBe('bitkub_spread_analysis');
    expect(spreadAnalysisTool.description).toBe('Analyze bid-ask spreads and market liquidity across trading pairs');
    expect(spreadAnalysisTool.inputSchema.properties).toHaveProperty('symbol');
    expect(spreadAnalysisTool.inputSchema.properties).toHaveProperty('minVolume');
    expect(spreadAnalysisTool.inputSchema.properties).toHaveProperty('sortBy');
    expect(spreadAnalysisTool.inputSchema.properties).toHaveProperty('limit');
    expect(spreadAnalysisTool.inputSchema.required).toBeUndefined();
  });

  it('should analyze spreads for all THB pairs by default', async () => {
    const mockAllTickers = {
      THB_BTC: {
        highestBid: '3499900.00',
        lowestAsk: '3500100.00',
        baseVolume: '50.25',
      },
      THB_ETH: {
        highestBid: '119950.00',
        lowestAsk: '120050.00',
        baseVolume: '100.50',
      },
      BTC_ETH: {
        highestBid: '0.03400',
        lowestAsk: '0.03410',
        baseVolume: '25.00',
      },
    };

    mockClient.getTicker.mockResolvedValue(mockAllTickers);

    const result = await spreadAnalysisTool.handler({});

    expect(result.success).toBe(true);
    expect(result.data.spreads).toHaveLength(2); // Only THB pairs
    expect(result.data.spreads[0].symbol).toMatch(/^THB_/);
    expect(result.data.spreads[1].symbol).toMatch(/^THB_/);
    expect(result.data.summary.totalSymbols).toBe(2);
    expect(result.metadata).toHaveProperty('timestamp');
    expect(result.metadata).toHaveProperty('latency');
  });

  it('should analyze specific symbol when provided', async () => {
    const mockAllTickers = {
      THB_BTC: {
        highestBid: '3499900.00',
        lowestAsk: '3500100.00',
        baseVolume: '50.25',
      },
      THB_ETH: {
        highestBid: '119950.00',
        lowestAsk: '120050.00',
        baseVolume: '100.50',
      },
    };

    mockClient.getTicker.mockResolvedValue(mockAllTickers);

    const result = await spreadAnalysisTool.handler({ symbol: 'THB_BTC' });

    expect(result.success).toBe(true);
    expect(result.data.spreads).toHaveLength(1);
    expect(result.data.spreads[0].symbol).toBe('THB_BTC');
    expect(result.data.spreads[0].bid).toBe(3499900);
    expect(result.data.spreads[0].ask).toBe(3500100);
    expect(result.data.spreads[0].spread).toBe(200);
    expect(result.data.spreads[0].spreadPercent).toBeCloseTo(0.0057, 4);
    expect(result.data.spreads[0].midPrice).toBe(3500000);
    expect(result.data.spreads[0].volume24h).toBe(50.25);
    expect(result.data.spreads[0].liquidity).toBe('medium');
  });

  it('should filter by minimum volume', async () => {
    const mockAllTickers = {
      THB_BTC: {
        highestBid: '3499900.00',
        lowestAsk: '3500100.00',
        baseVolume: '50.25', // Above threshold
      },
      THB_ETH: {
        highestBid: '119950.00',
        lowestAsk: '120050.00',
        baseVolume: '0.05', // Below threshold
      },
    };

    mockClient.getTicker.mockResolvedValue(mockAllTickers);

    const result = await spreadAnalysisTool.handler({ minVolume: 1.0 });

    expect(result.success).toBe(true);
    expect(result.data.spreads).toHaveLength(1);
    expect(result.data.spreads[0].symbol).toBe('THB_BTC');
    expect(result.data.summary.totalSymbols).toBe(1);
  });

  it('should sort by spread percent by default', async () => {
    const mockAllTickers = {
      THB_BTC: {
        highestBid: '3499900.00',
        lowestAsk: '3500100.00', // 0.0057% spread
        baseVolume: '50.25',
      },
      THB_ETH: {
        highestBid: '119950.00',
        lowestAsk: '120150.00', // 0.167% spread
        baseVolume: '100.50',
      },
    };

    mockClient.getTicker.mockResolvedValue(mockAllTickers);

    const result = await spreadAnalysisTool.handler({});

    expect(result.success).toBe(true);
    expect(result.data.spreads).toHaveLength(2);
    expect(result.data.spreads[0].symbol).toBe('THB_BTC'); // Tightest spread first
    expect(result.data.spreads[1].symbol).toBe('THB_ETH'); // Wider spread second
  });

  it('should sort by volume when specified', async () => {
    const mockAllTickers = {
      THB_BTC: {
        highestBid: '3499900.00',
        lowestAsk: '3500100.00',
        baseVolume: '25.00', // Lower volume
      },
      THB_ETH: {
        highestBid: '119950.00',
        lowestAsk: '120050.00',
        baseVolume: '100.50', // Higher volume
      },
    };

    mockClient.getTicker.mockResolvedValue(mockAllTickers);

    const result = await spreadAnalysisTool.handler({ sortBy: 'volume' });

    expect(result.success).toBe(true);
    expect(result.data.spreads).toHaveLength(2);
    expect(result.data.spreads[0].symbol).toBe('THB_ETH'); // Higher volume first
    expect(result.data.spreads[1].symbol).toBe('THB_BTC'); // Lower volume second
  });

  it('should limit results when specified', async () => {
    const mockAllTickers = {
      THB_BTC: {
        highestBid: '3499900.00',
        lowestAsk: '3500100.00',
        baseVolume: '50.25',
      },
      THB_ETH: {
        highestBid: '119950.00',
        lowestAsk: '120050.00',
        baseVolume: '100.50',
      },
      THB_ADA: {
        highestBid: '15.50',
        lowestAsk: '15.55',
        baseVolume: '1000.0',
      },
    };

    mockClient.getTicker.mockResolvedValue(mockAllTickers);

    const result = await spreadAnalysisTool.handler({ limit: 2 });

    expect(result.success).toBe(true);
    expect(result.data.spreads).toHaveLength(2);
    expect(result.data.summary.totalSymbols).toBe(3); // Total found, not limited
  });

  it('should categorize liquidity correctly', async () => {
    const mockAllTickers = {
      THB_BTC: {
        highestBid: '3499900.00',
        lowestAsk: '3500100.00',
        baseVolume: '150.25', // High for major pair
      },
      THB_ADA: {
        highestBid: '15.50',
        lowestAsk: '15.55',
        baseVolume: '5.0', // Medium for alt pair
      },
      THB_XRP: {
        highestBid: '25.50',
        lowestAsk: '25.55',
        baseVolume: '0.5', // Low for alt pair
      },
    };

    mockClient.getTicker.mockResolvedValue(mockAllTickers);

    const result = await spreadAnalysisTool.handler({});

    expect(result.success).toBe(true);
    expect(result.data.spreads).toHaveLength(3);
    
    const btcData = result.data.spreads.find(s => s.symbol === 'THB_BTC');
    const adaData = result.data.spreads.find(s => s.symbol === 'THB_ADA');
    const xrpData = result.data.spreads.find(s => s.symbol === 'THB_XRP');
    
    expect(btcData?.liquidity).toBe('high');
    expect(adaData?.liquidity).toBe('medium');
    expect(xrpData?.liquidity).toBe('low');
  });

  it('should calculate summary statistics correctly', async () => {
    const mockAllTickers = {
      THB_BTC: {
        highestBid: '3499900.00',
        lowestAsk: '3500100.00',
        baseVolume: '50.25',
      },
      THB_ETH: {
        highestBid: '119950.00',
        lowestAsk: '120050.00',
        baseVolume: '100.50',
      },
    };

    mockClient.getTicker.mockResolvedValue(mockAllTickers);

    const result = await spreadAnalysisTool.handler({});

    expect(result.success).toBe(true);
    expect(result.data.summary.totalSymbols).toBe(2);
    expect(result.data.summary.avgSpread).toBeGreaterThan(0);
    expect(result.data.summary.avgSpreadPercent).toBeGreaterThan(0);
    expect(result.data.summary.tightestSpread).toBe('THB_BTC');
    expect(result.data.summary.widestSpread).toBe('THB_ETH');
  });

  it('should skip pairs with no bid/ask', async () => {
    const mockAllTickers = {
      THB_BTC: {
        highestBid: '3499900.00',
        lowestAsk: '3500100.00',
        baseVolume: '50.25',
      },
      THB_ETH: {
        highestBid: '0', // No bid
        lowestAsk: '120050.00',
        baseVolume: '100.50',
      },
    };

    mockClient.getTicker.mockResolvedValue(mockAllTickers);

    const result = await spreadAnalysisTool.handler({});

    expect(result.success).toBe(true);
    expect(result.data.spreads).toHaveLength(1);
    expect(result.data.spreads[0].symbol).toBe('THB_BTC');
  });

  it('should handle MCP errors', async () => {
    const error = new MCPError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
    mockClient.getTicker.mockRejectedValue(error);

    const result = await spreadAnalysisTool.handler({});

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

    const result = await spreadAnalysisTool.handler({});

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'SPREAD_ANALYSIS_ERROR',
      message: 'Failed to analyze spread data',
      details: error,
    });
  });

  it('should validate sort criteria', () => {
    const sortByProperty = spreadAnalysisTool.inputSchema.properties.sortBy;
    expect(sortByProperty).toHaveProperty('enum', ['spread', 'spreadPercent', 'volume']);
  });

  it('should validate limit constraints', () => {
    const limitProperty = spreadAnalysisTool.inputSchema.properties.limit;
    expect(limitProperty).toHaveProperty('minimum', 1);
    expect(limitProperty).toHaveProperty('maximum', 100);
  });
});