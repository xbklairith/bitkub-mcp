import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { coinsTool } from '../../../src/tools/market/coins.js';
import { BitkubPublicClient } from '../../../src/bitkub/client.js';
import { MCPError } from '../../../src/types/mcp.js';

vi.mock('../../../src/bitkub/client.js');

describe('Coins Tool', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getCoins: vi.fn(),
    };
    vi.mocked(BitkubPublicClient.getInstance).mockReturnValue(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct metadata', () => {
    expect(coinsTool.name).toBe('bitkub_coins');
    expect(coinsTool.description).toBe('Get cryptocurrency information including deposit/withdraw status');
    expect(coinsTool.inputSchema.properties).toHaveProperty('symbols');
  });

  it('should fetch all coins when no symbols provided', async () => {
    const mockCoinsData = {
      data: [
        {
          id: 1,
          symbol: 'BTC',
          name: 'Bitcoin',
          priority: 1,
          status: 'active',
          can_deposit: true,
          can_withdraw: true,
        },
        {
          id: 2,
          symbol: 'ETH',
          name: 'Ethereum',
          priority: 2,
          status: 'active',
          can_deposit: true,
          can_withdraw: true,
        },
      ],
    };

    mockClient.getCoins.mockResolvedValue(mockCoinsData);

    const result = await coinsTool.handler({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockCoinsData);
    expect(mockClient.getCoins).toHaveBeenCalledWith(undefined);
    expect(result.metadata).toHaveProperty('timestamp');
    expect(result.metadata).toHaveProperty('latency');
  });

  it('should fetch specific coins when symbols provided', async () => {
    const mockCoinsData = {
      data: [
        {
          id: 1,
          symbol: 'BTC',
          name: 'Bitcoin',
          priority: 1,
          status: 'active',
          can_deposit: true,
          can_withdraw: true,
        },
      ],
    };

    mockClient.getCoins.mockResolvedValue(mockCoinsData);

    const result = await coinsTool.handler({ symbols: ['BTC', 'ETH'] });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockCoinsData);
    expect(mockClient.getCoins).toHaveBeenCalledWith(['BTC', 'ETH']);
  });

  it('should handle empty symbols array', async () => {
    const mockCoinsData = { data: [] };
    mockClient.getCoins.mockResolvedValue(mockCoinsData);

    const result = await coinsTool.handler({ symbols: [] });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockCoinsData);
    expect(mockClient.getCoins).toHaveBeenCalledWith([]);
  });

  it('should handle MCP errors', async () => {
    const error = new MCPError('API Error', 'API_ERROR');
    mockClient.getCoins.mockRejectedValue(error);

    const result = await coinsTool.handler({});

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'API_ERROR',
      message: 'API Error',
      details: undefined,
    });
  });

  it('should handle generic errors', async () => {
    const error = new Error('Network error');
    mockClient.getCoins.mockRejectedValue(error);

    const result = await coinsTool.handler({});

    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'COINS_ERROR',
      message: 'Failed to fetch coins data',
      details: error,
    });
  });
});