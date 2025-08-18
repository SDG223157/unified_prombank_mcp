# 🏠 Prompt House Premium - Cursor MCP Setup Guide

## 📋 Quick Setup (Copy & Paste)

### Step 1: Install MCP Server
Run this command in your terminal:

```bash
# Method 1: One-line install script (recommended)
curl -fsSL https://raw.githubusercontent.com/SDG223157/unified_prombank_mcp/main/install-mcp.sh | bash

# Method 2: Manual installation
git clone https://github.com/SDG223157/unified_prombank_mcp.git
cd unified_prombank_mcp/mcp-server
npm install
npm run build
sudo npm install -g .
```

### Step 2: Get Your API Token
1. Visit: **https://prombank.app/tokens**
2. Sign in with Google
3. Click **"Create New Token"**
4. Copy the generated token

### Step 3: Configure Cursor
Add this configuration to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "prompt-house-premium": {
      "command": "prompt-house-premium-mcp",
      "env": {
        "PROMPTHOUSE_API_URL": "https://prombank.app",
        "PROMPTHOUSE_ACCESS_TOKEN": "YOUR_API_TOKEN_HERE"
      }
    }
  }
}
```

**🔑 Important:** Replace `YOUR_API_TOKEN_HERE` with your actual API token from Step 2!

### Step 4: Restart Cursor
Restart Cursor to load the MCP server.

---

## 🎯 Available Commands

Once configured, you can use these commands in Cursor:

- **"Get all prompts"** - Browse available prompts
- **"Create a prompt for [topic]"** - Create new prompts  
- **"Get prompt [prompt-name]"** - View specific prompt
- **"Update prompt [id] to add tag [tag]"** - Modify prompts
- **"Import prompts from JSON"** - Bulk import (coming soon)

---

## 🔧 Configuration Locations

### macOS
- **Via UI**: Cursor Settings → Extensions → MCP Servers
- **File**: `~/.cursor/mcp_servers.json`

### Windows  
- **Via UI**: Cursor Settings → Extensions → MCP Servers
- **File**: `%APPDATA%\Cursor\User\mcp_servers.json`

### Linux
- **Via UI**: Cursor Settings → Extensions → MCP Servers  
- **File**: `~/.config/Cursor/User/mcp_servers.json`

---

## ❓ Troubleshooting

### "Command not found: prompt-house-premium-mcp"
```bash
# Reinstall globally
npm install -g git+https://github.com/SDG223157/unified_prombank_mcp.git#main:mcp-server

# Check installation
which prompt-house-premium-mcp
```

### "API token required" error
1. Double-check your API token is correct
2. Ensure no extra spaces in the token
3. Try creating a new token

### "Failed to connect" error
1. Check internet connection
2. Verify https://prombank.app is accessible
3. Check firewall settings

---

## 🆘 Support

- **Website**: https://prombank.app
- **Issues**: GitHub Issues
- **Documentation**: Available on website

---

**Happy prompting! 🚀**
