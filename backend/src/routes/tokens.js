const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Generate a secure API token
function generateApiToken() {
  // Generate a random token with format: prefix_randomString
  const prefix = crypto.randomBytes(4).toString('hex');
  const randomPart = crypto.randomBytes(20).toString('hex');
  return `${prefix}_${randomPart}`;
}

// Hash token for storage
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Validation rules for token creation
const createTokenValidation = [
  body('name').isLength({ min: 1, max: 100 }).withMessage('Token name must be 1-100 characters'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array'),
  body('expiresIn').optional().custom((value) => {
    // Allow null, undefined, empty string (never expires) or positive integers
    if (value === null || value === undefined || value === '' || value === 0) {
      return true;
    }
    if (!Number.isInteger(Number(value)) || Number(value) < 1) {
      throw new Error('Expiration must be a positive number of days or empty for never expires');
    }
    return true;
  })
];

// Create new API token
router.post('/', authenticateToken, createTokenValidation, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { name, permissions = ['read'], expiresIn } = req.body;
    const userId = req.user.id;

    // Validate permissions
    const validPermissions = ['read', 'write', 'admin'];
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        error: 'Invalid Permissions',
        message: `Invalid permissions: ${invalidPermissions.join(', ')}. Valid permissions are: ${validPermissions.join(', ')}`
      });
    }

    // Check if user already has too many tokens (limit to 10)
    const tokenCount = await prisma.apiToken.count({
      where: { userId, isActive: true }
    });

    if (tokenCount >= 10) {
      return res.status(400).json({
        error: 'Token Limit Reached',
        message: 'You can have a maximum of 10 active API tokens'
      });
    }

    // Generate token
    const rawToken = generateApiToken();
    const hashedToken = hashToken(rawToken);

    // Calculate expiration date
    let expiresAt = null;
    if (expiresIn && expiresIn !== '' && expiresIn > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(expiresIn));
    }

    // Create token in database
    const apiToken = await prisma.apiToken.create({
      data: {
        name,
        token: hashedToken,
        userId,
        permissions,
        expiresAt
      }
    });

    res.status(201).json({
      message: 'API token created successfully',
      token: {
        id: apiToken.id,
        name: apiToken.name,
        permissions: apiToken.permissions,
        createdAt: apiToken.createdAt,
        expiresAt: apiToken.expiresAt,
        // Return the raw token only on creation - this is the only time it's visible
        accessLink: rawToken,
        preview: `${rawToken.substring(0, 12)}...`
      },
      warning: 'Save this token securely - it cannot be viewed again!'
    });

  } catch (error) {
    console.error('Error creating API token:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create API token'
    });
  }
});

// List user's API tokens
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const tokens = await prisma.apiToken.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Don't return the actual token
        token: false
      },
      orderBy: { createdAt: 'desc' }
    });

    // Add preview and status for each token
    const tokensWithStatus = tokens.map(token => ({
      ...token,
      preview: '••••••••••••',
      status: token.isActive 
        ? (token.expiresAt && token.expiresAt < new Date() ? 'expired' : 'active')
        : 'inactive'
    }));

    res.json({
      tokens: tokensWithStatus,
      count: tokens.length
    });

  } catch (error) {
    console.error('Error fetching API tokens:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch API tokens'
    });
  }
});

// Update API token (name, permissions, active status)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, permissions, isActive } = req.body;
    const userId = req.user.id;

    // Check if token exists and belongs to user
    const existingToken = await prisma.apiToken.findFirst({
      where: { id, userId }
    });

    if (!existingToken) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'API token not found'
      });
    }

    // Validate permissions if provided
    if (permissions) {
      const validPermissions = ['read', 'write', 'admin'];
      const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          error: 'Invalid Permissions',
          message: `Invalid permissions: ${invalidPermissions.join(', ')}`
        });
      }
    }

    // Update token
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedToken = await prisma.apiToken.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'API token updated successfully',
      token: {
        ...updatedToken,
        preview: '••••••••••••',
        status: updatedToken.isActive 
          ? (updatedToken.expiresAt && updatedToken.expiresAt < new Date() ? 'expired' : 'active')
          : 'inactive'
      }
    });

  } catch (error) {
    console.error('Error updating API token:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update API token'
    });
  }
});

// Delete/Revoke API token
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if token exists and belongs to user
    const existingToken = await prisma.apiToken.findFirst({
      where: { id, userId }
    });

    if (!existingToken) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'API token not found'
      });
    }

    // Delete token
    await prisma.apiToken.delete({
      where: { id }
    });

    res.json({
      message: 'API token revoked successfully',
      tokenId: id
    });

  } catch (error) {
    console.error('Error deleting API token:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to revoke API token'
    });
  }
});

// Validate API token (for internal use by MCP server)
router.post('/validate', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Token is required'
      });
    }

    // Hash the provided token
    const hashedToken = hashToken(token);

    // Find the token in database
    const apiToken = await prisma.apiToken.findUnique({
      where: { token: hashedToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            subscriptionTier: true,
            isActive: true
          }
        }
      }
    });

    if (!apiToken) {
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'API token not found'
      });
    }

    // Check if token is active
    if (!apiToken.isActive) {
      return res.status(401).json({
        error: 'Token Inactive',
        message: 'API token has been deactivated'
      });
    }

    // Check if token is expired
    if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
      return res.status(401).json({
        error: 'Token Expired',
        message: 'API token has expired'
      });
    }

    // Check if user is active
    if (!apiToken.user.isActive) {
      return res.status(401).json({
        error: 'User Inactive',
        message: 'User account is not active'
      });
    }

    // Update last used timestamp
    await prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() }
    });

    res.json({
      valid: true,
      user: apiToken.user,
      permissions: apiToken.permissions,
      tokenId: apiToken.id
    });

  } catch (error) {
    console.error('Error validating API token:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to validate API token'
    });
  }
});

// Debug endpoint to check authentication status
router.get('/debug-auth', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    console.log('🔍 Debug Auth Check:');
    console.log('- Auth Header:', authHeader ? 'Present' : 'Missing');
    console.log('- Token:', token ? `${token.substring(0, 20)}...` : 'Missing');
    
    if (!token) {
      return res.json({
        status: 'no_token',
        message: 'No authorization token provided',
        authHeader: authHeader || 'missing'
      });
    }

    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('- Decoded JWT:', decoded);
      
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const user = await prisma.user.findUnique({
        where: { 
          id: decoded.userId,
          isActive: true 
        },
        select: {
          id: true,
          email: true,
          subscriptionTier: true,
          isActive: true
        }
      });
      
      console.log('- User found:', user ? 'Yes' : 'No');
      
      if (!user) {
        return res.json({
          status: 'invalid_user',
          message: 'User not found or inactive',
          userId: decoded.userId
        });
      }
      
      return res.json({
        status: 'authenticated',
        message: 'Authentication successful',
        user: user
      });
      
    } catch (jwtError) {
      console.log('- JWT Error:', jwtError.message);
      return res.json({
        status: 'invalid_token',
        message: 'Invalid or expired token',
        error: jwtError.message
      });
    }
    
  } catch (error) {
    console.error('Debug auth error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Debug check failed',
      error: error.message
    });
  }
});

module.exports = router; 