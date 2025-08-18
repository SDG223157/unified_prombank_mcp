#!/bin/bash

# Unified Deployment Script for Prompt House Premium
# This script helps deploy the unified frontend + backend + MCP server setup

set -e

echo "🚀 Prompt House Premium - Unified Deployment"
echo "=============================================="

# Check if docker and docker-compose are available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Function to generate secrets
generate_secret() {
    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" 2>/dev/null || openssl rand -base64 32
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file with required variables..."
    
    echo "# Prompt House Premium - Unified Deployment Environment Variables" > .env
    echo "# Generated on $(date)" >> .env
    echo "" >> .env
    
    echo "# Database Configuration" >> .env
    echo "DATABASE_URL=mysql://mysql:rAfbZgINjUNdHCPYJr8TpX27fN8EnjaFrse0wBsrSgyJ3MT198qmk7ePmmNyshpH@mysql:3306/default" >> .env
    echo "" >> .env
    
    echo "# Security Secrets (auto-generated)" >> .env
    echo "JWT_SECRET=$(generate_secret)" >> .env
    echo "SESSION_SECRET=$(generate_secret)" >> .env
    echo "" >> .env
    
    echo "# Application URLs (UPDATE THESE)" >> .env
    echo "ALLOWED_ORIGINS=https://yourdomain.com" >> .env
    echo "FRONTEND_URL=https://yourdomain.com" >> .env
    echo "BACKEND_URL=https://yourdomain.com" >> .env
    echo "NEXT_PUBLIC_API_URL=https://yourdomain.com/api" >> .env
    echo "" >> .env
    
    echo "# Google OAuth (UPDATE THESE)" >> .env
    echo "GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com" >> .env
    echo "GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret" >> .env
    echo "GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback" >> .env
    echo "" >> .env
    
    echo "# MCP Server (OPTIONAL)" >> .env
    echo "# PROMPTHOUSE_ACCESS_TOKEN=your-mcp-access-token" >> .env
    echo "" >> .env
    
    echo "# Application Configuration" >> .env
    echo "NODE_ENV=production" >> .env
    echo "PORT=3000" >> .env
    echo "RATE_LIMIT_MAX_REQUESTS=100" >> .env
    echo "RATE_LIMIT_WINDOW_MS=900000" >> .env
    
    echo "✅ Created .env file with default values"
    echo "⚠️  Please update the Google OAuth and domain settings in .env"
fi

# Parse command line arguments
COMMAND=${1:-"help"}

case $COMMAND in
    "build")
        echo "🔨 Building unified application..."
        docker-compose -f docker-compose.unified.yml build --no-cache
        echo "✅ Build completed"
        ;;
    
    "up")
        echo "🚀 Starting unified application..."
        docker-compose -f docker-compose.unified.yml up -d
        echo "⏳ Waiting for services to start..."
        sleep 30
        echo "✅ Application started"
        echo "🌐 Application available at: http://localhost:3000"
        echo "🔗 API available at: http://localhost:3000/api"
        echo "🏥 Health check: http://localhost:3000/health"
        echo "📊 Check status with: $0 status"
        ;;
    
    "down")
        echo "🛑 Stopping unified application..."
        docker-compose -f docker-compose.unified.yml down
        echo "✅ Application stopped"
        ;;
    
    "restart")
        echo "🔄 Restarting unified application..."
        docker-compose -f docker-compose.unified.yml down
        docker-compose -f docker-compose.unified.yml up -d
        echo "⏳ Waiting for services to restart..."
        sleep 30
        echo "✅ Application restarted"
        ;;
    
    "logs")
        echo "📋 Showing application logs..."
        docker-compose -f docker-compose.unified.yml logs -f
        ;;
    
    "status")
        echo "📊 Application status:"
        docker-compose -f docker-compose.unified.yml ps
        echo ""
        echo "🔍 Health check:"
        curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health || echo "❌ Health check failed"
        ;;
    
    "clean")
        echo "🧹 Cleaning up containers and images..."
        docker-compose -f docker-compose.unified.yml down -v
        docker system prune -f
        echo "✅ Cleanup completed"
        ;;
    
    "help"|*)
        echo "Usage: $0 [COMMAND]"
        echo ""
        echo "Commands:"
        echo "  build    - Build the unified application"
        echo "  up       - Start the application"
        echo "  down     - Stop the application"
        echo "  restart  - Restart the application"
        echo "  logs     - Show application logs"
        echo "  status   - Show application status"
        echo "  clean    - Clean up containers and images"
        echo "  help     - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 build    # Build the application"
        echo "  $0 up       # Start the application"
        echo "  $0 logs     # View logs"
        echo ""
        echo "📝 Make sure to update .env file with your settings before starting!"
        ;;
esac
