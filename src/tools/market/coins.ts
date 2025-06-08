// Bitkub Coins Tool - V4 API

import { BitkubPublicClient } from '../../bitkub/client.js';
import { MCPError, type MCPTool, type MCPToolResponse } from '../../types/mcp.js';

interface CoinsParams {
  symbols?: string[];
}

interface CoinInfo {
  id: number;
  symbol: string;
  name: string;
  priority: number;
  status: string;
  can_deposit: boolean;
  can_withdraw: boolean;
}

interface CoinsResponse {
  data: CoinInfo[];
}

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

export const coinsTool: MCPTool = {
  name: 'bitkub_coins',
  description: 'Get cryptocurrency information including deposit/withdraw status',
  inputSchema: {
    type: 'object',
    properties: {
      symbols: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Filter specific coin symbols (e.g., ["BTC", "ETH"]). If not provided, returns all coins.',
      },
    },
    additionalProperties: false,
  },
  handler: async (params: CoinsParams): Promise<MCPToolResponse<CoinsResponse>> => {
    const startTime = Date.now();

    try {
      const client = BitkubPublicClient.getInstance();
      const data = await client.getCoins(params.symbols);

      return createSuccessResponse(data, startTime);
    } catch (error) {
      if (error instanceof MCPError) {
        return createErrorResponse(error);
      }

      return createErrorResponse(
        new MCPError('Failed to fetch coins data', 'COINS_ERROR', error),
      );
    }
  },
};