#!/usr/bin/env node

// Market monitoring example
// Continuously monitors BTC/THB price and shows alerts

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

async function getBTCPrice() {
  try {
    const response = await sendMCPRequest({
      jsonrpc: '2.0',
      id: Math.random(),
      method: 'tools/call',
      params: {
        name: 'bitkub_ticker',
        arguments: { symbol: 'THB_BTC' },
      },
    });

    const data = JSON.parse(response.result.content[0].text);
    if (data.success) {
      return {
        price: Number.parseFloat(data.data.THB_BTC.last),
        change: Number.parseFloat(data.data.THB_BTC.percentChange),
        volume: Number.parseFloat(data.data.THB_BTC.baseVolume),
        cached: data.metadata.cached,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching price:', error.message);
    return null;
  }
}

function formatPrice(price) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
  }).format(price);
}

function getChangeIcon(change) {
  if (change > 0) return '📈';
  if (change < 0) return '📉';
  return '➡️';
}

async function monitorMarket() {
  console.log('🔍 Starting BTC/THB Market Monitor');
  console.log('Press Ctrl+C to stop\n');

  let previousPrice = null;
  const alertThreshold = 1; // Alert if price changes by 1% or more

  setInterval(async () => {
    const btcData = await getBTCPrice();

    if (!btcData) {
      console.log('❌ Failed to fetch price data');
      return;
    }

    const timestamp = new Date().toLocaleTimeString('th-TH');
    const cacheStatus = btcData.cached ? '🔄' : '🆕';

    console.log(
      `${timestamp} ${cacheStatus} BTC/THB: ${formatPrice(btcData.price)} ${getChangeIcon(btcData.change)} ${btcData.change.toFixed(2)}%`,
    );

    // Price change alert
    if (
      previousPrice &&
      (Math.abs(btcData.price - previousPrice) / previousPrice) * 100 >= alertThreshold
    ) {
      const changePercent = (((btcData.price - previousPrice) / previousPrice) * 100).toFixed(2);
      console.log(`🚨 PRICE ALERT: ${changePercent}% change from last check!`);
    }

    // Volume alert (low volume warning)
    if (btcData.volume < 10) {
      console.log(`⚠️  LOW VOLUME: Only ${btcData.volume.toFixed(2)} BTC traded in 24h`);
    }

    // Significant change alert
    if (Math.abs(btcData.change) >= 5) {
      console.log(
        `🔥 SIGNIFICANT MOVE: ${btcData.change > 0 ? 'UP' : 'DOWN'} ${Math.abs(btcData.change).toFixed(2)}% in 24h!`,
      );
    }

    previousPrice = btcData.price;
  }, 15000); // Check every 15 seconds
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Stopping market monitor...');
  process.exit(0);
});

monitorMarket();
