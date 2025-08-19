# 🏠 Prompt House Premium MCP Server - Installation Guide

This guide helps you install and configure the Prompt House Premium MCP server for use with Cursor and other MCP-compatible tools.

## 🚀 Quick Installation

### Option 1: One-Command Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/SDG223157/unified_prombank_mcp/main/install-mcp.sh | bash
```

### Option 2: Manual Installation

```bash
npm install -g git+https://github.com/SDG223157/unified_prombank_mcp.git#main:mcp-server
```

### Option 3: Clone and Build

```bash
git clone https://github.com/SDG223157/unified_prombank_mcp.git
cd unified_prombank_mcp/mcp-server
npm install
npm run build
npm install -g .
```

## 🔑 Get Your API Token

1. **Visit**: [https://prombank.app/tokens](https://prombank.app/tokens)
2. **Sign In**: Use Google authentication
3. **Create Token**: Click "Create New Token"
4. **Copy Token**: Save the generated token securely

## ⚙️ Configure Cursor

### Method 1: Via Cursor Settings UI

1. Open **Cursor Settings** (Cmd/Ctrl + ,)
2. Go to **Extensions** → **MCP Servers**
3. Add new server with these settings:
   - **Name**: `prompt-house-premium`
   - **Command**: `prompt-house-premium-mcp`
   - **Environment Variables**:
     - `PROMPTHOUSE_API_URL`: `https://prombank.app`
     - `PROMPTHOUSE_ACCESS_TOKEN`: `your_api_token_here`

### Method 2: Direct Configuration File

Add to your `~/.cursor/mcp_servers.json`:

```json
{
  "mcpServers": {
    "prompt-house-premium": {
      "command": "prompt-house-premium-mcp",
      "env": {
        "PROMPTHOUSE_API_URL": "https://prombank.app",
        "PROMPTHOUSE_ACCESS_TOKEN": "your_api_token_here"
      }
    }
  }
}
```

**Important**: Replace `your_api_token_here` with your actual API token!

## 🔧 For Online Users

The updated configuration works for **any user** who installs the MCP server globally:

### ✅ NEW (Works for Everyone)
```json
{
  "mcpServers": {
    "prompt-house-premium": {
      "command": "prompt-house-premium-mcp",
      "env": {
        "PROMPTHOUSE_API_URL": "https://prombank.app",
        "PROMPTHOUSE_ACCESS_TOKEN": "user_gets_their_own_token"
      }
    }
  }
}
```

### ❌ OLD (Local Path Only)
```json
{
  "mcpServers": {
    "prompt-house-premium": {
      "command": "node",
      "args": ["/Users/sdg223157/Unified_prombank/unified_prombank_mcp/mcp-server/dist/index.js"],
      "env": { ... }
    }
  }
}
```

## 🎯 Available Tools

Once configured, you'll have access to these MCP tools in Cursor:

### 📝 Prompt Management
- **`get_prompt_list`** - Browse available prompts
- **`get_prompt`** - Get specific prompt details  
- **`create_prompt`** - Create new prompts
- **`update_prompt`** - Modify existing prompts
- **`delete_prompt`** - Remove prompts
- **`get_user_prompts`** - List your personal prompts

### 👤 User Information
- **`user_info`** - Get current user profile and statistics
  - View profile details (name, email, subscription)
  - See prompt statistics (total, public, private counts)
  - Optional parameter to include/exclude statistics

### 📥 Import Tools
- **`import_prompts`** - Import from JSON data or URLs
  - Support for JSON and CSV formats
  - URL-based imports with auto-detection
  - Bulk import capabilities

## 💡 Usage Examples

### Create a New Prompt
```
Create a prompt for "API Documentation Generator" that helps write comprehensive API docs
```

### Import Multiple Prompts
```
Import prompts from JSON data with 5 coding interview questions
```

### Search Prompts
```
Get all public prompts in the "Development" category with tag "python"
```

### Update Existing Prompt
```
Update prompt ID "abc123" to make it public and add the tag "featured"
```

### Get User Information
```
Get my user info and statistics
```

### Get User Profile Only
```
Get my user profile without statistics
```

## 🔍 Troubleshooting

### Installation Issues

**Problem**: `command not found: prompt-house-premium-mcp`
**Solution**: 
```bash
# Reinstall globally
npm install -g git+https://github.com/SDG223157/unified_prombank_mcp.git#main:mcp-server

# Or check global bin path
npm config get prefix
```

**Problem**: Permission denied during installation
**Solution**:
```bash
# macOS/Linux
sudo npm install -g git+https://github.com/SDG223157/unified_prombank_mcp.git#main:mcp-server

# Or configure npm to use a different directory
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### Authentication Issues

**Problem**: `401 Unauthorized` errors
**Solution**:
1. Verify your API token is correct
2. Check token hasn't expired
3. Ensure token has proper permissions
4. Try creating a new token

**Problem**: `API token required` message
**Solution**:
1. Double-check the `PROMPTHOUSE_ACCESS_TOKEN` environment variable
2. Restart Cursor after configuration changes
3. Verify the token format (should be a long string)

### Connection Issues

**Problem**: `Failed to connect to API`
**Solution**:
1. Check internet connectivity
2. Verify `https://prombank.app` is accessible
3. Check firewall/proxy settings
4. Try with a different network

## 📚 Advanced Usage

### Custom API Endpoint
If you're running a self-hosted instance:

```json
{
  "mcpServers": {
    "prompt-house-premium": {
      "command": "prompt-house-premium-mcp",
      "env": {
        "PROMPTHOUSE_API_URL": "https://your-domain.com",
        "PROMPTHOUSE_ACCESS_TOKEN": "your_token"
      }
    }
  }
}
```

### Multiple Configurations
You can set up multiple MCP servers for different environments:

```json
{
  "mcpServers": {
    "prombank-prod": {
      "command": "prompt-house-premium-mcp",
      "env": {
        "PROMPTHOUSE_API_URL": "https://prombank.app",
        "PROMPTHOUSE_ACCESS_TOKEN": "prod_token"
      }
    },
    "prombank-staging": {
      "command": "prompt-house-premium-mcp",
      "env": {
        "PROMPTHOUSE_API_URL": "https://staging.prombank.app",
        "PROMPTHOUSE_ACCESS_TOKEN": "staging_token"
      }
    }
  }
}
```

## 🆘 Support

- **🌐 Website**: [https://prombank.app](https://prombank.app)
- **📧 Issues**: [GitHub Issues](https://github.com/SDG223157/unified_prombank_mcp/issues)
- **💬 Community**: Join our community for help and discussions

## 🔄 Updates

To update to the latest version:

```bash
npm install -g git+https://github.com/SDG223157/unified_prombank_mcp.git#main:mcp-server
```

## 📋 System Requirements

- **Node.js**: Version 18 or higher
- **npm**: Comes with Node.js
- **Internet**: Required for API communication
- **Cursor**: Latest version recommended

---

**Happy prompting!** 🚀
