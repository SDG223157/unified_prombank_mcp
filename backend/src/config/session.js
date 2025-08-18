const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { PrismaClient } = require('@prisma/client');

// Create MySQL session store for production
const createSessionStore = () => {
  if (process.env.NODE_ENV === 'production') {
    // Parse DATABASE_URL for MySQL connection
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL is required for production session storage');
    }
    
    // Extract connection details from DATABASE_URL
    // Format: mysql://user:password@host:port/database
    const urlParts = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!urlParts) {
      throw new Error('Invalid DATABASE_URL format');
    }
    
    const [, user, password, host, port, database] = urlParts;
    
    const options = {
      host: host,
      port: parseInt(port),
      user: user,
      password: password,
      database: database,
      createDatabaseTable: true,
      schema: {
        tableName: 'sessions',
        columnNames: {
          session_id: 'session_id',
          expires: 'expires',
          data: 'data'
        }
      }
    };
    
    console.log('🗄️  Using MySQL session store for production');
    return new MySQLStore(options);
  }
  
  // Use default MemoryStore for development
  console.log('⚠️  Using MemoryStore for development - not suitable for production');
  return null; // Will use default MemoryStore
};

// Session configuration
const getSessionConfig = () => {
  const store = createSessionStore();
  
  return {
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000, // 10 minutes (short-lived for OAuth only)
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    },
    name: 'oauth.session'
  };
};

module.exports = { getSessionConfig }; 