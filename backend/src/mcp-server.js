#!/usr/bin/env node

require('dotenv').config();
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class PromptHouseMCPServer {
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

    this.setupToolHandlers();
    this.setupErrorHandling();
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
            name: 'search_articles',
            description: 'Search for articles by title, content, category, tags, or source prompt',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query to find articles',
                },
                category: {
                  type: 'string',
                  description: 'Filter by category (optional)',
                },
                tags: {
                  type: 'string',
                  description: 'Filter by tags (comma-separated, optional)',
                },
                promptTitle: {
                  type: 'string',
                  description: 'Filter by source prompt title (optional)',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results (default: 10)',
                  default: 10,
                },
                sortBy: {
                  type: 'string',
                  description: 'Sort by field: title, category, createdAt, wordCount (default: createdAt)',
                  default: 'createdAt',
                },
                sortOrder: {
                  type: 'string',
                  description: 'Sort order: asc or desc (default: desc)',
                  default: 'desc',
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
                userId: {
                  type: 'string',
                  description: 'User ID (required for authentication)',
                },
              },
              required: ['title', 'content', 'userId'],
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
                userId: {
                  type: 'string',
                  description: 'User ID (required for authentication)',
                },
              },
              required: ['promptId', 'userId'],
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
            name: 'get_user_stats',
            description: 'Get user statistics including prompt counts and usage',
            inputSchema: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  description: 'User ID to get stats for',
                },
              },
              required: ['userId'],
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
                userId: {
                  type: 'string',
                  description: 'User ID (required for authentication)',
                },
              },
              required: ['promptId', 'userId'],
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
          case 'search_articles':
            return await this.searchArticles(args);
          case 'get_prompt':
            return await this.getPrompt(args);
          case 'create_prompt':
            return await this.createPrompt(args);
          case 'update_prompt':
            return await this.updatePrompt(args);
          case 'list_templates':
            return await this.listTemplates(args);
          case 'get_user_stats':
            return await this.getUserStats(args);
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

    const where = {
      OR: [
        { title: { contains: query } },
        { description: { contains: query } },
        { content: { contains: query } },
      ],
    };

    if (category) {
      where.category = category;
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      where.tags = {
        path: '$',
        array_contains: tagArray
      };
    }

    if (typeof isPublic === 'boolean') {
      where.isPublic = isPublic;
    }

    const prompts = await prisma.prompt.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    const results = prompts.map(prompt => ({
      id: prompt.id,
      title: prompt.title,
      description: prompt.description,
      category: prompt.category,
      tags: prompt.tags,
      isPublic: prompt.isPublic,
      author: `${prompt.user.firstName || ''} ${prompt.user.lastName || ''}`.trim() || prompt.user.email,
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

  async searchArticles(args) {
    const { query, category, tags, promptTitle, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = args;

    const where = {
      OR: [
        { title: { contains: query } },
        { content: { contains: query } },
      ],
    };

    if (category) {
      where.category = category;
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      where.tags = {
        path: '$',
        array_contains: tagArray
      };
    }

    if (promptTitle) {
      where.OR.push({ promptTitle: { contains: promptTitle } });
    }

    const articles = await prisma.article.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        prompt: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { [sortBy]: sortOrder },
      take: limit,
    });

    const results = articles.map(article => ({
      id: article.id,
      title: article.title,
      category: article.category,
      tags: article.tags,
      wordCount: article.wordCount,
      charCount: article.charCount,
      promptId: article.promptId,
      promptTitle: article.promptTitle,
      author: `${article.user.firstName || ''} ${article.user.lastName || ''}`.trim() || article.user.email,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      preview: article.content.substring(0, 300) + (article.content.length > 300 ? '...' : ''),
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

    const prompt = await prisma.prompt.findUnique({
      where: { id: promptId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!prompt) {
      throw new Error(`Prompt with ID ${promptId} not found`);
    }

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
      author: `${prompt.user.firstName || ''} ${prompt.user.lastName || ''}`.trim() || prompt.user.email,
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
    const { title, description, content, category, tags, isPublic = false, userId } = args;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Extract variables and calculate statistics
    const variables = this.extractVariables(content);
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const charCount = content.length;
    const estimatedTokens = Math.ceil(charCount / 4);

    const prompt = await prisma.prompt.create({
      data: {
        title,
        description,
        content,
        category,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        isPublic,
        variables: variables.map(v => ({ name: v, description: '' })),
        wordCount,
        charCount,
        estimatedTokens,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Prompt created successfully',
            prompt: {
              id: prompt.id,
              title: prompt.title,
              description: prompt.description,
              category: prompt.category,
              tags: prompt.tags,
              isPublic: prompt.isPublic,
              variables: variables,
              statistics: {
                characters: charCount,
                words: wordCount,
                estimatedTokens: estimatedTokens,
              },
            },
          }, null, 2),
        },
      ],
    };
  }

  async updatePrompt(args) {
    const { promptId, userId, ...updates } = args;

    // Check if prompt exists
    const existingPrompt = await prisma.prompt.findUnique({
      where: { id: promptId }
    });

    if (!existingPrompt) {
      throw new Error(`Prompt with ID ${promptId} not found`);
    }

    // Get user info to check admin status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true }
    });

    // Check authorization: user owns prompt OR (user is admin AND prompt is public)
    const isOwner = existingPrompt.userId === userId;
    const isAdminUpdatingPublic = user?.isAdmin && existingPrompt.isPublic;

    if (!isOwner && !isAdminUpdatingPublic) {
      const errorMessage = existingPrompt.isPublic 
        ? 'Only admins can update public prompts that are not their own'
        : 'You can only update your own prompts';
      throw new Error(errorMessage);
    }

    // Process updates
    const updateData = { ...updates };

    if (updates.tags) {
      updateData.tags = updates.tags.split(',').map(tag => tag.trim());
    }

    if (updates.content) {
      const variables = this.extractVariables(updates.content);
      updateData.variables = variables.map(v => ({ name: v, description: '' }));
      updateData.wordCount = updates.content.trim() ? updates.content.trim().split(/\s+/).length : 0;
      updateData.charCount = updates.content.length;
      updateData.estimatedTokens = Math.ceil(updates.content.length / 4);
    }

    const prompt = await prisma.prompt.update({
      where: { id: promptId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Prompt updated successfully',
            prompt: {
              id: prompt.id,
              title: prompt.title,
              description: prompt.description,
              category: prompt.category,
              tags: prompt.tags,
              isPublic: prompt.isPublic,
            },
          }, null, 2),
        },
      ],
    };
  }

  async deletePrompt(args) {
    const { promptId, userId } = args;

    // Check if prompt exists
    const existingPrompt = await prisma.prompt.findUnique({
      where: { id: promptId }
    });

    if (!existingPrompt) {
      throw new Error(`Prompt with ID ${promptId} not found`);
    }

    // Get user info to check admin status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true }
    });

    // Check authorization: user owns prompt OR (user is admin AND prompt is public)
    const isOwner = existingPrompt.userId === userId;
    const isAdminDeletingPublic = user?.isAdmin && existingPrompt.isPublic;

    if (!isOwner && !isAdminDeletingPublic) {
      const errorMessage = existingPrompt.isPublic 
        ? 'Only admins can delete public prompts that are not their own'
        : 'You can only delete your own prompts';
      throw new Error(errorMessage);
    }

    await prisma.prompt.delete({
      where: { id: promptId }
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
    const templates = [
      {
        id: 'writing-assistant',
        name: 'Writing Assistant',
        description: 'Professional writing assistant for content creation',
        category: 'writing',
        variables: ['role', 'field', 'task', 'context', 'requirement1', 'requirement2'],
      },
      {
        id: 'code-reviewer',
        name: 'Code Reviewer',
        description: 'Expert code review and feedback system',
        category: 'development',
        variables: ['language', 'code_type', 'code', 'focus1', 'focus2', 'focus3'],
      },
      {
        id: 'data-analyst',
        name: 'Data Analysis',
        description: 'Comprehensive data analysis and insights',
        category: 'analysis',
        variables: ['data_type', 'data', 'goal1', 'goal2', 'goal3', 'additional_request'],
      },
      {
        id: 'customer-support',
        name: 'Customer Support',
        description: 'Professional customer service and support',
        category: 'support',
        variables: ['company', 'customer_issue', 'customer_name', 'account_type', 'previous_contact', 'response_goal1', 'response_goal2', 'response_goal3'],
      },
      {
        id: 'marketing-copy',
        name: 'Marketing Copy',
        description: 'Persuasive marketing and sales content',
        category: 'marketing',
        variables: ['content_type', 'product_name', 'target_audience', 'benefit1', 'benefit2', 'benefit3', 'usp', 'cta', 'tone', 'length', 'additional_requirements'],
      },
      {
        id: 'educational-tutor',
        name: 'Educational Tutor',
        description: 'Personalized tutoring and explanation system',
        category: 'education',
        variables: ['subject', 'topic', 'level', 'learning_style', 'question', 'instruction1', 'instruction2', 'instruction3', 'teaching_method', 'examples_type'],
      },
    ];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ templates, count: templates.length }, null, 2),
        },
      ],
    };
  }

  async getUserStats(args) {
    const { userId } = args;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const totalPrompts = await prisma.prompt.count({
      where: { userId }
    });

    const publicPrompts = await prisma.prompt.count({
      where: { userId, isPublic: true }
    });

    const privatePrompts = totalPrompts - publicPrompts;

    const stats = {
      user: {
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
      },
      prompts: {
        total: totalPrompts,
        public: publicPrompts,
        private: privatePrompts,
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(stats, null, 2),
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
      await prisma.$disconnect();
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🔌 Premium Prompt House MCP Server running');
  }
}

if (require.main === module) {
  const server = new PromptHouseMCPServer();
  server.run().catch(console.error);
}

module.exports = PromptHouseMCPServer; 