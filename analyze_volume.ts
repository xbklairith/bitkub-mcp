#!/usr/bin/env tsx

// Script to analyze Bitkub trading volumes

import axios from 'axios';

interface TickerData {
  id: number;
  last: number;
  lowestAsk: number;
  highestBid: number;
  percentChange: number;
  baseVolume: number;
  quoteVolume: number;
  isFrozen: number;
  high24hr: number;
  low24hr: number;
  change: number;
  prevClose: number;
  prevOpen: number;
}

interface TickerResponse {
  [symbol: string]: TickerData;
}

async function fetchTickers(): Promise<TickerResponse> {
  try {
    const response = await axios.get('https://api.bitkub.com/api/market/ticker');
    return response.data;
  } catch (error) {
    console.error('Error fetching ticker data:', error);
    throw error;
  }
}

async function analyzeVolumes() {
  console.log('Fetching ticker data from Bitkub...\n');
  
  const tickers = await fetchTickers();
  
  // Convert to array and sort by quote volume (THB volume)
  const volumeData = Object.entries(tickers)
    .map(([symbol, data]) => ({
      symbol,
      baseVolume: data.baseVolume,
      quoteVolume: data.quoteVolume,
      last: data.last,
      percentChange: data.percentChange
    }))
    .sort((a, b) => b.quoteVolume - a.quoteVolume);
  
  console.log('Top 10 Tokens by 24h Trading Volume on Bitkub:\n');
  console.log('═'.repeat(100));
  console.log(`${'Rank'.padEnd(6)}${'Symbol'.padEnd(15)}${'Base Volume'.padStart(20)}${'Quote Volume (THB)'.padStart(25)}${'Last Price'.padStart(15)}${'24h Change'.padStart(12)}`);
  console.log('═'.repeat(100));
  
  volumeData.slice(0, 10).forEach((token, index) => {
    const rank = (index + 1).toString().padEnd(6);
    const symbol = token.symbol.padEnd(15);
    const baseVolume = token.baseVolume.toLocaleString('en-US', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 8 
    }).padStart(20);
    const quoteVolume = token.quoteVolume.toLocaleString('en-US', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).padStart(25);
    const lastPrice = token.last.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).padStart(15);
    const change = `${token.percentChange > 0 ? '+' : ''}${token.percentChange.toFixed(2)}%`.padStart(12);
    
    console.log(`${rank}${symbol}${baseVolume}${quoteVolume}${lastPrice}${change}`);
  });
  
  console.log('═'.repeat(100));
  
  // Calculate total volume
  const totalVolumeTHB = volumeData.reduce((sum, token) => sum + token.quoteVolume, 0);
  console.log(`\nTotal 24h Trading Volume: ${totalVolumeTHB.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB`);
  
  // Show additional statistics
  console.log('\nAdditional Statistics:');
  console.log(`- Total number of trading pairs: ${volumeData.length}`);
  console.log(`- Average volume per pair: ${(totalVolumeTHB / volumeData.length).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB`);
  
  // Top 10 contribution to total volume
  const top10Volume = volumeData.slice(0, 10).reduce((sum, token) => sum + token.quoteVolume, 0);
  const top10Percentage = (top10Volume / totalVolumeTHB * 100).toFixed(2);
  console.log(`- Top 10 tokens represent ${top10Percentage}% of total volume`);
}

// Run the analysis
analyzeVolumes().catch(console.error);