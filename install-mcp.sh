#!/bin/bash

# Prompt House Premium MCP Server Installation Script
# This script installs the MCP server globally for use with Cursor

set -e

echo "🏠 Prompt House Premium MCP Server Installation"
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first:"
    echo "   https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 18+ first:"
    echo "   https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Install the MCP server
echo "📦 Installing Prompt House Premium MCP Server..."

# Use clone and install method (more reliable than git subpath)
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo "📥 Cloning repository..."
if git clone https://github.com/SDG223157/unified_prombank_mcp.git; then
    cd unified_prombank_mcp/mcp-server
    
    echo "📦 Installing dependencies..."
    if npm install; then
        echo "🔨 Building..."
        if npm run build; then
            echo "🌐 Installing globally..."
            if npm install -g .; then
                echo "✅ Installation successful!"
            else
                echo "❌ Global installation failed. You may need to run with sudo:"
                echo "   sudo npm install -g ."
                exit 1
            fi
        else
            echo "❌ Build failed"
            exit 1
        fi
    else
        echo "❌ Dependency installation failed"
        exit 1
    fi
else
    echo "❌ Failed to clone repository"
    exit 1
fi

# Cleanup
cd /
rm -rf "$TEMP_DIR"

echo ""
echo "🎉 Installation Complete!"
echo ""
echo "Next Steps:"
echo "1. Get your API token from: https://prombank.app/tokens"
echo "2. Add this configuration to your Cursor MCP settings:"
echo ""
echo '   {'
echo '     "mcpServers": {'
echo '       "prompt-house-premium": {'
echo '         "command": "prompt-house-premium-mcp",'
echo '         "env": {'
echo '           "PROMPTHOUSE_API_URL": "https://prombank.app",'
echo '           "PROMPTHOUSE_ACCESS_TOKEN": "your_api_token_here"'
echo '         }'
echo '       }'
echo '     }'
echo '   }'
echo ""
echo "3. Replace 'your_api_token_here' with your actual API token"
echo "4. Restart Cursor to load the MCP server"
echo ""
echo "📚 For more help, visit: https://prombank.app"
