# 🌍 Global MCP Configuration Guide

This guide explains how the global MCP configuration system works when users create API tokens.

## 🔧 **How It Works**

When a user creates an API token, the system automatically generates:

1. **Complete MCP Configuration JSON** with their actual token
2. **Installation Command** for easy setup
3. **Step-by-step Instructions** for Cursor integration

## 📋 **API Response Structure**

### Token Creation Response (`POST /api/tokens`)

```json
{
  "id": "token-uuid",
  "name": "My MCP Token",
  "description": "Token for Cursor integration",
  "token": "BZDB7O9N4YY448TJ1t3VBdkS3iMuReYT2CguatVqbSE",
  "permissions": ["read", "write"],
  "created_at": "2025-08-18T09:00:00",
  "message": "Token created successfully. Save this token - it won't be shown again!",
  "mcp_config": {
    "mcpServers": {
      "prompt-house-premium": {
        "command": "prompt-house-premium-mcp",
        "env": {
          "PROMPTHOUSE_API_URL": "https://prombank.app",
          "PROMPTHOUSE_ACCESS_TOKEN": "BZDB7O9N4YY448TJ1t3VBdkS3iMuReYT2CguatVqbSE"
        }
      }
    }
  },
  "installation_command": "curl -fsSL https://raw.githubusercontent.com/SDG223157/unified_prombank_mcp/main/install-mcp.sh | bash"
}
```

### MCP Configuration Endpoint (`GET /api/tokens/{id}/mcp-config`)

```json
{
  "token_name": "My MCP Token",
  "token_id": "token-uuid",
  "mcp_config": {
    "mcpServers": {
      "prompt-house-premium": {
        "command": "prompt-house-premium-mcp",
        "env": {
          "PROMPTHOUSE_API_URL": "https://prombank.app",
          "PROMPTHOUSE_ACCESS_TOKEN": "YOUR_API_TOKEN_HERE"
        }
      }
    }
  },
  "installation_command": "curl -fsSL https://raw.githubusercontent.com/SDG223157/unified_prombank_mcp/main/install-mcp.sh | bash",
  "note": "Replace 'YOUR_API_TOKEN_HERE' with your actual API token"
}
```

## 🎨 **Frontend Integration**

### Token Creation Success Display

When a user creates a token, they see:

1. **✅ Success Message** with the generated token
2. **📦 Installation Command** with copy button
3. **⚙️ Complete MCP Configuration** with their token pre-filled
4. **📋 Step-by-step Instructions** for Cursor setup

### Existing Tokens - MCP Button

For existing tokens, users can click the **"MCP"** button to:

1. **View Installation Instructions**
2. **Get Configuration Template** (with placeholder)
3. **Copy Commands** for easy setup

## 📁 **Configuration Files Generated**

### 1. **Global Template** (`mcp-global-config.json`)
```json
{
  "mcpServers": {
    "prompt-house-premium": {
      "command": "prompt-house-premium-mcp",
      "env": {
        "PROMPTHOUSE_API_URL": "https://prombank.app",
        "PROMPTHOUSE_ACCESS_TOKEN": "{{USER_API_TOKEN}}"
      }
    }
  }
}
```

### 2. **User-Specific Configuration** (Generated at token creation)
```json
{
  "mcpServers": {
    "prompt-house-premium": {
      "command": "prompt-house-premium-mcp",
      "env": {
        "PROMPTHOUSE_API_URL": "https://prombank.app",
        "PROMPTHOUSE_ACCESS_TOKEN": "ACTUAL_USER_TOKEN_HERE"
      }
    }
  }
}
```

## 🚀 **Installation Methods**

### Method 1: One-Line Script (Recommended)
```bash
curl -fsSL https://raw.githubusercontent.com/SDG223157/unified_prombank_mcp/main/install-mcp.sh | bash
```

### Method 2: Manual Installation
```bash
git clone https://github.com/SDG223157/unified_prombank_mcp.git
cd unified_prombank_mcp/mcp-server
npm install
npm run build
sudo npm install -g .
```

## 💻 **User Experience Flow**

### Step 1: Create Token
1. User visits `/tokens` page
2. Clicks "Create New Token"
3. Fills in token details
4. Submits form

### Step 2: Get Configuration
1. ✅ **Success message** appears
2. 📋 **Complete setup instructions** displayed
3. 🔗 **Installation command** with copy button
4. ⚙️ **MCP configuration** with actual token
5. 📱 **Copy buttons** for easy setup

### Step 3: Setup Cursor
1. User copies installation command
2. Runs it in terminal
3. Copies MCP configuration
4. Adds to Cursor settings
5. Restarts Cursor

### Step 4: Use MCP Tools
1. User can now use MCP commands in Cursor
2. "Get all prompts", "Create prompt", etc.
3. Full integration with Prompt House Premium

## 🔧 **Configuration Locations**

### Cursor MCP Settings:

**macOS:**
- UI: Cursor Settings → Extensions → MCP Servers
- File: `~/.cursor/mcp_servers.json`

**Windows:**
- UI: Cursor Settings → Extensions → MCP Servers  
- File: `%APPDATA%\Cursor\User\mcp_servers.json`

**Linux:**
- UI: Cursor Settings → Extensions → MCP Servers
- File: `~/.config/Cursor/User\mcp_servers.json`

## ✨ **Key Benefits**

### ✅ **For Users:**
- **One-Click Setup**: Complete configuration generated automatically
- **Copy-Paste Ready**: No manual editing required
- **Visual Instructions**: Step-by-step guidance
- **Error Prevention**: Pre-filled with correct values

### ✅ **For Developers:**
- **Consistent Configuration**: Same format for all users
- **Easy Distribution**: Global package installation
- **Automatic Updates**: Users get latest version
- **Support Simplification**: Standard setup process

## 🔍 **Troubleshooting**

### Common Issues:

1. **"Command not found"**
   - Solution: Reinstall MCP server globally
   
2. **"API token required"**
   - Solution: Check token in configuration
   
3. **"Failed to connect"**
   - Solution: Verify internet connection and API URL

### Support Resources:
- **Website**: https://prombank.app
- **Documentation**: Available on tokens page
- **GitHub**: Repository with issues and discussions

---

**Ready for global deployment! 🌍**
