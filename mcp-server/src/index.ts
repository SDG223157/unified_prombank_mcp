#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

interface Prompt {
  id: string;
  title: string;
  description?: string;
  content: string;
  tags: string[];
  isPublic: boolean;
  category?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

interface CreatePromptRequest {
  title: string;
  description?: string;
  content: string;
  tags: string[];
  isPublic: boolean;
  category?: string;
}

interface UpdatePromptRequest {
  title?: string;
  description?: string;
  content?: string;
  tags?: string[];
  isPublic?: boolean;
  category?: string;
}

interface ImportPromptData {
  title: string;
  description?: string;
  content: string;
  category?: string;
  tags?: string[];
  is_public?: boolean;
}

interface ImportRequest {
  type: 'json' | 'url';
  prompts?: ImportPromptData[];
  url?: string;
  format?: 'json' | 'csv' | 'md' | 'auto-detect';
}

class PromptHousePremiumServer {
  private server: Server;
  private apiUrl: string;
  private accessToken: string;

  constructor() {
    this.server = new Server(
      {
        name: 'prompt-house-premium',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.apiUrl = process.env.PROMPTHOUSE_API_URL || 'http://localhost:3001';
    this.accessToken = process.env.PROMPTHOUSE_ACCESS_TOKEN || '';

    this.setupToolHandlers();
  }

  private async makeApiCall(endpoint: string, method = 'GET', data?: any) {
    try {
      const response = await axios({
        method,
        url: `${this.apiUrl}/api${endpoint}`,
        data,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_prompt_list',
            description: 'Get list of available prompts',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Filter by category (optional)'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by tags (optional)'
                },
                isPublic: {
                  type: 'boolean',
                  description: 'Filter by public/private status (optional)'
                }
              }
            }
          },
          {
            name: 'get_prompt',
            description: 'Get a specific prompt by ID',
            inputSchema: {
              type: 'object',
              properties: {
                promptId: {
                  type: 'string',
                  description: 'The ID of the prompt to retrieve'
                }
              },
              required: ['promptId']
            }
          },
          {
            name: 'create_prompt',
            description: 'Create a new prompt',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'The title of the prompt'
                },
                description: {
                  type: 'string',
                  description: 'Optional description of the prompt'
                },
                content: {
                  type: 'string',
                  description: 'The content/text of the prompt'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags to categorize the prompt'
                },
                isPublic: {
                  type: 'boolean',
                  description: 'Whether the prompt should be public',
                  default: false
                },
                category: {
                  type: 'string',
                  description: 'Optional category for the prompt'
                }
              },
              required: ['title', 'content']
            }
          },
          {
            name: 'update_prompt',
            description: 'Update an existing prompt',
            inputSchema: {
              type: 'object',
              properties: {
                promptId: {
                  type: 'string',
                  description: 'The ID of the prompt to update'
                },
                title: {
                  type: 'string',
                  description: 'Updated title'
                },
                description: {
                  type: 'string',
                  description: 'Updated description'
                },
                content: {
                  type: 'string',
                  description: 'Updated content'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Updated tags'
                },
                isPublic: {
                  type: 'boolean',
                  description: 'Updated public status'
                },
                category: {
                  type: 'string',
                  description: 'Updated category'
                }
              },
              required: ['promptId']
            }
          },
          {
            name: 'delete_prompt',
            description: 'Delete a prompt',
            inputSchema: {
              type: 'object',
              properties: {
                promptId: {
                  type: 'string',
                  description: 'The ID of the prompt to delete'
                }
              },
              required: ['promptId']
            }
          },
          {
            name: 'import_prompts',
            description: 'Import multiple prompts from JSON data or URL',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['json', 'url'],
                  description: 'Import type: json (direct data) or url (from remote source)'
                },
                prompts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      content: { type: 'string' },
                      category: { type: 'string' },
                      tags: {
                        type: 'array',
                        items: { type: 'string' }
                      },
                      is_public: { type: 'boolean' }
                    },
                    required: ['title', 'content']
                  },
                  description: 'Array of prompts to import (required for json type)'
                },
                url: {
                  type: 'string',
                  description: 'URL to fetch prompts from (required for url type)'
                },
                format: {
                  type: 'string',
                  enum: ['json', 'csv', 'md', 'auto-detect'],
                  description: 'Format of the data at URL (for url type)'
                }
              },
              required: ['type']
            }
          },
          {
            name: 'get_user_prompts',
            description: 'Get prompts created by the current user',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Filter by category (optional)'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by tags (optional)'
                }
              }
            }
          },
          {
            name: 'user_info',
            description: 'Get current user information, profile, and statistics',
            inputSchema: {
              type: 'object',
              properties: {
                include_stats: {
                  type: 'boolean',
                  description: 'Include user statistics (prompt counts, etc.)',
                  default: true
                }
              }
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_prompt_list':
            return await this.handleGetPromptList(args);
          
          case 'get_prompt':
            return await this.handleGetPrompt(args);
          
          case 'create_prompt':
            return await this.handleCreatePrompt(args);
          
          case 'update_prompt':
            return await this.handleUpdatePrompt(args);
          
          case 'delete_prompt':
            return await this.handleDeletePrompt(args);
          
          case 'get_user_prompts':
            return await this.handleGetUserPrompts(args);
          
          case 'import_prompts':
            return await this.handleImportPrompts(args);
          
          case 'user_info':
            return await this.handleUserInfo(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ]
        };
      }
    });
  }

  private async handleGetPromptList(args: any) {
    const params = new URLSearchParams();
    if (args.category) params.append('category', args.category);
    if (args.tags) params.append('tags', args.tags.join(','));
    if (args.isPublic !== undefined) params.append('isPublic', args.isPublic.toString());

    const data = await this.makeApiCall(`/prompts?${params.toString()}`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }
      ]
    };
  }

  private async handleGetPrompt(args: any) {
    const data = await this.makeApiCall(`/prompts/${args.promptId}`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }
      ]
    };
  }

  private async handleCreatePrompt(args: any) {
    const promptData: CreatePromptRequest = {
      title: args.title,
      description: args.description,
      content: args.content,
      tags: args.tags || [],
      isPublic: args.isPublic || false,
      category: args.category
    };

    const data = await this.makeApiCall('/prompts', 'POST', promptData);
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Prompt created successfully!\n\n${JSON.stringify(data, null, 2)}`
        }
      ]
    };
  }

  private async handleUpdatePrompt(args: any) {
    const { promptId, ...updateData } = args;
    const data = await this.makeApiCall(`/prompts/${promptId}`, 'PUT', updateData);
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Prompt updated successfully!\n\n${JSON.stringify(data, null, 2)}`
        }
      ]
    };
  }

  private async handleDeletePrompt(args: any) {
    await this.makeApiCall(`/prompts/${args.promptId}`, 'DELETE');
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Prompt deleted successfully!`
        }
      ]
    };
  }

  private async handleGetUserPrompts(args: any) {
    const params = new URLSearchParams();
    if (args.category) params.append('category', args.category);
    if (args.tags) params.append('tags', args.tags.join(','));

    const data = await this.makeApiCall(`/user/prompts?${params.toString()}`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }
      ]
    };
  }

  private async handleImportPrompts(args: any) {
    const request = args as ImportRequest;
    
    try {
      if (request.type === 'json') {
        // Direct JSON import
        if (!request.prompts || request.prompts.length === 0) {
          throw new Error('No prompts provided for JSON import');
        }
        
        const data = await this.makeApiCall('/mcp/import', 'POST', {
          type: 'json',
          prompts: request.prompts
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Import successful!\n\n${data.message}\n\nImported ${request.prompts.length} prompts via MCP.`
            }
          ]
        };
      } else if (request.type === 'url') {
        // URL-based import
        if (!request.url) {
          throw new Error('URL is required for URL import');
        }
        
        // For URL import, we use the regular import/url endpoint
        const data = await this.makeApiCall('/import/url', 'POST', {
          url: request.url,
          format: request.format || 'auto-detect'
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Import successful!\n\n${data.message}\n\nSource: ${data.source_url}\n\nImported prompts:\n${data.imported_prompts.map((p: any) => `• ${p.title}${p.variables_detected?.length ? ` (Variables: ${p.variables_detected.join(', ')})` : ''}`).join('\n')}`
            }
          ]
        };
      } else {
        throw new Error(`Unsupported import type: ${request.type}`);
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Import failed: ${error.response?.data?.detail || error.message}`
          }
        ]
      };
    }
  }

  private async handleUserInfo(args: any) {
    try {
      const includeStats = args.include_stats !== false; // Default to true
      
      if (includeStats) {
        // Get user profile with statistics
        const data = await this.makeApiCall('/user/stats');
        
        return {
          content: [
            {
              type: 'text',
              text: `👤 **User Information**\n\n**Profile:**\n• Name: ${data.user.name}\n• Email: ${data.user.email}\n• Subscription: ${data.user.subscription_tier || 'Free'}\n• Admin: ${data.user.is_admin ? 'Yes' : 'No'}\n• Member since: ${new Date(data.user.created_at).toLocaleDateString()}\n\n**Statistics:**\n• Total prompts: ${data.stats.prompts.total}\n• Public prompts: ${data.stats.prompts.public}\n• Private prompts: ${data.stats.prompts.private}\n\n---\n\n**Raw Data:**\n${JSON.stringify(data, null, 2)}`
            }
          ]
        };
      } else {
        // Get just user profile
        const data = await this.makeApiCall('/user/profile');
        
        return {
          content: [
            {
              type: 'text',
              text: `👤 **User Profile**\n\n• Name: ${data.first_name} ${data.last_name}`.trim() + `\n• Email: ${data.email}\n• Subscription: ${data.subscription_tier || 'Free'}\n• Admin: ${data.is_admin ? 'Yes' : 'No'}\n• Auth Provider: ${data.auth_provider}\n• Member since: ${new Date(data.created_at).toLocaleDateString()}\n\n---\n\n**Raw Data:**\n${JSON.stringify(data, null, 2)}`
            }
          ]
        };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to get user info: ${error.response?.data?.detail || error.message}`
          }
        ]
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Prompt House Premium MCP server running on stdio');
  }
}

const server = new PromptHousePremiumServer();
server.run().catch(console.error);