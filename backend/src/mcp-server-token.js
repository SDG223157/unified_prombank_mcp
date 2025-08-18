#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

class PromptBankMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'prompt-bank',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.baseUrl = process.env.PROMPTHOUSE_API_URL || 'https://prombank.app';
    this.accessToken = process.env.PROMPTHOUSE_ACCESS_LINK;
    this.user = null;

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  async authenticateToken() {
    if (!this.accessToken) {
      throw new Error('PROMPTHOUSE_ACCESS_LINK environment variable is required');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/tokens/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: this.accessToken }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Token validation failed');
      }

      const data = await response.json();
      this.user = data.user;
      this.permissions = data.permissions;
      
      return true;
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async makeAuthenticatedRequest(endpoint, options = {}) {
    if (!this.user) {
      await this.authenticateToken();
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_prompts',
            description: 'Search for prompts by title, description, tags, or content',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query to find prompts',
                },
                category: {
                  type: 'string',
                  description: 'Filter by category (optional)',
                },
                tags: {
                  type: 'string',
                  description: 'Filter by tags (comma-separated, optional)',
                },
                isPublic: {
                  type: 'boolean',
                  description: 'Filter by public/private prompts (optional)',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results (default: 10)',
                  default: 10,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_prompt',
            description: 'Get a specific prompt by ID with full details',
            inputSchema: {
              type: 'object',
              properties: {
                promptId: {
                  type: 'string',
                  description: 'The ID of the prompt to retrieve',
                },
              },
              required: ['promptId'],
            },
          },
          {
            name: 'create_prompt',
            description: 'Create a new prompt with title, content, and metadata',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Title of the prompt',
                },
                description: {
                  type: 'string',
                  description: 'Description of the prompt (optional)',
                },
                content: {
                  type: 'string',
                  description: 'The prompt content with variables in {{variable}} format',
                },
                category: {
                  type: 'string',
                  description: 'Category of the prompt (optional)',
                },
                tags: {
                  type: 'string',
                  description: 'Comma-separated tags (optional)',
                },
                isPublic: {
                  type: 'boolean',
                  description: 'Whether the prompt should be public',
                  default: false,
                },
              },
              required: ['title', 'content'],
            },
          },
          {
            name: 'update_prompt',
            description: 'Update an existing prompt',
            inputSchema: {
              type: 'object',
              properties: {
                promptId: {
                  type: 'string',
                  description: 'The ID of the prompt to update',
                },
                title: {
                  type: 'string',
                  description: 'New title (optional)',
                },
                description: {
                  type: 'string',
                  description: 'New description (optional)',
                },
                content: {
                  type: 'string',
                  description: 'New content (optional)',
                },
                category: {
                  type: 'string',
                  description: 'New category (optional)',
                },
                tags: {
                  type: 'string',
                  description: 'New comma-separated tags (optional)',
                },
                isPublic: {
                  type: 'boolean',
                  description: 'Whether the prompt should be public (optional)',
                },
              },
              required: ['promptId'],
            },
          },
          {
            name: 'list_templates',
            description: 'Get available prompt templates',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Filter by category (optional)',
                },
              },
            },
          },
          {
            name: 'get_user_info',
            description: 'Get your user information and statistics',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'delete_prompt',
            description: 'Delete a prompt by ID',
            inputSchema: {
              type: 'object',
              properties: {
                promptId: {
                  type: 'string',
                  description: 'The ID of the prompt to delete',
                },
              },
              required: ['promptId'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_prompts':
            return await this.searchPrompts(args);
          case 'get_prompt':
            return await this.getPrompt(args);
          case 'create_prompt':
            return await this.createPrompt(args);
          case 'update_prompt':
            return await this.updatePrompt(args);
          case 'list_templates':
            return await this.listTemplates(args);
          case 'get_user_info':
            return await this.getUserInfo(args);
          case 'delete_prompt':
            return await this.deletePrompt(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async searchPrompts(args) {
    const { query, category, tags, isPublic, limit = 10 } = args;

    const searchParams = new URLSearchParams({
      search: query,
      limit: limit.toString(),
    });

    if (category) searchParams.append('category', category);
    if (tags) searchParams.append('tags', tags);
    if (typeof isPublic === 'boolean') {
      searchParams.append('filter', isPublic ? 'public' : 'mine');
    }

    const data = await this.makeAuthenticatedRequest(`/api/prompts?${searchParams}`);

    const results = data.prompts.map(prompt => ({
      id: prompt.id,
      title: prompt.title,
      description: prompt.description,
      category: prompt.category,
      tags: prompt.tags,
      isPublic: prompt.isPublic,
      author: `${prompt.user?.firstName || ''} ${prompt.user?.lastName || ''}`.trim() || prompt.user?.email || 'Unknown',
      updatedAt: prompt.updatedAt,
      preview: prompt.content.substring(0, 200) + (prompt.content.length > 200 ? '...' : ''),
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ 
            results: results,
            count: results.length,
            query: query 
          }, null, 2),
        },
      ],
    };
  }

  async getPrompt(args) {
    const { promptId } = args;

    const data = await this.makeAuthenticatedRequest(`/api/prompts/${promptId}`);
    const prompt = data.prompt;

    // Extract variables from content
    const variables = this.extractVariables(prompt.content);

    const result = {
      id: prompt.id,
      title: prompt.title,
      description: prompt.description,
      content: prompt.content,
      category: prompt.category,
      tags: prompt.tags,
      isPublic: prompt.isPublic,
      variables: variables,
      statistics: {
        characters: prompt.charCount || prompt.content.length,
        words: prompt.wordCount || (prompt.content.trim() ? prompt.content.trim().split(/\s+/).length : 0),
        estimatedTokens: prompt.estimatedTokens || Math.ceil(prompt.content.length / 4),
      },
      author: `${prompt.user?.firstName || ''} ${prompt.user?.lastName || ''}`.trim() || prompt.user?.email || 'Unknown',
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async createPrompt(args) {
    const { title, description, content, category, tags, isPublic = false } = args;

    const requestBody = {
      title,
      description,
      content,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      isPublic,
    };

    const data = await this.makeAuthenticatedRequest('/api/prompts', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Prompt created successfully',
            prompt: {
              id: data.prompt.id,
              title: data.prompt.title,
              description: data.prompt.description,
              category: data.prompt.category,
              tags: data.prompt.tags,
              isPublic: data.prompt.isPublic,
              variables: this.extractVariables(data.prompt.content),
            },
          }, null, 2),
        },
      ],
    };
  }

  async updatePrompt(args) {
    const { promptId, ...updates } = args;

    const requestBody = { ...updates };
    if (updates.tags) {
      requestBody.tags = updates.tags.split(',').map(tag => tag.trim());
    }

    const data = await this.makeAuthenticatedRequest(`/api/prompts/${promptId}`, {
      method: 'PUT',
      body: JSON.stringify(requestBody),
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Prompt updated successfully',
            prompt: {
              id: data.prompt.id,
              title: data.prompt.title,
              description: data.prompt.description,
              category: data.prompt.category,
              tags: data.prompt.tags,
              isPublic: data.prompt.isPublic,
            },
          }, null, 2),
        },
      ],
    };
  }

  async deletePrompt(args) {
    const { promptId } = args;

    await this.makeAuthenticatedRequest(`/api/prompts/${promptId}`, {
      method: 'DELETE',
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Prompt deleted successfully',
            promptId: promptId,
          }, null, 2),
        },
      ],
    };
  }

  async listTemplates() {
    const data = await this.makeAuthenticatedRequest('/api/prompts/templates');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ 
            templates: data.templates, 
            count: data.templates.length 
          }, null, 2),
        },
      ],
    };
  }

  async getUserInfo() {
    if (!this.user) {
      await this.authenticateToken();
    }

    const data = await this.makeAuthenticatedRequest(`/api/user/stats`);

    const result = {
      user: {
        id: this.user.id,
        name: `${this.user.firstName || ''} ${this.user.lastName || ''}`.trim() || this.user.email,
        email: this.user.email,
        subscriptionTier: this.user.subscriptionTier,
      },
      permissions: this.permissions,
      stats: data.stats,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  extractVariables(content) {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match);
    }
    return [...new Set(matches.map(match => match[1].trim()))];
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    try {
      // Validate token on startup
      await this.authenticateToken();
      console.error(`🔌 Prompt Bank MCP Server connected for ${this.user.email}`);
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
    } catch (error) {
      console.error('❌ Failed to start MCP server:', error.message);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const server = new PromptBankMCPServer();
  server.run().catch(console.error);
}

module.exports = PromptBankMCPServer; 