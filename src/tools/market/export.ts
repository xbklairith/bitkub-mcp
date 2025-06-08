// Bitkub Data Export Tool

import { BitkubPublicClient } from '../../bitkub/client.js';
import { MCPError, type MCPTool, type MCPToolResponse } from '../../types/mcp.js';

interface ExportParams {
  symbols: string[];
  format: 'csv' | 'json' | 'table';
  includeSpread?: boolean;
  includeVolume?: boolean;
}

interface ExportResult {
  format: string;
  data: string;
  symbolCount: number;
  timestamp: string;
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

function formatAsCSV(data: any[], includeSpread: boolean, includeVolume: boolean): string {
  if (data.length === 0) return '';

  const headers = ['Symbol', 'Price', 'Change%'];
  if (includeVolume) headers.push('Volume24h');
  if (includeSpread) headers.push('Bid', 'Ask', 'Spread%');

  const csvRows = [headers.join(',')];

  for (const item of data) {
    const row = [item.symbol, item.price, item.change];
    if (includeVolume) row.push(item.volume);
    if (includeSpread) row.push(item.bid, item.ask, item.spreadPercent);
    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}

function formatAsTable(data: any[], includeSpread: boolean, includeVolume: boolean): string {
  if (data.length === 0) return 'No data available';

  const headers = ['Symbol', 'Price', 'Change%'];
  if (includeVolume) headers.push('Volume24h');
  if (includeSpread) headers.push('Bid', 'Ask', 'Spread%');

  // Calculate column widths
  const colWidths = headers.map((h) => h.length);
  for (const item of data) {
    colWidths[0] = Math.max(colWidths[0] || 0, item.symbol.length);
    colWidths[1] = Math.max(colWidths[1] || 0, item.price.toString().length);
    colWidths[2] = Math.max(colWidths[2] || 0, item.change.toString().length);
    if (includeVolume && colWidths[3] !== undefined) {
      colWidths[3] = Math.max(colWidths[3], item.volume.toString().length);
    }
    if (includeSpread) {
      const spreadIndex = includeVolume ? 4 : 3;
      if (colWidths[spreadIndex] !== undefined) {
        colWidths[spreadIndex] = Math.max(colWidths[spreadIndex] || 0, item.bid.toString().length);
      }
      if (colWidths[spreadIndex + 1] !== undefined) {
        colWidths[spreadIndex + 1] = Math.max(
          colWidths[spreadIndex + 1] || 0,
          item.ask.toString().length,
        );
      }
      if (colWidths[spreadIndex + 2] !== undefined) {
        colWidths[spreadIndex + 2] = Math.max(
          colWidths[spreadIndex + 2] || 0,
          item.spreadPercent.toString().length,
        );
      }
    }
  }

  // Create table
  const separator = colWidths.map((w) => '-'.repeat((w || 0) + 2)).join('+');
  const headerRow = headers.map((h, i) => h.padEnd(colWidths[i] || 0)).join(' | ');

  let table = `+${separator}+\n| ${headerRow} |\n+${separator}+\n`;

  for (const item of data) {
    const row = [
      item.symbol.padEnd(colWidths[0] || 0),
      item.price.toString().padEnd(colWidths[1] || 0),
      item.change.toString().padEnd(colWidths[2] || 0),
    ];

    if (includeVolume) {
      row.push(item.volume.toString().padEnd(colWidths[3] || 0));
    }

    if (includeSpread) {
      const spreadIndex = includeVolume ? 4 : 3;
      row.push(item.bid.toString().padEnd(colWidths[spreadIndex] || 0));
      row.push(item.ask.toString().padEnd(colWidths[spreadIndex + 1] || 0));
      row.push(item.spreadPercent.toString().padEnd(colWidths[spreadIndex + 2] || 0));
    }

    table += `| ${row.join(' | ')} |\n`;
  }

  table += `+${separator}+`;
  return table;
}

export const exportTool: MCPTool = {
  name: 'bitkub_export',
  description: 'Export market data in various formats (CSV, JSON, table)',
  inputSchema: {
    type: 'object',
    properties: {
      symbols: {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^[A-Z]+_[A-Z]+$',
        },
        description: 'Trading pairs to export',
        minItems: 1,
        maxItems: 100,
      },
      format: {
        type: 'string',
        enum: ['csv', 'json', 'table'],
        description: 'Export format',
        default: 'table',
      },
      includeSpread: {
        type: 'boolean',
        description: 'Include bid/ask spread data (default: false)',
        default: false,
      },
      includeVolume: {
        type: 'boolean',
        description: 'Include 24h volume data (default: true)',
        default: true,
      },
    },
    required: ['symbols'],
    additionalProperties: false,
  },
  handler: async (params: ExportParams): Promise<MCPToolResponse<ExportResult>> => {
    const startTime = Date.now();

    try {
      // Validate parameters
      if (!params.symbols || params.symbols.length === 0) {
        throw new MCPError('At least one symbol is required', 'INVALID_PARAMETER');
      }

      if (params.symbols.length > 100) {
        throw new MCPError('Maximum 100 symbols allowed per export', 'INVALID_PARAMETER');
      }

      const client = BitkubPublicClient.getInstance();
      const allTickers = await client.getTicker();

      const exportData = [];

      for (const symbol of params.symbols) {
        const ticker = allTickers[symbol];
        if (!ticker) continue;

        const price = Number.parseFloat(ticker.last);
        const change = Number.parseFloat(ticker.percentChange || '0');
        const volume = Number.parseFloat(ticker.baseVolume || '0');
        const bid = Number.parseFloat(ticker.highestBid || '0');
        const ask = Number.parseFloat(ticker.lowestAsk || '0');
        const spreadPercent = bid > 0 ? ((ask - bid) / bid) * 100 : 0;

        const item: any = {
          symbol,
          price: Math.round(price * 100) / 100,
          change: Math.round(change * 100) / 100,
        };

        if (params.includeVolume !== false) {
          item.volume = Math.round(volume * 100) / 100;
        }

        if (params.includeSpread) {
          item.bid = bid;
          item.ask = ask;
          item.spreadPercent = Math.round(spreadPercent * 10000) / 10000;
        }

        exportData.push(item);
      }

      let formattedData: string;
      const format = params.format || 'table';

      switch (format) {
        case 'csv':
          formattedData = formatAsCSV(
            exportData,
            params.includeSpread || false,
            params.includeVolume !== false,
          );
          break;
        case 'json':
          formattedData = JSON.stringify(exportData, null, 2);
          break;
        default:
          formattedData = formatAsTable(
            exportData,
            params.includeSpread || false,
            params.includeVolume !== false,
          );
          break;
      }

      const result: ExportResult = {
        format,
        data: formattedData,
        symbolCount: exportData.length,
        timestamp: new Date().toISOString(),
      };

      return createSuccessResponse(result, startTime);
    } catch (error) {
      if (error instanceof MCPError) {
        return createErrorResponse(error);
      }

      return createErrorResponse(
        new MCPError('Failed to export market data', 'EXPORT_ERROR', error),
      );
    }
  },
};
