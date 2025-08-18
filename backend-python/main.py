import os
import logging
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from database import get_db, connect_with_retry
import asyncio
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Prompt House Premium",
    description="Unified Prompt House Premium with Backend, Frontend, and MCP Server",
    version="1.0.0"
)

# CORS configuration
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'https://prombank.app').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Trust proxy
if os.getenv('TRUST_PROXY', 'true').lower() == 'true':
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# Health check endpoint
@app.get("/health")
async def health_check():
    try:
        # Test database connection
        db = next(get_db())
        db.execute("SELECT 1")
        db.close()
        
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": "2025-08-18T06:30:00Z",
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy", 
                "database": "disconnected",
                "error": str(e)
            }
        )

# API routes
@app.get("/api/prompts")
async def get_prompts(db: Session = Depends(get_db)):
    """Get all prompts"""
    try:
        # For now, return empty array - we'll implement full functionality later
        return {"prompts": [], "total": 0}
    except Exception as e:
        logger.error(f"Error getting prompts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/auth/google")
async def google_auth():
    """Google OAuth endpoint"""
    return {"message": "Google OAuth not yet implemented in Python version"}

@app.get("/api/user/profile")
async def get_user_profile():
    """Get user profile"""
    return {"message": "User profile endpoint - to be implemented"}

# Serve frontend static files
frontend_path = Path("/app/frontend/.next")
if frontend_path.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_path)), name="static")

# Serve frontend
@app.get("/")
async def serve_frontend():
    """Serve the frontend application"""
    frontend_index = Path("/app/frontend/.next/server/app/page.html")
    if frontend_index.exists():
        return FileResponse(str(frontend_index))
    else:
        return {"message": "Prompt House Premium - Python Backend Running!", "status": "ok"}

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database connection on startup"""
    logger.info("🚀 Starting Prompt House Premium Python Backend...")
    try:
        await connect_with_retry()
        logger.info("✅ Database connection established")
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        # Don't fail startup - let health check handle it

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv('PORT', 3000))
    host = os.getenv('HOSTNAME', '0.0.0.0')
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        log_level="info",
        access_log=True
    )
