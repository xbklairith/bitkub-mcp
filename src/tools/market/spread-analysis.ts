// Bitkub Spread Analysis Tool

import { BitkubPublicClient } from '../../bitkub/client.js';
import { MCPError, type MCPTool, type MCPToolResponse } from '../../types/mcp.js';

interface SpreadAnalysisParams {
  symbol?: string;
  minVolume?: number;
  sortBy?: 'spread' | 'spreadPercent' | 'volume';
  limit?: number;
}

interface SpreadData {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  spreadPercent: number;
  midPrice: number;
  volume24h: number;
  liquidity: 'high' | 'medium' | 'low';
}

interface SpreadAnalysisResult {
  spreads: SpreadData[];
  summary: {
    avgSpread: number;
    avgSpreadPercent: number;
    tightestSpread: string;
    widestSpread: string;
    totalSymbols: number;
  };
}

function createSuccessResponse<T>(data: T, startTime: number): MCPToolResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: Date.now(),
      latency: Date.now() - startTime,
    },
  };
}

function createErrorResponse(error: MCPError): MCPToolResponse<never> {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
    metadata: {
      timestamp: Date.now(),
      latency: 0,
    },
  };
}

function categorizeLiquidity(volume: number, symbol: string): 'high' | 'medium' | 'low' {
  // Major pairs (BTC, ETH, USDT) have different thresholds
  const isMajorPair = ['THB_BTC', 'THB_ETH', 'THB_USDT'].includes(symbol);

  if (isMajorPair) {
    if (volume > 100) return 'high';
    if (volume > 10) return 'medium';
    return 'low';
  }
  if (volume > 10) return 'high';
  if (volume > 1) return 'medium';
  return 'low';
}

export const spreadAnalysisTool: MCPTool = {
  name: 'bitkub_spread_analysis',
  description: 'Analyze bid-ask spreads and market liquidity across trading pairs',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Specific symbol to analyze (optional, defaults to all THB pairs)',
        pattern: '^[A-Z]+_[A-Z]+$',
      },
      minVolume: {
        type: 'number',
        description: 'Minimum 24h volume filter (default: 0.1)',
        minimum: 0,
        default: 0.1,
      },
      sortBy: {
        type: 'string',
        enum: ['spread', 'spreadPercent', 'volume'],
        description: 'Sort criteria (default: spreadPercent)',
        default: 'spreadPercent',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 20)',
        minimum: 1,
        maximum: 100,
        default: 20,
      },
    },
    additionalProperties: false,
  },
  handler: async (params: SpreadAnalysisParams): Promise<MCPToolResponse<SpreadAnalysisResult>> => {
    const startTime = Date.now();

    try {
      const client = BitkubPublicClient.getInstance();
      const allTickers = await client.getTicker();

      const minVolume = params.minVolume || 0.1;
      const limit = params.limit || 20;
      const sortBy = params.sortBy || 'spreadPercent';

      const spreads: SpreadData[] = [];

      // Process tickers
      for (const [symbol, ticker] of Object.entries(allTickers)) {
        // Filter by symbol if specified
        if (params.symbol && symbol !== params.symbol) {
          continue;
        }

        // Filter to THB pairs if no specific symbol
        if (!params.symbol && !symbol.startsWith('THB_')) {
          continue;
        }

        const bid = Number.parseFloat(ticker.highestBid || '0');
        const ask = Number.parseFloat(ticker.lowestAsk || '0');
        const volume = Number.parseFloat(ticker.baseVolume || '0');

        // Skip if no bid/ask or below volume threshold
        if (bid === 0 || ask === 0 || volume < minVolume) {
          continue;
        }

        const spread = ask - bid;
        const spreadPercent = (spread / bid) * 100;
        const midPrice = (bid + ask) / 2;

        spreads.push({
          symbol,
          bid,
          ask,
          spread: Math.round(spread * 100) / 100,
          spreadPercent: Math.round(spreadPercent * 10000) / 10000,
          midPrice: Math.round(midPrice * 100) / 100,
          volume24h: Math.round(volume * 100) / 100,
          liquidity: categorizeLiquidity(volume, symbol),
        });
      }

      // Sort by specified criteria
      spreads.sort((a, b) => {
        switch (sortBy) {
          case 'spread':
            return a.spread - b.spread;
          case 'spreadPercent':
            return a.spreadPercent - b.spreadPercent;
          case 'volume':
            return b.volume24h - a.volume24h;
          default:
            return a.spreadPercent - b.spreadPercent;
        }
      });

      // Limit results
      const limitedSpreads = spreads.slice(0, limit);

      // Calculate summary
      const avgSpread =
        spreads.length > 0 ? spreads.reduce((sum, s) => sum + s.spread, 0) / spreads.length : 0;

      const avgSpreadPercent =
        spreads.length > 0
          ? spreads.reduce((sum, s) => sum + s.spreadPercent, 0) / spreads.length
          : 0;

      const tightestSpread =
        spreads.length > 0
          ? spreads.reduce((min, current) =>
              current.spreadPercent < min.spreadPercent ? current : min,
            ).symbol
          : 'N/A';

      const widestSpread =
        spreads.length > 0
          ? spreads.reduce((max, current) =>
              current.spreadPercent > max.spreadPercent ? current : max,
            ).symbol
          : 'N/A';

      const result: SpreadAnalysisResult = {
        spreads: limitedSpreads,
        summary: {
          avgSpread: Math.round(avgSpread * 100) / 100,
          avgSpreadPercent: Math.round(avgSpreadPercent * 10000) / 10000,
          tightestSpread,
          widestSpread,
          totalSymbols: spreads.length,
        },
      };

      return createSuccessResponse(result, startTime);
    } catch (error) {
      if (error instanceof MCPError) {
        return createErrorResponse(error);
      }

      return createErrorResponse(
        new MCPError('Failed to analyze spread data', 'SPREAD_ANALYSIS_ERROR', error),
      );
    }
  },
};
