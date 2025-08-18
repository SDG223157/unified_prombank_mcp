const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Hash token for storage (same as in tokens.js)
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication Error',
      message: 'Access token required' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.userId,
        isActive: true 
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        subscriptionTier: true,
        isActive: true
      }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication Error',
        message: 'Invalid or expired token' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ 
      error: 'Authentication Error',
      message: 'Invalid or expired token' 
    });
  }
};

// NEW: API Token Authentication Middleware
const authenticateApiToken = async (req, res, next) => {
  // Try multiple ways to get the API token
  let token = null;
  
  // 1. Authorization header (Bearer format)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  
  // 2. Custom header
  if (!token && req.headers['x-api-token']) {
    token = req.headers['x-api-token'];
  }
  
  // 3. Query parameter
  if (!token && req.query.token) {
    token = req.query.token;
  }
  
  // 4. Request body
  if (!token && req.body && req.body.token) {
    token = req.body.token;
  }

  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication Error',
      message: 'API token required' 
    });
  }

  try {
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
        error: 'Authentication Error',
        message: 'Invalid API token'
      });
    }

    // Check if token is active
    if (!apiToken.isActive) {
      return res.status(401).json({
        error: 'Authentication Error',
        message: 'API token has been deactivated'
      });
    }

    // Check if token is expired
    if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
      return res.status(401).json({
        error: 'Authentication Error',
        message: 'API token has expired'
      });
    }

    // Check if user is active
    if (!apiToken.user.isActive) {
      return res.status(401).json({
        error: 'Authentication Error',
        message: 'User account is not active'
      });
    }

    // Update last used timestamp
    await prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() }
    });

    // Set user data (same format as JWT middleware)
    req.user = apiToken.user;
    req.apiToken = apiToken; // Additional API token info if needed
    next();

  } catch (error) {
    console.error('API token verification error:', error);
    return res.status(401).json({ 
      error: 'Authentication Error',
      message: 'Invalid API token' 
    });
  }
};

const requireSubscription = (requiredTier) => {
  const tierLevels = {
    'free': 0,
    'premium': 1,
    'enterprise': 2
  };

  return (req, res, next) => {
    const userTier = req.user.subscriptionTier;
    const userLevel = tierLevels[userTier] || 0;
    const requiredLevel = tierLevels[requiredTier] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Subscription Required',
        message: `This feature requires a ${requiredTier} subscription`,
        currentTier: userTier,
        requiredTier: requiredTier
      });
    }

    next();
  };
};

const checkPromptLimits = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const subscriptionTier = req.user.subscriptionTier;

    // Define limits per tier
    const limits = {
      free: 5,
      premium: -1, // unlimited
      enterprise: -1 // unlimited
    };

    const userLimit = limits[subscriptionTier];

    // If unlimited, skip check
    if (userLimit === -1) {
      return next();
    }

    // Count user's existing prompts
    const promptCount = await prisma.prompt.count({
      where: { userId }
    });

    if (promptCount >= userLimit) {
      return res.status(403).json({
        error: 'Limit Exceeded',
        message: `You have reached the maximum number of prompts (${userLimit}) for your ${subscriptionTier} subscription`,
        currentCount: promptCount,
        limit: userLimit,
        upgradeRequired: true
      });
    }

    next();
  } catch (error) {
    console.error('Error checking prompt limits:', error);
    next(error);
  }
};

module.exports = {
  authenticateToken,
  authenticateApiToken,
  requireSubscription,
  checkPromptLimits
};