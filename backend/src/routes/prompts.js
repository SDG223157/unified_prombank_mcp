const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { getDatabase } = require('../database');
const { authenticateToken, authenticateApiToken, requireSubscription } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Helper function to get database connection
const getPrisma = async () => {
  return await getDatabase();
};

// Flexible authentication: try API token first, then JWT
const authenticateEither = async (req, res, next) => {
  // Try API token authentication first (for MCP)
  const authHeader = req.headers['authorization'];
  const hasApiToken = req.headers['x-api-token'] || req.query.token || req.body?.token || 
                     (authHeader && !authHeader.startsWith('Bearer ey')); // JWT tokens usually start with 'ey'
  
  if (hasApiToken) {
    return authenticateApiToken(req, res, next);
  } else {
    return authenticateToken(req, res, next);
  }
};

// Validation rules
const createPromptValidation = [
  body('title').isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be max 1000 characters'),
  body('content').isLength({ min: 1 }).withMessage('Content is required'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  body('category').optional().isLength({ max: 100 }).withMessage('Category must be max 100 characters'),
  body('variables').optional().isArray().withMessage('Variables must be an array'),
  body('templateId').optional().isString().withMessage('Template ID must be a string'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object')
];

const updatePromptValidation = [
  body('title').optional().isLength({ min: 1, max: 200 }),
  body('description').optional().isLength({ max: 1000 }),
  body('content').optional().isLength({ min: 1 }),
  body('tags').optional().isArray(),
  body('isPublic').optional().isBoolean(),
  body('category').optional().isLength({ max: 100 }),
  body('variables').optional().isArray(),
  body('templateId').optional().isString(),
  body('metadata').optional().isObject()
];

// Get public prompts (no auth required)
router.get('/public', async (req, res) => {
  try {
    const { category, tags, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const where = {
      isPublic: true,
    };

    // Add filters
    if (category) {
      where.category = category;
    }

    if (tags) {
      const tagArray = tags.split(',');
      where.tags = {
        path: '$',
        array_contains: tagArray
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { content: { contains: search } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Validate and build sort options
    const validSortFields = {
      'title': 'title',
      'category': 'category', 
      'createdAt': 'createdAt',
      'created_at': 'createdAt' // Support both formats
    };
    
    const sortField = validSortFields[sortBy] || 'createdAt';
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
    
    const orderBy = {};
    orderBy[sortField] = sortDirection;

    const prisma = await getPrisma();
    const [prompts, total] = await Promise.all([
      prisma.prompt.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy,
        skip,
        take: parseInt(limit)
      }),
      prisma.prompt.count({ where })
    ]);

    res.json({
      prompts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching public prompts:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch prompts'
    });
  }
});

// Get all prompts (requires auth, includes private if owned by user) - supports both JWT and API tokens
router.get('/', authenticateEither, async (req, res) => {
  try {
    const { category, tags, search, isPublic, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const userId = req.user.id;
    
    const where = {
      OR: [
        { isPublic: true },
        { userId }
      ]
    };

    // Add filters
    if (category) {
      where.category = category;
    }

    if (tags) {
      const tagArray = tags.split(',');
      where.tags = {
        path: '$',
        array_contains: tagArray
      };
    }

    if (isPublic !== undefined) {
      where.isPublic = isPublic === 'true';
    }

    if (search) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
          { content: { contains: search } }
        ]
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Validate and build sort options
    const validSortFields = {
      'title': 'title',
      'category': 'category', 
      'createdAt': 'createdAt',
      'created_at': 'createdAt' // Support both formats
    };
    
    const sortField = validSortFields[sortBy] || 'createdAt';
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
    
    const orderBy = {};
    orderBy[sortField] = sortDirection;

    const [prompts, total] = await Promise.all([
      prisma.prompt.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy,
        skip,
        take: parseInt(limit)
      }),
      prisma.prompt.count({ where })
    ]);

    res.json({
      prompts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch prompts'
    });
  }
});


// Templates route - BEFORE /:id to avoid conflicts
router.get("/templates", async (req, res) => {
  try {
    const templates = [{
      id: "writing-assistant",
      name: "Writing Assistant",
      description: "Professional writing assistant for content creation",
      content: "You are a professional {{role}} with expertise in {{field}}. Please help me {{task}}.\nContext: {{context}}\nRequirements:\n- {{requirement1}}\n- {{requirement2}}\nPlease provide a detailed response.",
      variables: [{ name: "role", description: "Professional role" }],
      category: "writing",
      tags: ["writing"]
    }];
    res.json({ templates, count: templates.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});
// Get single prompt by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to get user from token, but don't require it
    let userId = null;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      }
    } catch (authError) {
      // Ignore auth errors, continue without user
      console.log('Auth failed, continuing without user:', authError.message);
    }

    const prompt = await prisma.prompt.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!prompt) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Prompt not found'
      });
    }

    // Check access permissions
    if (!prompt.isPublic && prompt.userId !== userId) {
      return res.status(403).json({
        error: 'Access Denied',
        message: 'This prompt is private'
      });
    }

    // Log analytics if user is authenticated
    if (userId) {
      await prisma.promptAnalytics.create({
        data: {
          promptId: id,
          eventType: 'view',
          metadata: {
            userId,
            timestamp: new Date()
          }
        }
      }).catch(console.error); // Don't fail the request if analytics fails
    }

    res.json(prompt);

  } catch (error) {
    console.error('Error fetching prompt:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch prompt'
    });
  }
});

