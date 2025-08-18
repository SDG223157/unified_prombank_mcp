#!/bin/sh

# Startup script for Unified Python Prompt House Premium

echo "🐍 Starting Prompt House Premium - Unified Python Application..."

# Function to handle shutdown gracefully
cleanup() {
    echo "Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup TERM INT

# Wait for database to be ready
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
            echo "✅ Database port ${DB_PORT_EXTRACTED} is accessible"
            break
        fi
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Network connectivity attempt $RETRY_COUNT/$MAX_RETRIES failed, retrying in ${RETRY_DELAY}ms..."
    sleep $((RETRY_DELAY / 1000))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "⚠️  Failed to reach database port after $MAX_RETRIES attempts"
    echo "Database host: ${DB_HOST_EXTRACTED}:${DB_PORT_EXTRACTED}"
    echo "Proceeding anyway - Python application will handle database connection"
fi

# Additional startup delay if specified
if [ -n "$STARTUP_DELAY" ]; then
    echo "Waiting additional ${STARTUP_DELAY}s for services to stabilize..."
    sleep $STARTUP_DELAY
fi

# Start the unified Python application
echo "🚀 Starting unified Python backend server on port $PORT..."
python main.py &
BACKEND_PID=$!

echo "✅ Python backend server started with PID $BACKEND_PID"
echo "🌐 Services are running:"
echo "  - Frontend available at http://localhost:$PORT/"
echo "  - API available at http://localhost:$PORT/api"
echo "  - Health check at http://localhost:$PORT/health"
echo "  - Dashboard at http://localhost:$PORT/dashboard"
echo "  - Prompts at http://localhost:$PORT/prompts"

# Wait for the process to exit
wait $BACKEND_PID

# If we reach here, the process died
echo "❌ Python application has stopped, shutting down..."
cleanup
