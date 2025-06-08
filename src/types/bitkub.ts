// Bitkub API Response Types

export interface TickerData {
  id: number;
  last: string;
  lowestAsk: string;
  highestBid: string;
  percentChange: string;
  baseVolume: string;
  quoteVolume: string;
  isFrozen: string;
  high24hr: string;
  low24hr: string;
  change: string;
  prevClose: string;
  prevOpen: string;
}

export interface TickerResponse {
  [symbol: string]: TickerData;
}

export interface OrderBookEntry {
  price: number;
  volume: number;
  total: number;
}

export interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface TradeData {
  timestamp: number;
  rate: string;
  amount: string;
  side: 'buy' | 'sell';
}

export interface TradesResponse {
  [symbol: string]: TradeData[];
}

export interface SymbolData {
  id: number;
  symbol: string;
  info: string;
}

export interface SymbolsResponse {
  result: SymbolData[];
}

export interface ServerTimeResponse {
  timestamp: number;
}

// Tool Schema Types
export interface TickerParams {
  symbol?: string;
}

export interface OrderBookParams {
  symbol: string;
  limit?: number;
}

export interface TradesParams {
  symbol: string;
  limit?: number;
}

// Configuration Types
export interface BitkubClientConfig {
  baseURL?: string;
  timeout?: number;
  rateLimitPerMinute?: number;
  cacheTTLSeconds?: number;
}
