#!/usr/bin/env node

// Bitkub MCP Server Entry Point

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { ToolRegistry } from './server/registry.js';
import { batchTickerTool } from './tools/market/batch.js';
import { coinsTool } from './tools/market/coins.js';
import { exportTool } from './tools/market/export.js';
import { orderBookTool } from './tools/market/orderbook.js';
import { serverTimeTool } from './tools/market/servertime.js';
import { spreadAnalysisTool } from './tools/market/spread-analysis.js';
import { symbolsTool } from './tools/market/symbols.js';
import { tickerTool } from './tools/market/ticker.js';
import { tradesTool } from './tools/market/trades.js';

// Create tool registry and register tools
const registry = new ToolRegistry();
registry.register(tickerTool);
registry.register(symbolsTool);
registry.register(coinsTool);
registry.register(orderBookTool);
registry.register(tradesTool);
registry.register(serverTimeTool);
registry.register(batchTickerTool);
registry.register(spreadAnalysisTool);
registry.register(exportTool);

// Create MCP server
const server = new Server(
  {
    name: 'bitkub-mcp',
    version: '0.1.0',
    description: 'MCP server for Bitkub public market data (no authentication required)',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: registry.getToolDefinitions(),
  };
});

// Handle call tool request
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await registry.execute(name, args || {});

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: {
                code: 'EXECUTION_ERROR',
                message: errorMessage,
              },
              metadata: {
                timestamp: Date.now(),
                latency: 0,
              },
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with MCP communication
  console.error('🚨 WARNING: This is NOT an official Bitkub product! 🚨');
  console.error('⚠️  Unofficial community tool - Use at your own risk');
  console.error('⚠️  Always verify data with official Bitkub sources');
  console.error('⚠️  Not financial advice - Do your own research!');
  console.error('');
  console.error('Bitkub MCP Server (Public API) started');
  console.error(`Registered tools: ${registry.getToolNames().join(', ')}`);
}

// Handle process signals
process.on('SIGINT', async () => {
  console.error('Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Received SIGTERM, shutting down...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
