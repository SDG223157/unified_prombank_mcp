const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authenticateApiToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

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

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        subscriptionTier: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.json(user);

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user profile'
    });
  }
});

// Get user's prompts
router.get('/prompts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, tags, search, page = 1, limit = 20 } = req.query;

    const where = { userId };

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

    const [prompts, total] = await Promise.all([
      prisma.prompt.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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
    console.error('Error fetching user prompts:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user prompts'
    });
  }
});

// Get user statistics - supports both JWT and API tokens
router.get('/stats', authenticateEither, async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      totalPrompts,
      publicPrompts,
      privatePrompts,
      totalViews
    ] = await Promise.all([
      prisma.prompt.count({ where: { userId } }),
      prisma.prompt.count({ where: { userId, isPublic: true } }),
      prisma.prompt.count({ where: { userId, isPublic: false } }),
      prisma.promptAnalytics.count({
        where: {
          prompt: { userId },
          eventType: 'view'
        }
      })
    ]);

    // Calculate subscription limits
    const subscriptionTier = req.user.subscriptionTier;
    const limits = {
      free: { maxPrompts: 5, features: ['basic'] },
      premium: { maxPrompts: -1, features: ['basic', 'collaboration', 'analytics'] },
      enterprise: { maxPrompts: -1, features: ['basic', 'collaboration', 'analytics', 'teams', 'sso'] }
    };

    res.json({
      stats: {
        totalPrompts,
        publicPrompts,
        privatePrompts,
        totalViews
      },
      subscription: {
        tier: subscriptionTier,
        limits: limits[subscriptionTier],
        usage: {
          prompts: totalPrompts,
          promptsRemaining: limits[subscriptionTier].maxPrompts === -1 
            ? 'unlimited' 
            : Math.max(0, limits[subscriptionTier].maxPrompts - totalPrompts)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user statistics'
    });
  }
});

module.exports = router;