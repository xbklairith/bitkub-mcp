// Bitkub Batch Operations Tool

import { BitkubPublicClient } from '../../bitkub/client.js';
import { MCPError, type MCPTool, type MCPToolResponse } from '../../types/mcp.js';

interface BatchTickerParams {
  symbols: string[];
  includeAnalysis?: boolean;
}

interface BatchTickerResult {
  tickers: Record<
    string,
    {
      symbol: string;
      price: number;
      change: number;
      volume: number;
      bid: number;
      ask: number;
      spread: number;
      spreadPercent: number;
    }
  >;
  analysis?: {
    bestPerformer: string;
    worstPerformer: string;
    highestVolume: string;
    avgChange: number;
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

export const batchTickerTool: MCPTool = {
  name: 'bitkub_batch_ticker',
  description: 'Get ticker data for multiple symbols efficiently with optional analysis',
  inputSchema: {
    type: 'object',
    properties: {
      symbols: {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^[A-Z]+_[A-Z]+$',
        },
        description: 'Array of trading pair symbols (e.g., ["THB_BTC", "THB_ETH"])',
        minItems: 1,
        maxItems: 50,
      },
      includeAnalysis: {
        type: 'boolean',
        description: 'Include comparative analysis of the symbols (default: false)',
        default: false,
      },
    },
    required: ['symbols'],
    additionalProperties: false,
  },
  handler: async (params: BatchTickerParams): Promise<MCPToolResponse<BatchTickerResult>> => {
    const startTime = Date.now();

    try {
      // Validate symbols
      if (!params.symbols || params.symbols.length === 0) {
        throw new MCPError('At least one symbol is required', 'INVALID_PARAMETER');
      }

      if (params.symbols.length > 50) {
        throw new MCPError('Maximum 50 symbols allowed per batch request', 'INVALID_PARAMETER');
      }

      for (const symbol of params.symbols) {
        if (!/^[A-Z]+_[A-Z]+$/.test(symbol)) {
          throw new MCPError(
            `Invalid symbol format: ${symbol}. Expected format: CRYPTO_FIAT (e.g., THB_BTC)`,
            'INVALID_PARAMETER',
          );
        }
      }

      const client = BitkubPublicClient.getInstance();

      // Get all tickers at once (more efficient than individual requests)
      const allTickers = await client.getTicker();

      const result: BatchTickerResult = {
        tickers: {},
      };

      const tickerData: Array<{
        symbol: string;
        price: number;
        change: number;
        volume: number;
      }> = [];

      // Process requested symbols
      for (const symbol of params.symbols) {
        const ticker = allTickers[symbol];

        if (!ticker) {
          // Skip missing symbols with a warning in the response
          continue;
        }

        const price = Number.parseFloat(ticker.last);
        const change = Number.parseFloat(ticker.percentChange || '0');
        const volume = Number.parseFloat(ticker.baseVolume || '0');
        const bid = Number.parseFloat(ticker.highestBid || '0');
        const ask = Number.parseFloat(ticker.lowestAsk || '0');
        const spread = ask - bid;
        const spreadPercent = bid > 0 ? (spread / bid) * 100 : 0;

        result.tickers[symbol] = {
          symbol,
          price,
          change: Math.round(change * 100) / 100,
          volume: Math.round(volume * 100) / 100,
          bid,
          ask,
          spread: Math.round(spread * 100) / 100,
          spreadPercent: Math.round(spreadPercent * 10000) / 10000, // 4 decimal places
        };

        tickerData.push({ symbol, price, change, volume });
      }

      // Add analysis if requested
      if (params.includeAnalysis && tickerData.length > 0) {
        const sortedByChange = [...tickerData].sort((a, b) => b.change - a.change);
        const sortedByVolume = [...tickerData].sort((a, b) => b.volume - a.volume);
        const avgChange = tickerData.reduce((sum, t) => sum + t.change, 0) / tickerData.length;

        result.analysis = {
          bestPerformer: sortedByChange[0]?.symbol || 'N/A',
          worstPerformer: sortedByChange[sortedByChange.length - 1]?.symbol || 'N/A',
          highestVolume: sortedByVolume[0]?.symbol || 'N/A',
          avgChange: Math.round(avgChange * 100) / 100,
          totalSymbols: tickerData.length,
        };
      }

      return createSuccessResponse(result, startTime);
    } catch (error) {
      if (error instanceof MCPError) {
        return createErrorResponse(error);
      }

      return createErrorResponse(
        new MCPError('Failed to fetch batch ticker data', 'BATCH_TICKER_ERROR', error),
      );
    }
  },
};
