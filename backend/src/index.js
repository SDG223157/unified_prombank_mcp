require('dotenv').config();

// Ensure Prisma client is generated before importing database
const { execSync } = require('child_process');
console.log('🔧 Ensuring Prisma client is generated...');
try {
  execSync('npx prisma generate --force-generate', { 
    cwd: __dirname + '/../',
    stdio: 'inherit'
  });
  console.log('✅ Prisma client generated successfully');
} catch (error) {
  console.log('❌ Prisma generation failed:', error.message);
  console.log('Attempting to continue with existing client...');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { getDatabase, connectWithRetry } = require('./database');

const authRoutes = require('./routes/auth');
const promptRoutes = require('./routes/prompts');
const userRoutes = require('./routes/user');
const teamRoutes = require('./routes/teams');
const tokenRoutes = require('./routes/tokens');
const migrateRoutes = require('./routes/migrate');
const passport = require('./config/passport');
const { getSessionConfig } = require('./config/session');
const { createAPIRateLimit, createAuthRateLimit } = require('./config/rateLimiting');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - required for rate limiting behind reverse proxy (Coolify)
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      formAction: ["'self'", "https://accounts.google.com"],
    },
  },
}));

// Rate limiting
const apiLimiter = createAPIRateLimit();
const authLimiter = createAuthRateLimit();
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : true,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware for OAuth
app.use(session(getSessionConfig()));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/user', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/migrate', migrateRoutes);

// Serve frontend static files from the unified build
const frontendBuildPath = path.join(__dirname, '../../frontend/.next');
const frontendPublicPath = path.join(__dirname, '../../frontend/public');

// Check if frontend build exists
const frontendExists = fs.existsSync(frontendBuildPath) && fs.existsSync(frontendPublicPath);

if (frontendExists) {
  // Serve static files from Next.js build
  app.use('/_next', express.static(path.join(frontendBuildPath)));
  app.use('/static', express.static(path.join(frontendBuildPath, 'static')));
  app.use(express.static(frontendPublicPath));
  console.log('🌐 Serving frontend from unified build:', frontendBuildPath);
} else {
  console.log('⚠️  Frontend build not found, running in API-only mode');
}

// Handle frontend routing (SPA fallback)
app.get('*', (req, res) => {
  // Don't serve index.html for API routes that don't exist
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.path} not found`
    });
  }
  
  // If frontend build exists, serve the appropriate page
  if (frontendExists) {
    // For Next.js static export, serve index.html for all non-API routes
    const indexPath = path.join(frontendBuildPath, 'server/pages/index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Fallback to basic index.html
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Prompt House Premium</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body>
            <div id="__next">
              <h1>Prompt House Premium</h1>
              <p>Frontend is loading... If this persists, the build may be incomplete.</p>
              <p><a href="/api/health">Check API Health</a></p>
            </div>
          </body>
        </html>
      `);
    }
  } else {
    // Frontend build doesn't exist, redirect to external frontend URL
    const frontendURL = process.env.FRONTEND_URL || 'https://prombank.app';
    if (req.path === '/') {
      res.redirect(frontendURL);
    } else {
      res.redirect(`${frontendURL}${req.path}`);
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.type === 'validation') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details
    });
  }
  
  if (err.type === 'authentication') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: err.message
    });
  }
  
  if (err.type === 'authorization') {
    return res.status(403).json({
      error: 'Authorization Error',
      message: err.message
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `API route ${req.path} not found`
  });
});

// Initialize database connection and start server
const startServer = async () => {
  try {
    console.log('🗄️ Initializing database connection...');
    await connectWithRetry();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Prompt House Premium API server running on port ${PORT}`);
      console.log(`📊 Health check available at http://localhost:${PORT}/health`);
      console.log(`🌐 Frontend available at http://localhost:${PORT}/`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️ Database: Connected with retry logic`);
      console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'Missing'}`);
      console.log(`🌍 CORS Origins: ${process.env.ALLOWED_ORIGINS || 'None set'}`);
    });
  } catch (error) {
    console.error('❌ Failed to initialize database connection:', error);
    console.error('🛑 Server startup failed');
    process.exit(1);
  }
};

startServer();
