const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const passport = require('../config/passport');

const router = express.Router();
const prisma = new PrismaClient();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').optional().isLength({ min: 1, max: 50 }),
  body('lastName').optional().isLength({ min: 1, max: 50 })
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Register new user
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Registration Error',
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        subscriptionTier: 'free'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        subscriptionTier: true,
        createdAt: true
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register user'
    });
  }
});

// Login user
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email, isActive: true }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Authentication Error',
        message: 'Invalid email or password'
      });
    }

    // Check if user has a password (local auth) or is OAuth user
    if (!user.passwordHash) {
      return res.status(401).json({
        error: 'Authentication Error',
        message: 'This account uses social login. Please sign in with Google.'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Authentication Error',
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login'
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication Error',
        message: 'Refresh token required'
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is active
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
        subscriptionTier: true
      }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Authentication Error',
        message: 'Invalid token'
      });
    }

    // Generate new token
    const newToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Token refreshed successfully',
      user,
      token: newToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid or expired token'
    });
  }
});

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login?error=oauth_failed' }),
  async (req, res) => {
    try {
      // Generate JWT token for the authenticated user
      const token = jwt.sign(
        { userId: req.user.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Remove sensitive data
      const { passwordHash, ...userWithoutPassword } = req.user;

      // Redirect to frontend with token
      const frontendURL = process.env.FRONTEND_URL || 'https://prombank.app';
      const redirectURL = `${frontendURL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userWithoutPassword))}`;
      
      res.redirect(redirectURL);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect('/auth/login?error=oauth_callback_failed');
    }
  }
);

// Google OAuth success endpoint (for frontend to call)
router.get('/google/success', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Not authenticated'
    });
  }

  try {
    // Generate JWT token
    const token = jwt.sign(
      { userId: req.user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove sensitive data
    const { passwordHash, ...userWithoutPassword } = req.user;

    res.json({
      message: 'Google authentication successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Google OAuth success error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to complete authentication'
    });
  }
});

module.exports = router;