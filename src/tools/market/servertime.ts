// Bitkub Server Time Tool

import { BitkubPublicClient } from '../../bitkub/client.js';
import type { ServerTimeResponse } from '../../types/bitkub.js';
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

export const serverTimeTool: MCPTool = {
  name: 'bitkub_servertime',
  description: 'Get Bitkub exchange server timestamp for synchronization',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async (): Promise<MCPToolResponse<ServerTimeResponse & { formatted: string }>> => {
    const startTime = Date.now();

    try {
      const client = BitkubPublicClient.getInstance();
      const data = await client.getServerTime();

      // Validate timestamp is a number
      if (typeof data.timestamp !== 'number') {
        throw new MCPError('Invalid timestamp format', 'INVALID_RESPONSE');
      }

      // Add formatted timestamp for readability
      const enhanced = {
        ...data,
        formatted: new Date(data.timestamp * 1000).toISOString(),
      };

      return createSuccessResponse(enhanced, startTime);
    } catch (error) {
      if (error instanceof MCPError) {
        return createErrorResponse(error);
      }

      return createErrorResponse(
        new MCPError('Failed to fetch server time', 'SERVERTIME_ERROR', error),
      );
    }
  },
};
