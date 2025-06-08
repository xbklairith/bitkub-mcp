import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportTool } from '../../../src/tools/market/export.js';
import { BitkubPublicClient } from '../../../src/bitkub/client.js';
import { MCPError } from '../../../src/types/mcp.js';

vi.mock('../../../src/bitkub/client.js');

describe('Export Tool', () => {
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
    expect(exportTool.name).toBe('bitkub_export');
    expect(exportTool.description).toBe('Export market data in various formats (CSV, JSON, table)');
    expect(exportTool.inputSchema.properties).toHaveProperty('symbols');
    expect(exportTool.inputSchema.properties).toHaveProperty('format');
    expect(exportTool.inputSchema.properties).toHaveProperty('includeSpread');
    expect(exportTool.inputSchema.properties).toHaveProperty('includeVolume');
    expect(exportTool.inputSchema.required).toContain('symbols');
  });

  it('should export data in table format by default', async () => {
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

    const result = await exportTool.handler({
      symbols: ['THB_BTC'],
    });

    expect(result.success).toBe(true);
    expect(result.data.format).toBe('table');
    expect(result.data.data).toContain('THB_BTC');
    expect(result.data.data).toContain('3500000');
    expect(result.data.data).toContain('2.5');
    expect(result.data.data).toContain('50.25');
    expect(result.data.symbolCount).toBe(1);
    expect(result.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(result.metadata).toHaveProperty('timestamp');
    expect(result.metadata).toHaveProperty('latency');
  });

  it('should export data in CSV format', async () => {
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

    const result = await exportTool.handler({
      symbols: ['THB_BTC', 'THB_ETH'],
      format: 'csv',
    });

    expect(result.success).toBe(true);
    expect(result.data.format).toBe('csv');
    expect(result.data.data).toContain('Symbol,Price,Change%,Volume24h');
    expect(result.data.data).toContain('THB_BTC,3500000,2.5,50.25');
    expect(result.data.data).toContain('THB_ETH,120000,1.25,100.5');
    expect(result.data.symbolCount).toBe(2);
  });

  it('should export data in JSON format', async () => {
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

    const result = await exportTool.handler({
      symbols: ['THB_BTC'],
      format: 'json',
    });

    expect(result.success).toBe(true);
    expect(result.data.format).toBe('json');
    
    const parsedData = JSON.parse(result.data.data);
    expect(parsedData).toHaveLength(1);
    expect(parsedData[0]).toEqual({
      symbol: 'THB_BTC',
      price: 3500000,
      change: 2.5,
      volume: 50.25,
    });
    expect(result.data.symbolCount).toBe(1);
  });

  it('should include spread data when requested', async () => {
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

    const result = await exportTool.handler({
      symbols: ['THB_BTC'],
      format: 'json',
      includeSpread: true,
    });

    expect(result.success).toBe(true);
    
    const parsedData = JSON.parse(result.data.data);
    expect(parsedData[0]).toHaveProperty('bid', 3499900);
    expect(parsedData[0]).toHaveProperty('ask', 3500100);
    expect(parsedData[0]).toHaveProperty('spreadPercent');
    expect(parsedData[0].spreadPercent).toBeCloseTo(0.0057, 4);
  });

  it('should exclude volume when requested', async () => {
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

    const result = await exportTool.handler({
      symbols: ['THB_BTC'],
      format: 'json',
      includeVolume: false,
    });

    expect(result.success).toBe(true);
    
    const parsedData = JSON.parse(result.data.data);
    expect(parsedData[0]).not.toHaveProperty('volume');
    expect(parsedData[0]).toEqual({
      symbol: 'THB_BTC',
      price: 3500000,
      change: 2.5,
    });
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

    const result = await exportTool.handler({
      symbols: ['THB_BTC', 'THB_MISSING'],
      format: 'json',
    });

    expect(result.success).toBe(true);
    expect(result.data.symbolCount).toBe(1);
    
    const parsedData = JSON.parse(result.data.data);
    expect(parsedData).toHaveLength(1);
    expect(parsedData[0].symbol).toBe('THB_BTC');
  });

  it('should handle empty symbols array', async () => {
    const result = await exportTool.handler({
      symbols: [],
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('INVALID_PARAMETER');
    expect(result.error.message).toBe('At least one symbol is required');
  });

  it('should handle too many symbols', async () => {
    const manySymbols = Array.from({ length: 101 }, (_, i) => `THB_COIN${i}`);

    const result = await exportTool.handler({
      symbols: manySymbols,
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('INVALID_PARAMETER');
    expect(result.error.message).toBe('Maximum 100 symbols allowed per export');
  });

  it('should validate format enum', () => {
    const formatProperty = exportTool.inputSchema.properties.format;
    expect(formatProperty).toHaveProperty('enum', ['csv', 'json', 'table']);
  });

  it('should validate symbols constraints', () => {
    const symbolsProperty = exportTool.inputSchema.properties.symbols;
    expect(symbolsProperty).toHaveProperty('minItems', 1);
    expect(symbolsProperty).toHaveProperty('maxItems', 100);
    expect(symbolsProperty.items).toHaveProperty('pattern', '^[A-Z]+_[A-Z]+$');
  });

  it('should format CSV with spread data correctly', async () => {
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

    const result = await exportTool.handler({
      symbols: ['THB_BTC'],
      format: 'csv',
      includeSpread: true,
    });

    expect(result.success).toBe(true);
    expect(result.data.data).toContain('Symbol,Price,Change%,Volume24h,Bid,Ask,Spread%');
    expect(result.data.data).toContain('THB_BTC,3500000,2.5,50.25,3499900,3500100,0.0057');
  });

  it('should format table with proper alignment', async () => {
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

    const result = await exportTool.handler({
      symbols: ['THB_BTC'],
      format: 'table',
    });

    expect(result.success).toBe(true);
    expect(result.data.data).toContain('+'); // Table borders
    expect(result.data.data).toContain('|'); // Column separators
    expect(result.data.data).toContain('Symbol');
    expect(result.data.data).toContain('Price');
    expect(result.data.data).toContain('Change%');
    expect(result.data.data).toContain('Volume24h');
  });

  it('should handle MCP errors', async () => {
    const error = new MCPError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
    mockClient.getTicker.mockRejectedValue(error);

    const result = await exportTool.handler({
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

    const result = await exportTool.handler({
      symbols: ['THB_BTC'],
    });

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'EXPORT_ERROR',
      message: 'Failed to export market data',
      details: error,
    });
  });

  it('should handle empty data gracefully', async () => {
    const mockAllTickers = {};

    mockClient.getTicker.mockResolvedValue(mockAllTickers);

    const result = await exportTool.handler({
      symbols: ['THB_NONEXISTENT'],
      format: 'table',
    });

    expect(result.success).toBe(true);
    expect(result.data.data).toBe('No data available');
    expect(result.data.symbolCount).toBe(0);
  });
});