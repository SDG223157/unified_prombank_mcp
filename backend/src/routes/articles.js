const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { getDatabase } = require('../database');
const { authenticateToken, authenticateApiToken } = require('../middleware/auth');

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

// Helper function to calculate word and character counts
const calculateCounts = (content) => {
  const charCount = content.length;
  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  return { wordCount, charCount };
};

// Validation rules
const createArticleValidation = [
  body('title').isLength({ min: 1, max: 500 }).withMessage('Title must be 1-500 characters'),
  body('content').isLength({ min: 1 }).withMessage('Content is required'),
  body('category').optional().isLength({ max: 100 }).withMessage('Category must be max 100 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('promptId').optional().isString().withMessage('Prompt ID must be a string'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object')
];

const updateArticleValidation = [
  body('title').optional().isLength({ min: 1, max: 500 }),
  body('content').optional().isLength({ min: 1 }),
  body('category').optional().isLength({ max: 100 }),
  body('tags').optional().isArray(),
  body('metadata').optional().isObject()
];

// List articles with pagination and sorting
router.get('/', 
  authenticateEither,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('sortBy').optional().isIn(['title', 'category', 'createdAt', 'updatedAt']).withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
    query('category').optional().isString().withMessage('Category must be a string'),
    query('search').optional().isString().withMessage('Search must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          details: errors.array()
        });
      }

      const prisma = await getPrisma();
      const userId = req.user.id;

      // Parse query parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const sortBy = req.query.sortBy || 'createdAt';
      const sortOrder = req.query.sortOrder || 'desc';
      const category = req.query.category;
      const search = req.query.search;
      const skip = (page - 1) * limit;

      // Build where clause
      const where = {
        userId: userId
      };

      if (category) {
        where.category = category;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Get articles with pagination
      const [articles, totalCount] = await Promise.all([
        prisma.article.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            prompt: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }),
        prisma.article.count({ where })
      ]);

      // Get unique categories for filtering
      const categories = await prisma.article.findMany({
        where: { userId },
        select: { category: true },
        distinct: ['category']
      });

      const uniqueCategories = categories
        .map(c => c.category)
        .filter(Boolean)
        .sort();

      res.json({
        articles,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        },
        categories: uniqueCategories
      });

    } catch (error) {
      console.error('Error fetching articles:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch articles'
      });
    }
  }
);

// Get single article
router.get('/:id', authenticateEither, async (req, res) => {
  try {
    const prisma = await getPrisma();
    const userId = req.user.id;
    const articleId = req.params.id;

    const article = await prisma.article.findFirst({
      where: {
        id: articleId,
        userId: userId
      },
      include: {
        prompt: {
          select: {
            id: true,
            title: true,
            description: true
          }
        }
      }
    });

    if (!article) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Article not found'
      });
    }

    res.json(article);

  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch article'
    });
  }
});

// Create new article
router.post('/', 
  authenticateEither,
  createArticleValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          details: errors.array()
        });
      }

      const prisma = await getPrisma();
      const userId = req.user.id;
      
      const { title, content, category, tags = [], promptId, metadata = {} } = req.body;

      // Calculate word and character counts
      const { wordCount, charCount } = calculateCounts(content);

      // Verify prompt exists and belongs to user if promptId is provided
      if (promptId) {
        const prompt = await prisma.prompt.findFirst({
          where: {
            id: promptId,
            userId: userId
          }
        });

        if (!prompt) {
          return res.status(400).json({
            error: 'Invalid Prompt',
            message: 'Prompt not found or does not belong to user'
          });
        }
      }

      const article = await prisma.article.create({
        data: {
          title,
          content,
          category,
          tags,
          promptId,
          userId,
          wordCount,
          charCount,
          metadata
        },
        include: {
          prompt: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      res.status(201).json(article);

    } catch (error) {
      console.error('Error creating article:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create article'
      });
    }
  }
);

// Update article
router.put('/:id',
  authenticateEither,
  updateArticleValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          details: errors.array()
        });
      }

      const prisma = await getPrisma();
      const userId = req.user.id;
      const articleId = req.params.id;

      // Check if article exists and belongs to user
      const existingArticle = await prisma.article.findFirst({
        where: {
          id: articleId,
          userId: userId
        }
      });

      if (!existingArticle) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Article not found'
        });
      }

      const { title, content, category, tags, metadata } = req.body;
      const updateData = {};

      if (title !== undefined) updateData.title = title;
      if (content !== undefined) {
        updateData.content = content;
        const { wordCount, charCount } = calculateCounts(content);
        updateData.wordCount = wordCount;
        updateData.charCount = charCount;
      }
      if (category !== undefined) updateData.category = category;
      if (tags !== undefined) updateData.tags = tags;
      if (metadata !== undefined) updateData.metadata = metadata;

      const article = await prisma.article.update({
        where: { id: articleId },
        data: updateData,
        include: {
          prompt: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      res.json(article);

    } catch (error) {
      console.error('Error updating article:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update article'
      });
    }
  }
);

// Delete article
router.delete('/:id', authenticateEither, async (req, res) => {
  try {
    const prisma = await getPrisma();
    const userId = req.user.id;
    const articleId = req.params.id;

    // Check if article exists and belongs to user
    const existingArticle = await prisma.article.findFirst({
      where: {
        id: articleId,
        userId: userId
      }
    });

    if (!existingArticle) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Article not found'
      });
    }

    await prisma.article.delete({
      where: { id: articleId }
    });

    res.json({
      success: true,
      message: 'Article deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete article'
    });
  }
});

// Get article statistics
router.get('/stats/overview', authenticateEither, async (req, res) => {
  try {
    const prisma = await getPrisma();
    const userId = req.user.id;

    const [totalCount, categoryStats, recentArticles] = await Promise.all([
      prisma.article.count({ where: { userId } }),
      
      prisma.article.groupBy({
        by: ['category'],
        where: { userId },
        _count: { category: true }
      }),
      
      prisma.article.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          category: true,
          createdAt: true,
          wordCount: true
        }
      })
    ]);

    const totalWords = await prisma.article.aggregate({
      where: { userId },
      _sum: { wordCount: true }
    });

    res.json({
      totalArticles: totalCount,
      totalWords: totalWords._sum.wordCount || 0,
      categoryBreakdown: categoryStats.map(stat => ({
        category: stat.category || 'Uncategorized',
        count: stat._count.category
      })),
      recentArticles
    });

  } catch (error) {
    console.error('Error fetching article stats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch article statistics'
    });
  }
});

module.exports = router;
