#!/usr/bin/env node

// Advanced market analysis example
// Demonstrates the new analytical tools

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const serverPath = resolve(process.cwd(), 'dist/index.js');

function sendMCPRequest(request) {
  return new Promise((resolve, reject) => {
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    server.stdout.on('data', (data) => {
      output += data.toString();
    });

    server.on('close', (code) => {
      if (code === 0) {
        try {
          const response = JSON.parse(output.trim());
          resolve(response);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${output}`));
        }
      } else {
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    server.stdin.write(JSON.stringify(request));
    server.stdin.end();
  });
}

async function runAdvancedAnalysis() {
  console.log('📊 Bitkub Advanced Market Analysis\n');

  try {
    // 1. Batch Ticker Analysis
    console.log('⚡ Batch Ticker Analysis (Major Pairs)...');
    const batchResponse = await sendMCPRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'bitkub_batch_ticker',
        arguments: {
          symbols: ['THB_BTC', 'THB_ETH', 'THB_USDT', 'THB_ADA', 'THB_DOT'],
          includeAnalysis: true,
        },
      },
    });

    const batchData = JSON.parse(batchResponse.result.content[0].text);
    if (batchData.success) {
      const { tickers, analysis } = batchData.data;

      console.log('Major Cryptocurrency Pairs:');
      for (const [symbol, data] of Object.entries(tickers)) {
        const spreadStr = data.spreadPercent ? ` (Spread: ${data.spreadPercent}%)` : '';
        console.log(
          `  ${symbol}: ${data.price} THB (${data.change > 0 ? '+' : ''}${data.change}%)${spreadStr}`,
        );
      }

      if (analysis) {
        console.log(
          `\n📊 Analysis: Best: ${analysis.bestPerformer}, Worst: ${analysis.worstPerformer}`,
        );
        console.log(`🎯 Average Change: ${analysis.avgChange}%`);
      }
    }
    console.log();

    // 2. Spread Analysis
    console.log('📏 Spread Analysis (Top 10 by liquidity)...');
    const spreadResponse = await sendMCPRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'bitkub_spread_analysis',
        arguments: {
          sortBy: 'volume',
          limit: 10,
          minVolume: 1,
        },
      },
    });

    const spreadData = JSON.parse(spreadResponse.result.content[0].text);
    if (spreadData.success) {
      const { spreads, summary } = spreadData.data;

      console.log(`📊 Summary: Avg Spread: ${summary.avgSpreadPercent}%`);
      console.log(`🎯 Tightest: ${summary.tightestSpread}, Widest: ${summary.widestSpread}`);

      console.log('\nTop 10 by Volume:');
      spreads.forEach((spread, i) => {
        const liquidityIcon =
          spread.liquidity === 'high' ? '🟢' : spread.liquidity === 'medium' ? '🟡' : '🔴';
        console.log(
          `  ${i + 1}. ${spread.symbol}: ${spread.spreadPercent}% spread, ${spread.volume24h} vol ${liquidityIcon}`,
        );
      });
    }
    console.log();

    // 3. Export Data
    console.log('📤 Exporting Top 5 Cryptocurrencies...');
    const exportResponse = await sendMCPRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'bitkub_export',
        arguments: {
          symbols: ['THB_BTC', 'THB_ETH', 'THB_ADA', 'THB_DOT', 'THB_USDT'],
          format: 'table',
          includeSpread: true,
          includeVolume: true,
        },
      },
    });

    const exportData = JSON.parse(exportResponse.result.content[0].text);
    if (exportData.success) {
      console.log('Exported Data:');
      console.log(exportData.data.data);
      console.log(
        `\n📊 Exported ${exportData.data.symbolCount} symbols at ${exportData.data.timestamp}`,
      );
    }

    console.log('\n✅ Advanced analysis completed successfully!');
    console.log('\n💡 Try different parameters:');
    console.log('   - Change analysis limit or sort criteria');
    console.log('   - Filter by minimum volume');
    console.log('   - Export in CSV or JSON format');
    console.log('   - Analyze specific symbol groups');
  } catch (error) {
    console.error('❌ Error running advanced analysis:', error.message);
    process.exit(1);
  }
}

runAdvancedAnalysis();