// Create new prompt
router.post('/', authenticateEither, createPromptValidation, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { 
      title, 
      description, 
      content, 
      tags = [], 
      isPublic = false, 
      category,
      variables = [],
      templateId,
      metadata = {}
    } = req.body;
    const userId = req.user.id;

    // Calculate content statistics
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const charCount = content.length;
    const estimatedTokens = Math.ceil(charCount / 4); // Rough estimation: 1 token ≈ 4 characters

    const prompt = await prisma.prompt.create({
      data: {
        title,
        description,
        content,
        tags,
        isPublic,
        category,
        variables,
        templateId,
        metadata,
        wordCount,
        charCount,
        estimatedTokens,
        userId
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Prompt created successfully',
      prompt
    });

  } catch (error) {
    console.error('Error creating prompt:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create prompt'
    });
  }
});

// Update prompt
router.put('/:id', authenticateEither, updatePromptValidation, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    // Check if prompt exists
    const existingPrompt = await prisma.prompt.findUnique({
      where: { id }
    });

    if (!existingPrompt) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Prompt not found'
      });
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
      return res.status(403).json({
        error: 'Access Denied',
        message: existingPrompt.isPublic 
          ? 'Only admins can update public prompts that are not their own'
          : 'You can only update your own prompts'
      });
    }

    // Calculate content statistics if content is being updated
    if (updates.content) {
      const content = updates.content;
      updates.wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
      updates.charCount = content.length;
      updates.estimatedTokens = Math.ceil(content.length / 4);
    }

    const prompt = await prisma.prompt.update({
      where: { id },
      data: updates,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json({
      message: 'Prompt updated successfully',
      prompt
    });

  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update prompt'
    });
  }
});

// Delete prompt
router.delete('/:id', authenticateEither, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if prompt exists
    const existingPrompt = await prisma.prompt.findUnique({
      where: { id }
    });

    if (!existingPrompt) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Prompt not found'
      });
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
      return res.status(403).json({
        error: 'Access Denied',
        message: existingPrompt.isPublic 
          ? 'Only admins can delete public prompts that are not their own'
          : 'You can only delete your own prompts'
      });
    }

    await prisma.prompt.delete({
      where: { id }
    });

    res.json({
      message: 'Prompt deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting prompt:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete prompt'
    });
  }
});


module.exports = router;