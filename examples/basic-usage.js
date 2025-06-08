#!/usr/bin/env node

// Basic usage examples for Bitkub MCP Server
// This script demonstrates how to interact with the MCP server

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const serverPath = resolve(process.cwd(), 'dist/index.js');

function sendMCPRequest(request) {
  return new Promise((resolve, reject) => {
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    let error = '';

    server.stdout.on('data', (data) => {
      output += data.toString();
    });

    server.stderr.on('data', (data) => {
      error += data.toString();
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
        reject(new Error(`Server exited with code ${code}: ${error}`));
      }
    });

    server.stdin.write(JSON.stringify(request));
    server.stdin.end();
  });
}

async function runExamples() {
  console.log('🚀 Bitkub MCP Server Examples\n');

  try {
    // 1. List available tools
    console.log('📋 Listing available tools...');
    const toolsResponse = await sendMCPRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    });

    console.log('Available tools:', toolsResponse.result.tools.map((t) => t.name).join(', '));
    console.log();

    // 2. Get all symbols
    console.log('💱 Getting trading symbols...');
    const symbolsResponse = await sendMCPRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'bitkub_symbols',
        arguments: {},
      },
    });

    const symbolsData = JSON.parse(symbolsResponse.result.content[0].text);
    console.log(`Found ${symbolsData.data.result.length} trading pairs`);
    console.log(
      'Sample symbols:',
      symbolsData.data.result
        .slice(0, 5)
        .map((s) => s.symbol)
        .join(', '),
    );
    console.log();

    // 3. Get BTC ticker
    console.log('₿ Getting BTC/THB ticker...');
    const tickerResponse = await sendMCPRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'bitkub_ticker',
        arguments: { symbol: 'THB_BTC' },
      },
    });

    const tickerData = JSON.parse(tickerResponse.result.content[0].text);
    if (tickerData.success) {
      const btcData = tickerData.data.THB_BTC;
      console.log(`BTC/THB Price: ${btcData.last} THB`);
      console.log(`24h Change: ${btcData.percentChange}%`);
      console.log(`24h Volume: ${btcData.baseVolume} BTC`);
    }
    console.log();

    // 4. Get order book
    console.log('📊 Getting BTC/THB order book (top 3)...');
    const orderbookResponse = await sendMCPRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'bitkub_orderbook',
        arguments: { symbol: 'THB_BTC', limit: 3 },
      },
    });

    const orderbookData = JSON.parse(orderbookResponse.result.content[0].text);
    if (orderbookData.success) {
      console.log('Top 3 Asks (Sell Orders):');
      orderbookData.data.asks.forEach((ask, i) => {
        console.log(`  ${i + 1}. Price: ${ask[0]} THB, Amount: ${ask[1]} BTC`);
      });
      console.log('Top 3 Bids (Buy Orders):');
      orderbookData.data.bids.forEach((bid, i) => {
        console.log(`  ${i + 1}. Price: ${bid[0]} THB, Amount: ${bid[1]} BTC`);
      });
    }
    console.log();

    // 5. Get server time
    console.log('🕐 Getting server time...');
    const timeResponse = await sendMCPRequest({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'bitkub_servertime',
        arguments: {},
      },
    });

    const timeData = JSON.parse(timeResponse.result.content[0].text);
    if (timeData.success) {
      console.log(`Server timestamp: ${timeData.data.timestamp}`);
      console.log(`Formatted time: ${timeData.data.formatted}`);
    }

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error.message);
    process.exit(1);
  }
}

runExamples();
