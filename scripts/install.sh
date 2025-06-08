#!/bin/bash

# One-line installer for Bitkub MCP Server
# Usage: curl -fsSL https://raw.githubusercontent.com/xbklairith/bitkub-mcp/main/scripts/install.sh | bash

set -e

echo "🚀 Installing Bitkub MCP Server for Claude..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo "Please install Node.js (version 18 or higher) from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo -e "${RED}❌ Node.js version $NODE_VERSION is too old!${NC}"
    echo "Please install Node.js version 18 or higher from: https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✅ Node.js version $NODE_VERSION detected${NC}"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed!${NC}"
    echo "npm should come with Node.js. Please reinstall Node.js from: https://nodejs.org/"
    exit 1
fi

# Create installation directory
INSTALL_DIR="$HOME/bitkub-mcp"
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}⚠️  Directory $INSTALL_DIR already exists${NC}"
    read -p "Do you want to remove it and reinstall? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$INSTALL_DIR"
        echo -e "${GREEN}🗑️  Removed existing installation${NC}"
    else
        echo "Installation cancelled"
        exit 1
    fi
fi

echo -e "${BLUE}📥 Cloning Bitkub MCP repository...${NC}"
git clone https://github.com/xbklairith/bitkub-mcp.git "$INSTALL_DIR"

echo -e "${BLUE}📁 Entering project directory...${NC}"
cd "$INSTALL_DIR"

echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

echo -e "${BLUE}🔨 Building project...${NC}"
npm run build

echo -e "${BLUE}🧪 Running tests...${NC}"
npm test

echo -e "${BLUE}⚙️  Configuring Claude Desktop...${NC}"
npm run setup:claude

echo ""
echo -e "${GREEN}🎉 Installation completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Close Claude Desktop completely"
echo "2. Reopen Claude Desktop"
echo "3. Try asking: 'What's the current Bitcoin price on Bitkub?'"
echo ""
echo -e "${BLUE}📍 Installation location:${NC} $INSTALL_DIR"
echo -e "${BLUE}📖 Documentation:${NC} $INSTALL_DIR/QUICK_START.md"
echo ""
echo -e "${GREEN}✨ You can now use Bitkub cryptocurrency data directly in Claude!${NC}"