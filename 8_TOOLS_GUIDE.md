# 🏠 **Prompt House Premium MCP Server - 8 Tools Complete Guide**

The prompt-house-premium MCP server now provides **8 powerful tools** for managing prompts and user information directly within Cursor. Here's how to use each one:

---

## 🚀 **Setup First**

Before using the tools, ensure you have:

1. **Installed the MCP server**: 
   ```bash
   curl -fsSL https://raw.githubusercontent.com/SDG223157/unified_prombank_mcp/main/install-mcp.sh | bash
   ```

2. **Got your API token** from [https://prombank.app/tokens](https://prombank.app/tokens)

3. **Configured Cursor** with your token in `~/.cursor/mcp_servers.json`:
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

---

## 🛠️ **The 8 Tools Explained**

### 1. **`get_prompt_list`** - Browse Available Prompts
**Purpose**: Get a list of all available prompts with filtering options

**Usage Examples in Cursor**:
- "Get all public prompts"
- "Show me prompts in the 'Development' category"
- "List prompts tagged with 'python'"
- "Get all my private prompts"

**Parameters**:
- `category` (optional): Filter by category
- `isPublic` (optional): Filter by public/private status
- `tags` (optional): Filter by specific tags

---

### 2. **`get_prompt`** - Retrieve Specific Prompt
**Purpose**: Get detailed information about a specific prompt by ID

**Usage Examples in Cursor**:
- "Get prompt with ID 'abc123'"
- "Show me the details of prompt 'react-component-generator'"
- "Retrieve the content of my API documentation prompt"

**Parameters**:
- `promptId` (required): The unique ID of the prompt

---

### 3. **`create_prompt`** - Create New Prompts
**Purpose**: Create new prompts and save them to your collection

**Usage Examples in Cursor**:
- "Create a prompt for generating React components"
- "Make a new private prompt for API documentation with tags 'documentation' and 'api'"
- "Create a public prompt in the 'Development' category for code reviews"

**Parameters**:
- `title` (required): The prompt title
- `content` (required): The prompt content/text
- `description` (optional): Description of the prompt
- `category` (optional): Category classification
- `tags` (optional): Array of tags
- `isPublic` (optional): Whether prompt is public (defaults to private)

---

### 4. **`update_prompt`** - Modify Existing Prompts
**Purpose**: Update any aspect of an existing prompt

**Usage Examples in Cursor**:
- "Update prompt 'abc123' to make it public"
- "Add the tag 'featured' to prompt with ID 'xyz789'"
- "Change the title of prompt 'def456' to 'Advanced React Patterns'"
- "Update the content of my API prompt to include error handling"

**Parameters**:
- `promptId` (required): ID of prompt to update
- `title` (optional): New title
- `content` (optional): New content
- `description` (optional): New description
- `category` (optional): New category
- `tags` (optional): New tags array
- `isPublic` (optional): New public status

---

### 5. **`delete_prompt`** - Remove Prompts
**Purpose**: Delete prompts you no longer need

**Usage Examples in Cursor**:
- "Delete prompt with ID 'old123'"
- "Remove the outdated documentation prompt"
- "Delete my test prompt 'abc789'"

**Parameters**:
- `promptId` (required): ID of prompt to delete

---

### 6. **`get_user_prompts`** - List Your Personal Prompts
**Purpose**: Get all prompts created by the current user

**Usage Examples in Cursor**:
- "Show me all my prompts"
- "List my prompts in the 'Development' category"
- "Get my prompts tagged with 'react'"

**Parameters**:
- `category` (optional): Filter by category
- `tags` (optional): Filter by tags

---

### 7. **`import_prompts`** - Bulk Import Prompts
**Purpose**: Import multiple prompts from JSON data or external URLs

**Usage Examples in Cursor**:
- "Import prompts from this JSON data: [array of prompt objects]"
- "Import prompts from URL 'https://example.com/prompts.json'"
- "Bulk import these 5 coding interview prompts from CSV format"

**Parameters**:
- `type` (required): Either "json" or "url"
- `prompts` (for json type): Array of prompt objects
- `url` (for url type): URL to fetch prompts from
- `format` (for url type): "json", "csv", or "auto-detect"

---

### 8. **`user_info`** ⭐ **NEW** - Get User Information & Statistics
**Purpose**: Retrieve current user profile information and account statistics

**Usage Examples in Cursor**:
- "Get my user info and statistics"
- "Show me my profile information"
- "Get my user info without statistics"
- "What's my subscription tier and how many prompts do I have?"

**Parameters**:
- `include_stats` (optional): Include user statistics (defaults to true)
  - `true`: Returns profile + prompt counts and statistics
  - `false`: Returns only basic profile information

**What You Get**:
- **Profile Info**: Name, email, subscription tier, admin status, member since date
- **Statistics** (if included): Total prompts, public prompts, private prompts
- **Raw API Data**: Complete JSON response for advanced use cases

---

## 💡 **Practical Usage Examples**

### **Getting Your Account Overview**
```
Get my user info with statistics to see my profile and prompt counts
```

### **Creating a Development Workflow**
```
Create a prompt titled "Code Review Checklist" with content about reviewing pull requests, tagged with "development" and "code-review", in the Development category
```

### **Managing Your Prompt Library**
```
Get all my prompts in the Development category, then update prompt ID "abc123" to add the tag "featured"
```

### **Account Management**
```
Show me my user profile information and subscription details
```

### **Bulk Operations**
```
Import prompts from JSON data containing 10 different coding interview questions with proper categorization
```

### **Finding Specific Content**
```
Get all public prompts tagged with "python" and "machine-learning"
```

---

## 🎯 **Best Practices**

1. **Start with `user_info`** to understand your account status and limits
2. **Use `get_prompt_list`** to explore available prompts
3. **Use specific tags** when creating prompts for better organization
4. **Keep prompts private by default** unless you want to share
5. **Use descriptive titles and descriptions** for better searchability
6. **Regularly clean up** unused prompts with `delete_prompt`
7. **Leverage bulk import** for migrating existing prompt collections
8. **Check your statistics** periodically with `user_info` to track your usage

---

## 🔧 **Tool Categories**

### 📝 **Prompt Management** (6 tools)
- `get_prompt_list` - Browse and search
- `get_prompt` - View specific prompts
- `create_prompt` - Add new prompts
- `update_prompt` - Modify existing
- `delete_prompt` - Remove prompts
- `get_user_prompts` - View your collection

### 👤 **User Management** (1 tool)
- `user_info` - Profile and statistics

### 📥 **Data Management** (1 tool)
- `import_prompts` - Bulk operations

---

## 🚀 **What's New in v1.1**

### ✨ **New Tool Added**
- **`user_info`** - Complete user profile and statistics tool
- Get subscription tier, admin status, member since date
- View prompt statistics (total, public, private counts)
- Optional parameter to include/exclude detailed stats
- Formatted output with both human-readable and raw JSON data

---

## 🔧 **Troubleshooting**

If tools aren't working:
1. **Check your API token** is correctly set in the MCP configuration
2. **Restart Cursor** after making configuration changes
3. **Verify the MCP server is installed** with `which prompt-house-premium-mcp`
4. **Check internet connectivity** to https://prombank.app
5. **Update to latest version** with the install script

---

## 📊 **Tool Usage Summary**

| Tool | Purpose | Parameters | Output |
|------|---------|------------|--------|
| `get_prompt_list` | Browse prompts | category, tags, isPublic | List of prompts |
| `get_prompt` | Get specific prompt | promptId | Prompt details |
| `create_prompt` | Create new prompt | title, content, tags, etc. | Created prompt |
| `update_prompt` | Modify prompt | promptId + updates | Updated prompt |
| `delete_prompt` | Remove prompt | promptId | Success message |
| `get_user_prompts` | Your prompts | category, tags | Your prompt list |
| `import_prompts` | Bulk import | type, prompts/url | Import results |
| `user_info` ⭐ | User profile & stats | include_stats | Profile + statistics |

---

These **8 tools** give you complete control over your prompt library and account information directly within Cursor, making it easy to create, manage, organize, and monitor your AI prompts efficiently! 🚀

**Total Tools Available: 8** 
- **6 Prompt Management Tools**
- **1 User Information Tool** ⭐ NEW
- **1 Import/Export Tool**
