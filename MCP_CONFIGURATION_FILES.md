# 🏠 Prompt House Premium MCP Configuration Files

This document contains all the configuration files and templates for setting up the Prompt House Premium MCP server with Cursor.

## 📁 Generated Files

### 1. **mcp-server-config.json** - Basic Configuration
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

### 2. **cursor-mcp-config.json** - Cursor Specific
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

### 3. **mcp-config-template.json** - Template with Placeholder
```json
{
  "mcpServers": {
    "prompt-house-premium": {
      "command": "prompt-house-premium-mcp",
      "env": {
        "PROMPTHOUSE_API_URL": "https://prombank.app",
        "PROMPTHOUSE_ACCESS_TOKEN": "{{API_TOKEN}}"
      }
    }
  }
}
```

## 🚀 Installation Commands

### One-Line Install
```bash
npm install -g git+https://github.com/SDG223157/unified_prombank_mcp.git#main:mcp-server
```

### Alternative Install Script
```bash
curl -fsSL https://raw.githubusercontent.com/SDG223157/unified_prombank_mcp/main/install-mcp.sh | bash
```

## 📋 User Instructions

### For Token Page Display
When users create an API token, show them:

1. **Install Command:**
   ```bash
   npm install -g git+https://github.com/SDG223157/unified_prombank_mcp.git#main:mcp-server
   ```

2. **Configuration (with their actual token):**
   ```json
   {
     "mcpServers": {
       "prompt-house-premium": {
         "command": "prompt-house-premium-mcp",
         "env": {
           "PROMPTHOUSE_API_URL": "https://prombank.app",
           "PROMPTHOUSE_ACCESS_TOKEN": "THEIR_ACTUAL_TOKEN"
         }
       }
     }
   }
   ```

3. **Setup Steps:**
   - Install the MCP server globally
   - Add configuration to Cursor MCP settings
   - Restart Cursor
   - Try commands like "Get all prompts"

## 🔧 Configuration Locations

### Cursor MCP Settings Locations:
- **macOS**: `~/.cursor/mcp_servers.json`
- **Windows**: `%APPDATA%\Cursor\User\mcp_servers.json` 
- **Linux**: `~/.config/Cursor/User/mcp_servers.json`

### Via Cursor UI:
- Cursor Settings → Extensions → MCP Servers

## ✅ Key Benefits

### ✅ **NEW Global Configuration:**
- ✅ Works for any user
- ✅ No local file paths
- ✅ Simple installation
- ✅ Universal compatibility

### ❌ **OLD Local Configuration:**
- ❌ Only works for specific user
- ❌ Hardcoded local paths
- ❌ Not shareable
- ❌ Platform-specific

## 🎯 Available Tools

Once configured, users get access to:

- **get_prompt_list** - Browse all prompts
- **get_prompt** - Get specific prompt details
- **create_prompt** - Create new prompts
- **update_prompt** - Modify existing prompts
- **delete_prompt** - Remove prompts
- **get_user_prompts** - List user's prompts
- **import_prompts** - Import from JSON/URLs (coming soon)

## 📱 Integration Points

### Tokens Page (`/tokens`)
- ✅ Updated with complete MCP setup instructions
- ✅ Copy-paste installation command
- ✅ Copy-paste configuration with user's token
- ✅ Step-by-step setup guide

### Website Integration
- Display configuration on token creation
- Provide installation scripts
- Show setup instructions
- Link to documentation

---

**Ready for global distribution! 🌍**
