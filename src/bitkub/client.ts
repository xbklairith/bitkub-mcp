// Bitkub Public API Client

import axios, { type AxiosInstance } from 'axios';
import type {
  BitkubClientConfig,
  OrderBookData,
  ServerTimeResponse,
  SymbolsResponse,
  TickerResponse,
  TradesResponse,
} from '../types/bitkub.js';
import { MCPError } from '../types/mcp.js';
import { ResponseCache } from '../utils/cache.js';
import { RateLimiter } from '../utils/rate-limiter.js';

export class BitkubPublicClient {
  private static instance: BitkubPublicClient;
  private axios: AxiosInstance;
  private cache: ResponseCache;
  private rateLimiter: RateLimiter;
  private cacheTTL: number;

  private constructor(config: BitkubClientConfig = {}) {
    this.cache = new ResponseCache();
    this.rateLimiter = new RateLimiter(config.rateLimitPerMinute);
    this.cacheTTL = config.cacheTTLSeconds || 10;

    this.axios = axios.create({
      baseURL: config.baseURL || 'https://api.bitkub.com',
      timeout: config.timeout || 10000,
      headers: {
        'User-Agent': 'bitkub-mcp/1.0.0',
        Accept: 'application/json',
      },
    });

    this.setupInterceptors();
  }

  static getInstance(config?: BitkubClientConfig): BitkubPublicClient {
    if (!BitkubPublicClient.instance) {
      BitkubPublicClient.instance = new BitkubPublicClient(config);
    }
    return BitkubPublicClient.instance;
  }

  private setupInterceptors(): void {
    // Request interceptor for rate limiting
    this.axios.interceptors.request.use(async (config) => {
      await this.rateLimiter.checkLimit();
      return config;
    });

    // Response interceptor for error handling
    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // Bitkub API error
          const status = error.response.status;
          const data = error.response.data;

          if (status === 429) {
            throw new MCPError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
          }

          if (data?.error) {
            throw new MCPError(`Bitkub API error: ${data.error}`, 'BITKUB_API_ERROR', data);
          }

          throw new MCPError(`HTTP ${status}: ${error.response.statusText}`, 'HTTP_ERROR', {
            status,
            statusText: error.response.statusText,
          });
        }

        if (error.code === 'ECONNABORTED') {
          throw new MCPError('Request timeout', 'TIMEOUT');
        }

        if (error.code === 'ENOTFOUND') {
          throw new MCPError('Bitkub API unreachable', 'SERVICE_UNAVAILABLE');
        }

        throw new MCPError('Unknown error occurred', 'UNKNOWN_ERROR', error);
      },
    );
  }

  private async getCachedOrFetch<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Fetch from API
    const data = await fetcher();

    // Cache the result
    this.cache.set(cacheKey, data, ttlSeconds || this.cacheTTL);

    return data;
  }

  async getTicker(symbol?: string): Promise<TickerResponse> {
    const cacheKey = `ticker:${symbol || 'all'}`;

    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        const url = symbol ? `/api/market/ticker?sym=${symbol}` : '/api/market/ticker';
        const response = await this.axios.get(url);
        return response.data;
      },
      10, // 10 seconds cache
    );
  }

  async getOrderBook(symbol: string, limit = 100): Promise<OrderBookData> {
    const cacheKey = `orderbook:${symbol}:${limit}`;

    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        const response = await this.axios.get(`/api/market/depth?sym=${symbol}&lmt=${limit}`);
        return response.data;
      },
      5, // 5 seconds cache
    );
  }

  async getTrades(symbol: string, limit = 100): Promise<TradesResponse> {
    const cacheKey = `trades:${symbol}:${limit}`;

    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        const response = await this.axios.get(`/api/market/trades?sym=${symbol}&lmt=${limit}`);
        return response.data;
      },
      5, // 5 seconds cache
    );
  }

  async getSymbols(): Promise<SymbolsResponse> {
    const cacheKey = 'symbols';

    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        const response = await this.axios.get('/api/market/symbols');
        return response.data;
      },
      3600, // 1 hour cache (symbols rarely change)
    );
  }

  async getServerTime(): Promise<ServerTimeResponse> {
    const cacheKey = 'servertime';

    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        // Return current timestamp as Bitkub may not have a servertime endpoint
        return { timestamp: Math.floor(Date.now() / 1000) };
      },
      60, // 1 minute cache
    );
  }

  async getCoins(symbols?: string[]): Promise<any> {
    const cacheKey = symbols ? `coins:${symbols.join(',')}` : 'coins:all';

    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        let url = '/api/v4/crypto/coins';
        if (symbols && symbols.length > 0) {
          const symbolsParam = symbols.join(',');
          url += `?symbols=${encodeURIComponent(symbolsParam)}`;
        }
        const response = await this.axios.get(url);
        return response.data;
      },
      300, // 5 minutes cache
    );
  }

  // Utility methods
  getRemainingRequests(): number {
    return this.rateLimiter.getRemainingRequests();
  }

  getRateLimitReset(): Date {
    return this.rateLimiter.getResetTime();
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size();
  }
}
