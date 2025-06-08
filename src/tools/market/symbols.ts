// Bitkub Symbols Tool

import { BitkubPublicClient } from '../../bitkub/client.js';
import type { SymbolsResponse } from '../../types/bitkub.js';
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

export const symbolsTool: MCPTool = {
  name: 'bitkub_market_symbols',
  description: 'Get list of all available trading pairs on Bitkub exchange',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async (): Promise<MCPToolResponse<SymbolsResponse>> => {
    const startTime = Date.now();

    try {
      const client = BitkubPublicClient.getInstance();
      const data = await client.getSymbols();

      return createSuccessResponse(data, startTime);
    } catch (error) {
      if (error instanceof MCPError) {
        return createErrorResponse(error);
      }

      return createErrorResponse(
        new MCPError('Failed to fetch symbols data', 'SYMBOLS_ERROR', error),
      );
    }
  },
};
