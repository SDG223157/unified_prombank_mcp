# Prompt House Premium - Unified Deployment

A comprehensive prompt management platform with advanced features for AI enthusiasts and professionals. This version combines Backend API, Frontend, and MCP Server into a single unified deployment optimized for Coolify.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Unified Application                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Backend API Server                         │ │
│  │              (Express.js)                              │ │
│  │                                                         │ │
│  │  • Serves API endpoints (/api/*)                       │ │
│  │  • Serves frontend static files                        │ │
│  │  • Handles authentication (Google OAuth)               │ │
│  │  • Database operations (Prisma + MySQL)                │ │
│  │  • Session management                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              MCP Server (Optional)                      │ │
│  │              (Model Context Protocol)                   │ │
│  │                                                         │ │
│  │  • AI integration for prompt management                 │ │
│  │  • Tool interface for external AI systems              │ │
│  │  • Runs alongside main server                           │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Features

- **Unified Deployment**: Single container with all components
- **Prompt Management**: Create, edit, and organize AI prompts  
- **Advanced Editor**: Rich text editor with syntax highlighting
- **Team Collaboration**: Share prompts with team members
- **Search & Filter**: Powerful search capabilities
- **Google OAuth**: Secure authentication
- **MCP Integration**: AI tool integration (optional)
- **Production Ready**: Optimized for Coolify deployment

## 🚀 Quick Deployment

### Coolify Deployment (Recommended)

1. **Set up repository** in Coolify with these files:
   - `Dockerfile.unified` - Main dockerfile
   - `docker-compose.unified.yml` - Service configuration
   - `startup.sh` - Service orchestration

2. **Configure environment variables** (see `UNIFIED_DEPLOYMENT_GUIDE.md`)

3. **Deploy** and access your application!

### Local Development

```bash
# Install all dependencies
npm run install:all

# Start development environment
npm run dev

# Or start individual services
npm run dev:backend    # Backend API server
npm run dev:frontend   # Next.js frontend
npm run dev:mcp       # MCP server
```

### Local Production Testing

```bash
# Build and start unified application
./deploy-unified.sh build
./deploy-unified.sh up

# Check status
./deploy-unified.sh status

# View logs
./deploy-unified.sh logs

# Stop services  
./deploy-unified.sh down
```

## 📁 Project Structure

```
prompt-house-premium/
├── backend/                 # Express.js API server
│   ├── src/                # Server source code
│   ├── prisma/             # Database schema & migrations
│   └── package.json        # Backend dependencies
├── frontend/               # Next.js React application  
│   ├── src/                # Frontend source code
│   └── package.json        # Frontend dependencies
├── mcp-server/             # MCP server for AI integration
│   ├── src/                # MCP server source
│   └── package.json        # MCP dependencies
├── Dockerfile.unified      # Unified production dockerfile
├── docker-compose.unified.yml  # Production services
├── startup.sh              # Service orchestration script
├── deploy-unified.sh       # Deployment management
├── coolify-unified.json    # Coolify configuration
├── package.json            # Root workspace configuration
└── UNIFIED_DEPLOYMENT_GUIDE.md  # Comprehensive deployment guide
```

## 🔧 Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=mysql://user:password@host:3306/database

# Security  
JWT_SECRET=your-jwt-secret-base64
SESSION_SECRET=your-session-secret-base64

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

# Application URLs
ALLOWED_ORIGINS=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com  
BACKEND_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# Optional: MCP Server
PROMPTHOUSE_ACCESS_TOKEN=your-mcp-token
```

## 📊 Service Endpoints

- **Frontend**: `https://yourdomain.com/`
- **API**: `https://yourdomain.com/api`
- **Health Check**: `https://yourdomain.com/health`
- **Authentication**: `https://yourdomain.com/api/auth/google`

## 📖 Documentation

- **[Unified Deployment Guide](UNIFIED_DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[Coolify Configuration](coolify-unified.json)** - Platform-specific settings
- **[Frontend README](frontend/README.md)** - Frontend-specific documentation

## 🛠️ Development Commands

```bash
# Workspace management
npm run install:all         # Install all dependencies
npm run build               # Build all components  
npm run dev                 # Start all dev servers

# Deployment management
./deploy-unified.sh build   # Build production image
./deploy-unified.sh up      # Start services
./deploy-unified.sh down    # Stop services
./deploy-unified.sh logs    # View logs
./deploy-unified.sh status  # Check health
```

## 🔐 Security Features

- **HTTPS/SSL** required for production
- **CORS protection** with configurable origins
- **Rate limiting** on API endpoints
- **Secure session cookies** with HTTP-only flag
- **Google OAuth** for authentication
- **Environment-based secrets** management

## 📈 Production Features

- **Health monitoring** with built-in endpoints
- **Database migrations** run automatically on startup
- **Graceful shutdown** handling
- **Resource optimization** with multi-stage builds
- **Container orchestration** with proper service dependencies
- **Backup support** for database and configuration

## 🆘 Support

For deployment issues:

1. Check the **[Unified Deployment Guide](UNIFIED_DEPLOYMENT_GUIDE.md)**
2. Verify **environment variables** are set correctly  
3. Test the **health endpoint**: `/health`
4. Review **application logs** via Coolify or Docker
5. Ensure **database connectivity** and migrations

## 📄 License

MIT License - see LICENSE file for details

---

**Ready for production deployment on Coolify with a single unified container! 🚀**