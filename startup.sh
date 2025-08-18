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

# Wait for database to be ready (with retry logic)
echo "Waiting for database connection..."
RETRY_COUNT=0
MAX_RETRIES=${DATABASE_RETRY_ATTEMPTS:-12}
RETRY_DELAY=${DATABASE_RETRY_DELAY:-5000}

# Extract database connection details from DATABASE_URL
DB_HOST_EXTRACTED=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT_EXTRACTED=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_USER_EXTRACTED=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS_EXTRACTED=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_NAME_EXTRACTED=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Connecting to database: ${DB_HOST_EXTRACTED}:${DB_PORT_EXTRACTED}"

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # Try using mysql command directly with extracted credentials
    if mysql -h"${DB_HOST_EXTRACTED}" -P"${DB_PORT_EXTRACTED}" -u"${DB_USER_EXTRACTED}" -p"${DB_PASS_EXTRACTED}" -e "SELECT 1" "${DB_NAME_EXTRACTED}" >/dev/null 2>&1; then
        echo "Database connection established"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Database connection attempt $RETRY_COUNT/$MAX_RETRIES failed, retrying in ${RETRY_DELAY}ms..."
    sleep $((RETRY_DELAY / 1000))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "Failed to connect to database after $MAX_RETRIES attempts"
    echo "Database URL: mysql://${DB_USER_EXTRACTED}:****@${DB_HOST_EXTRACTED}:${DB_PORT_EXTRACTED}/${DB_NAME_EXTRACTED}"
    exit 1
fi

# Additional startup delay if specified
if [ -n "$STARTUP_DELAY" ]; then
    echo "Waiting additional ${STARTUP_DELAY}s for services to stabilize..."
    sleep $STARTUP_DELAY
fi

# Run database migrations
echo "Running database migrations..."
cd /app/backend && npx prisma migrate deploy

# Start the unified backend server (serves API + Frontend)
echo "Starting unified backend server on port $PORT..."
cd /app/backend && node src/index.js &
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


