# How to Run the Security Test

## Option 1: Direct Python Execution (Local)

If you're running locally:

```bash
# From the project root
python3 test_token_security.py

# Or use the Docker-friendly version
python3 test_token_security_docker.py --url http://localhost:8000
```

## Option 2: From Docker Container

If you're running inside a Docker container:

```bash
# If your container mounts the project as /app
cd /app
python3 test_token_security.py

# Or if you're in the unified-python directory
cd /app/unified-python  # or wherever your Python app is
python3 test_token_security.py

# Or try the Docker version with different URLs
python3 test_token_security_docker.py --url http://localhost:3001
python3 test_token_security_docker.py --url http://host.docker.internal:8000
```

## Option 3: Using Docker Exec

If you have a running container:

```bash
# Find your container name/ID
docker ps

# Execute the test inside the container
docker exec -it YOUR_CONTAINER_NAME python3 /app/test_token_security.py

# Or copy the file into the container first
docker cp test_token_security.py YOUR_CONTAINER_NAME:/app/
docker exec -it YOUR_CONTAINER_NAME python3 /app/test_token_security.py
```

## Option 4: Manual Testing with curl

If the Python script doesn't work, test manually:

```bash
# Test that tokens endpoint requires authentication
curl http://localhost:8000/api/tokens

# Should return 401 Unauthorized

# Test with authentication (replace YOUR_JWT_TOKEN)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8000/api/tokens

# Test debug endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8000/api/tokens/debug/ownership
```

## Common Issues and Solutions

### 1. "No such file or directory"
- Make sure you're in the right directory
- Check if the file exists: `ls -la test_token_security.py`
- Copy the file to the right location

### 2. "Connection refused"
- Make sure your server is running
- Check the correct port (8000, 3001, etc.)
- If in Docker, use `host.docker.internal` instead of `localhost`

### 3. "Module not found"
- Install required packages: `pip install requests`
- Or use the simplified version: `test_token_security_docker.py`

## Server URLs to Try

Depending on your setup, try these URLs:

- `http://localhost:8000` (Python unified server)
- `http://localhost:3001` (Node.js backend)
- `http://host.docker.internal:8000` (from inside Docker container)
- `http://127.0.0.1:8000` (alternative localhost)

## Quick Security Check

Run this simple test to verify your security improvements:

```bash
# Test 1: Tokens endpoint should require auth
curl -i http://localhost:8000/api/tokens
# Expected: 401 Unauthorized

# Test 2: Health check should work
curl -i http://localhost:8000/health
# Expected: 200 OK

# Test 3: With auth token (get from your app)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8000/api/tokens
# Expected: 200 OK with your tokens only
```
