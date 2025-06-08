// Bitkub Recent Trades Tool

import { BitkubPublicClient } from '../../bitkub/client.js';
import type { TradesParams, TradesResponse } from '../../types/bitkub.js';
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

export const tradesTool: MCPTool = {
  name: 'bitkub_trades',
  description: 'Get recent trades for a specific trading pair',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Trading pair symbol (e.g., THB_BTC)',
        pattern: '^[A-Z]+_[A-Z]+$',
      },
      limit: {
        type: 'number',
        description: 'Number of trades to return (1-1000, default: 100)',
        minimum: 1,
        maximum: 1000,
        default: 100,
      },
    },
    required: ['symbol'],
    additionalProperties: false,
  },
  handler: async (params: TradesParams): Promise<MCPToolResponse<TradesResponse>> => {
    const startTime = Date.now();

    try {
      // Validate symbol format
      if (!params.symbol || !/^[A-Z]+_[A-Z]+$/.test(params.symbol)) {
        throw new MCPError(
          'Invalid symbol format. Expected format: CRYPTO_FIAT (e.g., THB_BTC)',
          'INVALID_PARAMETER',
        );
      }

      // Validate limit
      const limit = params.limit ?? 100;
      if (limit < 1 || limit > 1000) {
        throw new MCPError('Limit must be between 1 and 1000', 'INVALID_PARAMETER');
      }

      const client = BitkubPublicClient.getInstance();
      const data = await client.getTrades(params.symbol, limit);

      return createSuccessResponse(data, startTime);
    } catch (error) {
      if (error instanceof MCPError) {
        return createErrorResponse(error);
      }

      return createErrorResponse(
        new MCPError('Failed to fetch trades data', 'TRADES_ERROR', error),
      );
    }
  },
};
