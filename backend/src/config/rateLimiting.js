const rateLimit = require('express-rate-limit');

// Create rate limiting configuration for production
const createRateLimitConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Base configuration
  const config = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
      error: 'Too Many Requests',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip failed requests (don't count them against the limit)
    skipFailedRequests: true,
    // Skip successful requests (only count errors)
    skipSuccessfulRequests: false,
  };

  // Production-specific configuration for trusted proxies
  if (isProduction) {
    // For production with reverse proxy (Coolify), we need to properly configure
    // how to get the real client IP
    config.trustProxy = true;
    
    // Custom key generator that safely handles proxy headers
    config.keyGenerator = (req) => {
      // Get the real IP from headers set by the reverse proxy
      const forwarded = req.headers['x-forwarded-for'];
      const realIP = req.headers['x-real-ip'];
      const clientIP = req.ip;
      
      // Use the most reliable source of client IP
      let ip = clientIP;
      
      if (forwarded) {
        // x-forwarded-for can contain multiple IPs, use the first one
        ip = forwarded.split(',')[0].trim();
      } else if (realIP) {
        ip = realIP;
      }
      
      // Fallback to connection remote address if all else fails
      if (!ip || ip === '::1' || ip === '127.0.0.1') {
        ip = req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
      }
      
      // Log IP detection for debugging (only in production)
      if (process.env.DEBUG_RATE_LIMIT === 'true') {
        console.log(`Rate limit IP detection: ${ip} (forwarded: ${forwarded}, real: ${realIP}, client: ${clientIP})`);
      }
      
      return ip;
    };
    
    // Trust proxy is already configured above
    // Note: validate.xForwardedFor was removed in newer express-rate-limit versions
    
    console.log('🛡️  Rate limiting configured for production with proxy support');
  } else {
    // Development configuration
    config.trustProxy = false;
    console.log('🛡️  Rate limiting configured for development');
  }
  
  return config;
};

// Different rate limits for different endpoints
const createAPIRateLimit = () => {
  const config = createRateLimitConfig();
  return rateLimit(config);
};

const createAuthRateLimit = () => {
  const config = createRateLimitConfig();
  // Stricter limits for authentication endpoints
  config.windowMs = 15 * 60 * 1000; // 15 minutes
  config.max = 10; // Limit each IP to 10 requests per windowMs
  config.message = {
    error: 'Too Many Auth Attempts',
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: Math.ceil(config.windowMs / 1000)
  };
  return rateLimit(config);
};

module.exports = {
  createAPIRateLimit,
  createAuthRateLimit
}; 