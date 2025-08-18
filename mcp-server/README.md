# Prompt House Premium MCP Server

A Model Context Protocol (MCP) server for [Prompt House Premium](https://prombank.app) that enables seamless integration with Cursor and other MCP-compatible tools.

## Features

- 📝 **Create, Read, Update, Delete** prompts
- 📥 **Import prompts** from JSON, CSV, or URLs
- 🔍 **Search and filter** prompts by category, tags, and visibility
- 🔐 **API token authentication** for secure access
- 🏷️ **Automatic variable detection** from prompt content
- 🌐 **Public/Private** prompt management

## Installation

### Option 1: Install from GitHub (Recommended)

```bash
npm install -g git+https://github.com/SDG223157/unified_prombank_mcp.git#main:mcp-server
```

### Option 2: Clone and Install Locally

```bash
git clone https://github.com/SDG223157/unified_prombank_mcp.git
cd unified_prombank_mcp/mcp-server
npm install
npm run build
npm install -g .
```

## Configuration

### 1. Get Your API Token

1. Visit [https://prombank.app/tokens](https://prombank.app/tokens)
2. Sign in with Google
3. Create a new API token
4. Copy the generated token

### 2. Configure Cursor

Add this configuration to your Cursor settings (`~/.cursor/mcp_servers.json` or via Settings > MCP Servers):

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

Replace `your_api_token_here` with your actual API token from step 1.

## Available Tools

### Prompt Management

- **`get_prompt_list`** - Get list of available prompts with filtering
- **`get_prompt`** - Get a specific prompt by ID
- **`create_prompt`** - Create a new prompt
- **`update_prompt`** - Update an existing prompt
- **`delete_prompt`** - Delete a prompt
- **`get_user_prompts`** - Get prompts created by the current user

### Import Tools

- **`import_prompts`** - Import multiple prompts from JSON data or URLs
  - **JSON Import**: Direct import from structured JSON data
  - **URL Import**: Import from remote JSON/CSV files with auto-detection

## Usage Examples

### Create a Prompt
```
Create a prompt titled "Code Review Checklist" for reviewing pull requests
```

### Import Prompts
```
Import prompts from JSON data with 3 marketing email templates
```

### Search Prompts
```
Get all public prompts in the "Marketing" category
```

### Update a Prompt
```
Update prompt "abc123" to make it public and add tag "featured"
```

## Import Formats

### JSON Format
```json
{
  "prompts": [
    {
      "title": "Prompt Title",
      "description": "Prompt description",
      "content": "Your prompt content with {{variables}}",
      "category": "Category Name",
      "tags": ["tag1", "tag2"],
      "is_public": false
    }
  ]
}
```

### CSV Format
```csv
title,description,content,category,tags,is_public
"Email Template","Professional email template","Create a {{type}} email for {{purpose}}","Business","email,template",true
```

## Environment Variables

- `PROMPTHOUSE_API_URL` - API endpoint (default: https://prombank.app)
- `PROMPTHOUSE_ACCESS_TOKEN` - Your API access token (required)

## Troubleshooting

### Authentication Issues
- Ensure your API token is valid and active
- Check that the token has the necessary permissions
- Verify the API URL is correct

### Connection Issues
- Confirm you have internet connectivity
- Check that https://prombank.app is accessible
- Verify your firewall settings allow outbound HTTPS connections

### Installation Issues
- Ensure Node.js 18+ is installed
- Try clearing npm cache: `npm cache clean --force`
- For permission issues, use `sudo` (macOS/Linux) or run as Administrator (Windows)

## Support

- 🌐 **Website**: [https://prombank.app](https://prombank.app)
- 📧 **Issues**: [GitHub Issues](https://github.com/SDG223157/unified_prombank_mcp/issues)
- 💬 **Documentation**: Available on the website

## License

MIT License - see LICENSE file for details.
