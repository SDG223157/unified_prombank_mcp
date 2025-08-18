#!/bin/sh

# Startup script for unified Backend + Frontend + MCP Server deployment

echo "Starting Prompt House Premium Unified Service..."

# Function to handle shutdown gracefully
cleanup() {
    echo "Shutting down services..."
    kill $BACKEND_PID $MCP_PID 2>/dev/null
    wait $BACKEND_PID $MCP_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup TERM INT

# Wait for database to be ready (simplified approach)
echo "Waiting for database to be available..."

# Extract database connection details from DATABASE_URL for network test
DB_HOST_EXTRACTED=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT_EXTRACTED=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

echo "Testing network connectivity to database: ${DB_HOST_EXTRACTED}:${DB_PORT_EXTRACTED}"

# Simple network connectivity test with retry
RETRY_COUNT=0
MAX_RETRIES=${DATABASE_RETRY_ATTEMPTS:-12}
RETRY_DELAY=${DATABASE_RETRY_DELAY:-5000}

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if command -v nc >/dev/null 2>&1; then
        if nc -z "${DB_HOST_EXTRACTED}" "${DB_PORT_EXTRACTED}"; then
            echo "Database port ${DB_PORT_EXTRACTED} is accessible"
            echo "Skipping CLI database authentication test (Node.js will handle MySQL 8.0 auth)"
            break
        fi
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Network connectivity attempt $RETRY_COUNT/$MAX_RETRIES failed, retrying in ${RETRY_DELAY}ms..."
    sleep $((RETRY_DELAY / 1000))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "Failed to reach database port after $MAX_RETRIES attempts"
    echo "Database host: ${DB_HOST_EXTRACTED}:${DB_PORT_EXTRACTED}"
    echo "Proceeding anyway - Node.js application will handle database connection"
fi

# Additional startup delay if specified
if [ -n "$STARTUP_DELAY" ]; then
    echo "Waiting additional ${STARTUP_DELAY}s for services to stabilize..."
    sleep $STARTUP_DELAY
fi

# Generate Prisma client if needed and run database migrations
echo "Ensuring Prisma client is generated..."
cd /app/backend
echo "Current directory: $(pwd)"
echo "Checking if Prisma client exists..."
ls -la node_modules/.prisma/client/ || echo "Prisma client directory not found"
echo "Generating Prisma client..."
npx prisma generate --force-generate
echo "Verifying Prisma client after generation..."
ls -la node_modules/.prisma/client/ || echo "Prisma client still not found"
echo "Running database migrations..."
npx prisma migrate deploy

# Start the unified backend server (serves API + Frontend)
echo "Starting unified backend server on port $PORT..."
node src/index.js &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 5

# Start the MCP server (if MCP token is available)
if [ -n "$PROMPTHOUSE_ACCESS_TOKEN" ]; then
    echo "Starting MCP server..."
    export PROMPTHOUSE_API_URL="http://localhost:$PORT"
    cd /app/mcp-server && node dist/index.js &
    MCP_PID=$!
    echo "MCP server started with PID $MCP_PID"
else
    echo "No MCP access token found, skipping MCP server startup"
    MCP_PID=""
fi

echo "Backend server started with PID $BACKEND_PID"
echo "Services are running:"
echo "  - API available at http://localhost:$PORT/api"
echo "  - Frontend available at http://localhost:$PORT/"
echo "  - Health check at http://localhost:$PORT/health"
if [ -n "$MCP_PID" ]; then
    echo "  - MCP server running with PID $MCP_PID"
fi

# Wait for either process to exit
if [ -n "$MCP_PID" ]; then
    wait $BACKEND_PID $MCP_PID
else
    wait $BACKEND_PID
fi

# If we reach here, one of the processes died
echo "A service has stopped, shutting down..."
cleanup


