// Bitkub Ticker Tool

import { BitkubPublicClient } from '../../bitkub/client.js';
import type { TickerParams, TickerResponse } from '../../types/bitkub.js';
import { MCPError, type MCPTool, type MCPToolResponse } from '../../types/mcp.js';

function createSuccessResponse<T>(data: T, startTime: number, cached = false): MCPToolResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: Date.now(),
      latency: Date.now() - startTime,
      cached,
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

export const tickerTool: MCPTool = {
  name: 'bitkub_ticker',
  description: 'Get current ticker information for all symbols or a specific trading pair',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Trading pair symbol (e.g., BTC_THB). If not provided, returns all symbols',
        pattern: '^[A-Z]+_[A-Z]+$',
      },
    },
    additionalProperties: false,
  },
  handler: async (params: TickerParams): Promise<MCPToolResponse<TickerResponse>> => {
    const startTime = Date.now();

    try {
      const client = BitkubPublicClient.getInstance();
      const data = await client.getTicker(params.symbol);

      // Return the raw data from Bitkub API
      const transformedData = data;

      return createSuccessResponse(transformedData, startTime);
    } catch (error) {
      if (error instanceof MCPError) {
        return createErrorResponse(error);
      }

      return createErrorResponse(
        new MCPError('Failed to fetch ticker data', 'TICKER_ERROR', error),
      );
    }
  },
};
