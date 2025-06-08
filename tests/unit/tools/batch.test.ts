import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { batchTickerTool } from '../../../src/tools/market/batch.js';
import { BitkubPublicClient } from '../../../src/bitkub/client.js';
import { MCPError } from '../../../src/types/mcp.js';

vi.mock('../../../src/bitkub/client.js');

describe('Batch Ticker Tool', () => {
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
    expect(batchTickerTool.name).toBe('bitkub_batch_ticker');
    expect(batchTickerTool.description).toBe('Get ticker data for multiple symbols efficiently with optional analysis');
    expect(batchTickerTool.inputSchema.properties).toHaveProperty('symbols');
    expect(batchTickerTool.inputSchema.properties).toHaveProperty('includeAnalysis');
    expect(batchTickerTool.inputSchema.required).toContain('symbols');
  });

  it('should fetch batch ticker data without analysis', async () => {
    const mockAllTickers = {
      THB_BTC: {
        last: '3500000.00',
        percentChange: '2.50',
        baseVolume: '50.25',
        highestBid: '3499900.00',
        lowestAsk: '3500100.00',
      },
      THB_ETH: {
        last: '120000.00',
        percentChange: '1.25',
        baseVolume: '100.50',
        highestBid: '119950.00',
        lowestAsk: '120050.00',
      },
    };

    mockClient.getTicker.mockResolvedValue(mockAllTickers);

    const result = await batchTickerTool.handler({
      symbols: ['THB_BTC', 'THB_ETH'],
      includeAnalysis: false,
    });

    expect(result.success).toBe(true);
    expect(result.data.tickers).toHaveProperty('THB_BTC');
    expect(result.data.tickers).toHaveProperty('THB_ETH');
    expect(result.data.tickers.THB_BTC.symbol).toBe('THB_BTC');
    expect(result.data.tickers.THB_BTC.price).toBe(3500000);
    expect(result.data.tickers.THB_BTC.change).toBe(2.5);
    expect(result.data.analysis).toBeUndefined();
    expect(mockClient.getTicker).toHaveBeenCalledWith();
  });

  it('should fetch batch ticker data with analysis', async () => {
    const mockAllTickers = {
      THB_BTC: {
        last: '3500000.00',
        percentChange: '2.50',
        baseVolume: '50.25',
        highestBid: '3499900.00',
        lowestAsk: '3500100.00',
      },
      THB_ETH: {
        last: '120000.00',
        percentChange: '-1.25',
        baseVolume: '100.50',
        highestBid: '119950.00',
        lowestAsk: '120050.00',
      },
    };

    mockClient.getTicker.mockResolvedValue(mockAllTickers);

    const result = await batchTickerTool.handler({
      symbols: ['THB_BTC', 'THB_ETH'],
      includeAnalysis: true,
    });

    expect(result.success).toBe(true);
    expect(result.data.tickers).toHaveProperty('THB_BTC');
    expect(result.data.tickers).toHaveProperty('THB_ETH');
    expect(result.data.analysis).toBeDefined();
    expect(result.data.analysis.bestPerformer).toBe('THB_BTC');
    expect(result.data.analysis.worstPerformer).toBe('THB_ETH');
    expect(result.data.analysis.highestVolume).toBe('THB_ETH');
    expect(result.data.analysis.totalSymbols).toBe(2);
  });

  it('should validate symbol patterns', async () => {
    const result = await batchTickerTool.handler({
      symbols: ['invalid_symbol', 'THB_BTC'], // lowercase to trigger validation
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('INVALID_PARAMETER');
    expect(result.error.message).toContain('Invalid symbol format: invalid_symbol');
  });

  it('should handle too many symbols', async () => {
    const manySymbols = Array.from({ length: 51 }, (_, i) => `THB_COIN${i}`);

    const result = await batchTickerTool.handler({
      symbols: manySymbols,
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('INVALID_PARAMETER');
    expect(result.error.message).toBe('Maximum 50 symbols allowed per batch request');
  });

  it('should handle empty symbols array', async () => {
    const result = await batchTickerTool.handler({
      symbols: [],
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('INVALID_PARAMETER');
    expect(result.error.message).toBe('At least one symbol is required');
  });

  it('should skip missing symbols gracefully', async () => {
    const mockAllTickers = {
      THB_BTC: {
        last: '3500000.00',
        percentChange: '2.50',
        baseVolume: '50.25',
        highestBid: '3499900.00',
        lowestAsk: '3500100.00',
      },
      // THB_MISSING is not in the response
    };

    mockClient.getTicker.mockResolvedValue(mockAllTickers);

    const result = await batchTickerTool.handler({
      symbols: ['THB_BTC', 'THB_MISSING'],
    });

    expect(result.success).toBe(true);
    expect(result.data.tickers).toHaveProperty('THB_BTC');
    expect(result.data.tickers).not.toHaveProperty('THB_MISSING');
    expect(Object.keys(result.data.tickers)).toHaveLength(1);
  });

  it('should calculate spread correctly', async () => {
    const mockAllTickers = {
      THB_BTC: {
        last: '3500000.00',
        percentChange: '2.50',
        baseVolume: '50.25',
        highestBid: '3499900.00',
        lowestAsk: '3500100.00',
      },
    };

    mockClient.getTicker.mockResolvedValue(mockAllTickers);

    const result = await batchTickerTool.handler({
      symbols: ['THB_BTC'],
    });

    expect(result.success).toBe(true);
    expect(result.data.tickers.THB_BTC.bid).toBe(3499900);
    expect(result.data.tickers.THB_BTC.ask).toBe(3500100);
    expect(result.data.tickers.THB_BTC.spread).toBe(200);
    expect(result.data.tickers.THB_BTC.spreadPercent).toBeCloseTo(0.0057, 4);
  });

  it('should handle MCP errors', async () => {
    const error = new MCPError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
    mockClient.getTicker.mockRejectedValue(error);

    const result = await batchTickerTool.handler({
      symbols: ['THB_BTC'],
    });

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

    const result = await batchTickerTool.handler({
      symbols: ['THB_BTC'],
    });

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'BATCH_TICKER_ERROR',
      message: 'Failed to fetch batch ticker data',
      details: error,
    });
  });
});