import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { BitkubPublicClient } from '../../../src/bitkub/client.js';

vi.mock('axios');

describe('BitkubPublicClient - getCoins', () => {
  let client: BitkubPublicClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockAxiosInstance = {
      get: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };

    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance);
    
    // Reset singleton instance
    (BitkubPublicClient as any).instance = null;
    client = BitkubPublicClient.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getCoins', () => {
    it('should fetch all coins when no symbols provided', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: 1, symbol: 'BTC', name: 'Bitcoin' },
            { id: 2, symbol: 'ETH', name: 'Ethereum' },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getCoins();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v4/crypto/coins');
      expect(result).toEqual(mockResponse.data);
    });

    it('should fetch specific coins when symbols provided', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 1, symbol: 'BTC', name: 'Bitcoin' }],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getCoins(['BTC', 'ETH']);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v4/crypto/coins?symbols=BTC%2CETH');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle empty symbols array', async () => {
      const mockResponse = { data: { data: [] } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getCoins([]);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v4/crypto/coins');
      expect(result).toEqual(mockResponse.data);
    });

    it('should cache coins data with correct key', async () => {
      const mockResponse = { data: { data: [{ id: 1, symbol: 'BTC' }] } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // First call
      await client.getCoins(['BTC']);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await client.getCoins(['BTC']);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);

      // Different symbols should make new request
      await client.getCoins(['ETH']);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('should encode special characters in symbols', async () => {
      const mockResponse = { data: { data: [] } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await client.getCoins(['BTC+', 'ETH&']);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v4/crypto/coins?symbols=BTC%2B%2CETH%26');
    });
  });
});