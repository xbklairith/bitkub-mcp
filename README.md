# 🚀 Bitkub MCP Server

**Get live cryptocurrency data from Bitkub exchange directly in Claude - zero setup required!**

A Model Context Protocol (MCP) server that provides access to Bitkub cryptocurrency exchange public market data. No API keys needed, just real-time crypto data in your AI conversations.

## 🎯 MCP Setup

** npx (Recommended)**

```json
{
  "mcpServers": {
    "bitkub": {
      "command": "npx",
      "args": ["bitkub-mcp-server@latest"]
    }
  }
}
```


> Paste config → Restart Claude → Ask: "What's the Bitcoin price?" → Done! 🎉

## 🛠️ Available Tools

| Tool                        | Description                                      |
| --------------------------- | ------------------------------------------------ |
| 📊 `bitkub_ticker`          | Current prices for any trading pair              |
| 📋 `bitkub_market_symbols`  | All 149+ available trading pairs                 |
| 🪙 `bitkub_coins`           | Cryptocurrency info with deposit/withdraw status |
| 📈 `bitkub_orderbook`       | Buy/sell order book depth                        |
| 💱 `bitkub_trades`          | Recent trade history                             |
| 🕐 `bitkub_servertime`      | Server timestamp                                 |
| ⚡ `bitkub_batch_ticker`    | Multiple symbols with analysis                   |
| 📏 `bitkub_spread_analysis` | Bid-ask spread analysis                          |
| 📤 `bitkub_export`          | Export data (CSV, JSON, table)                   |

## 💬 Example Questions for Claude

**Basic Queries:**

- "What's the current Bitcoin price on Bitkub?"
- "Show me all available trading pairs"
- "Which coins can I deposit or withdraw?"
- "Get the order book for Ethereum"

**Market Analysis:**

- "Which cryptocurrencies have the highest volume?"
- "Show me the bid-ask spreads for major coins"
- "Which trading pairs have the tightest spreads?"

**Advanced Analytics:**

- "Compare BTC, ETH, and ADA performance"
- "Export the top 10 cryptocurrencies to a table"
- "Show me low-volume trading pairs"

## ✨ Features

- ✅ **No API Keys** - Uses public Bitkub endpoints
- ✅ **Real-time Data** - Live market prices and updates
- ✅ **Smart Caching** - Efficient with built-in rate limiting
- ✅ **Rich Analysis** - Advanced market analytics
- ✅ **Multiple Formats** - CSV, JSON, table exports
- ✅ **Zero Setup** - Works instantly with npx

## 🔧 For Developers

### Quick Development Setup

```bash
git clone https://github.com/xbklairith/bitkub-mcp.git
cd bitkub-mcp
npm install && npm run build
npm run setup:claude  # Auto-configure Claude
```

### Development Commands

```bash
npm run dev          # Development mode
npm test            # Run tests
npm run lint        # Lint and format
npm run typecheck   # Type checking
```

### Direct API Usage

```bash
# List tools
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js

# Get BTC price
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "bitkub_ticker", "arguments": {"symbol": "THB_BTC"}}}' | node dist/index.js
```

### Project Structure

```
src/
├── index.ts              # MCP server entry point
├── bitkub/client.ts      # Bitkub API client
├── tools/market/         # Market data tools
├── utils/                # Cache & rate limiting
└── types/                # TypeScript definitions
```

## 📊 Examples

Run these after building:

```bash
node examples/basic-usage.js      # Core functionality demo
node examples/market-monitor.js   # Real-time BTC monitoring
node examples/advanced-analysis.js # Market analysis demo
```

## 🛠️ Tech Stack

- **TypeScript** with strict mode
- **MCP SDK** for protocol compliance
- **Axios** for HTTP with smart caching
- **Token bucket** rate limiting
- **Biome** for linting/formatting
- **Vitest** for testing (18 tests, full coverage)

## ⚠️ Important Disclaimer

**🚨 THIS IS NOT AN OFFICIAL BITKUB PRODUCT 🚨**

This is an **unofficial, community-built tool** that uses Bitkub's public API endpoints. It is **NOT affiliated with, endorsed by, or supported by Bitkub** in any way.

**⚠️ IMPORTANT WARNINGS:**

- **Do Your Own Research (DYOR)** - Never make trading decisions based solely on this data
- **Not Financial Advice** - This tool provides market data only, not investment recommendations
- **Use at Your Own Risk** - The creators are not responsible for any trading losses
- **Verify All Data** - Always cross-check with official Bitkub sources before trading
- **API Limitations** - This tool may break if Bitkub changes their public API

**✅ Official Bitkub Resources:**

- Website: [bitkub.com](https://www.bitkub.com)
- Official API: [github.com/bitkub/bitkub-official-api-docs](https://github.com/bitkub/bitkub-official-api-docs)
- Support: [support.bitkub.com](https://support.bitkub.com)

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Run `npm test && npm run lint`
4. Submit pull request

---

**Ready to explore crypto data with Claude!** 🚀

Need help? Open an issue on GitHub.
