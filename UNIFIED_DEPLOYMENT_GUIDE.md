# Unified Deployment Guide - Prompt House Premium

This guide covers deploying the unified Prompt House Premium application that combines:
- **Backend API** (Express.js with Prisma ORM)
- **Frontend** (Next.js React application)  
- **MCP Server** (Model Context Protocol server for AI integration)

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Coolify Deployment                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │     MySQL 8         │    │    Unified Application      │ │
│  │   (Database)        │    │                             │ │
│  │                     │    │  ┌─────────────────────────┐ │ │
│  │  - User data        │◄───┤  │   Backend API Server    │ │ │
│  │  - Prompts          │    │  │   (Express.js)          │ │ │
│  │  - Sessions         │    │  │                         │ │ │
│  │  - OAuth tokens     │    │  │  - Serves API routes    │ │ │
│  └─────────────────────┘    │  │  - Serves frontend      │ │ │
│                             │  │  - Handles auth         │ │ │
│                             │  │  - Database connection  │ │ │
│                             │  └─────────────────────────┘ │ │
│                             │                             │ │
│                             │  ┌─────────────────────────┐ │ │
│                             │  │    MCP Server           │ │ │
│                             │  │   (Optional)            │ │ │
│                             │  │                         │ │ │
│                             │  │  - AI integration       │ │ │
│                             │  │  - Prompt management    │ │ │
│                             │  │  - Tool interface       │ │ │
│                             │  └─────────────────────────┘ │ │
│                             └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Coolify Deployment

### 1. Repository Setup

1. **Fork or clone** the repository to your Git provider
2. **Ensure the unified files** are in your repository:
   - `Dockerfile.unified`
   - `docker-compose.unified.yml`
   - `startup.sh`
   - `package.json` (root level)

### 2. Coolify Configuration

#### Resource Creation
1. Create a new **Resource** in Coolify
2. Select **Docker Compose** as the deployment type
3. Set **Git Repository** to your repository URL
4. Set **Branch** to your deployment branch (e.g., `main` or `clean-deployment`)

#### Build Configuration
- **Dockerfile Path**: `Dockerfile.unified`
- **Docker Compose File**: `docker-compose.unified.yml`
- **Build Context**: `.` (root directory)

### 3. Environment Variables

Set these environment variables in Coolify:

#### 🔐 Security & Authentication
```bash
JWT_SECRET=your-jwt-secret-base64-encoded
SESSION_SECRET=your-session-secret-base64-encoded
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

#### 🌐 URLs & CORS
```bash
ALLOWED_ORIGINS=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
CORS_ORIGIN=https://yourdomain.com
```

#### 🗄️ Database Configuration
```bash
DATABASE_URL=mysql://mysql:your-db-password@mysql:3306/default
DATABASE_RETRY_ATTEMPTS=12
DATABASE_RETRY_DELAY=5000
DB_CONNECTION_TIMEOUT=60000
DB_HOST=mysql
DB_USER=mysql
DB_PASSWORD=your-db-password
```

#### ⚙️ Application Settings
```bash
NODE_ENV=production
PORT=3000
TRUST_PROXY=true
STARTUP_DELAY=30
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
PRISMA_CONNECTION_LIMIT=10
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
```

#### 🤖 MCP Server (Optional)
```bash
PROMPTHOUSE_API_URL=http://localhost:3000
PROMPTHOUSE_ACCESS_TOKEN=your-mcp-access-token
```

### 4. Database Setup

The MySQL database will be automatically created by the Docker Compose configuration. The application will:

1. **Wait for database** to be ready (with retry logic)
2. **Run migrations** automatically on startup
3. **Generate Prisma client** during build

### 5. SSL/TLS Configuration

In Coolify:
1. **Enable SSL** for your domain
2. **Configure custom domain** to point to your Coolify instance
3. **Update environment variables** with your actual domain

### 6. Health Checks

The application includes built-in health monitoring:
- **Health endpoint**: `https://yourdomain.com/health`
- **Docker health check**: Built into the container
- **Database connectivity**: Verified on startup

## 🔧 Local Development

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MySQL (or use Docker)

### Setup
```bash
# Clone repository
git clone <your-repo-url>
cd prompt-house-premium

# Install dependencies for all components
npm run install:all

# Start development environment
npm run dev
```

### Build and Test Locally
```bash
# Build unified application
./deploy-unified.sh build

# Start services
./deploy-unified.sh up

# Check status
./deploy-unified.sh status

# View logs
./deploy-unified.sh logs

# Stop services
./deploy-unified.sh down
```

## 📊 Monitoring & Maintenance

### Service Endpoints
- **Frontend**: `https://yourdomain.com/`
- **API**: `https://yourdomain.com/api`
- **Health Check**: `https://yourdomain.com/health`
- **Google OAuth**: `https://yourdomain.com/api/auth/google`

### Log Monitoring
```bash
# Via Coolify dashboard - check container logs
# Via CLI (if you have access):
docker-compose -f docker-compose.unified.yml logs -f app
```

### Database Maintenance
- **Migrations**: Run automatically on deployment
- **Backups**: Configure through Coolify or external service
- **Monitoring**: Use Coolify's built-in database monitoring

## 🛠️ Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database status
docker-compose -f docker-compose.unified.yml ps mysql

# Check database logs
docker-compose -f docker-compose.unified.yml logs mysql

# Verify connection
docker-compose -f docker-compose.unified.yml exec app mysqladmin ping -h mysql -u mysql -p
```

#### 2. Frontend Not Loading
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check that frontend build completed successfully
- Ensure static files are being served properly

#### 3. MCP Server Issues
- Verify `PROMPTHOUSE_ACCESS_TOKEN` is set
- Check MCP server logs in application logs
- Ensure API connectivity between services

#### 4. OAuth Issues
- Verify Google OAuth credentials
- Check callback URLs match exactly
- Ensure HTTPS is properly configured

### Debug Commands
```bash
# Check service health
curl https://yourdomain.com/health

# Test API endpoint
curl https://yourdomain.com/api/prompts

# Check Google OAuth config
curl https://yourdomain.com/api/auth/google
```

## 🔄 Updates & Deployments

### Automatic Deployments
1. **Push changes** to your repository
2. **Coolify auto-deploys** on git push (if configured)
3. **Health checks** verify successful deployment

### Manual Deployments
1. **Trigger rebuild** in Coolify dashboard
2. **Monitor deployment** logs
3. **Verify health** endpoints

## 📋 Checklist

Before deployment, ensure:

- [ ] All environment variables are set in Coolify
- [ ] Google OAuth is configured with correct callback URLs
- [ ] Domain is properly configured with SSL
- [ ] Database credentials are secure
- [ ] JWT and session secrets are generated securely
- [ ] CORS origins match your domain
- [ ] Health check endpoint is accessible

## 🆘 Support

If you encounter issues:

1. **Check Coolify logs** for deployment errors
2. **Verify environment variables** are set correctly
3. **Test health endpoint** for basic connectivity
4. **Check database connectivity** and migrations
5. **Verify OAuth configuration** with Google

## 🔐 Security Considerations

- **Use strong secrets** for JWT and sessions
- **Enable HTTPS** for all communications
- **Restrict CORS origins** to your domain only
- **Keep OAuth secrets** secure and rotated
- **Monitor access logs** regularly
- **Update dependencies** regularly for security patches

---

This unified deployment provides a production-ready, scalable solution for Prompt House Premium with all components integrated into a single, manageable deployment.