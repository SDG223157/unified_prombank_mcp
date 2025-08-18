import os
import logging
import asyncio
from pathlib import Path
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from database import get_db, connect_with_retry, create_tables, User, Prompt
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Prompt House Premium",
    description="Unified Prompt House Premium - Python Backend with Frontend",
    version="1.0.0"
)

# Templates
templates = Jinja2Templates(directory="templates")

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

# Mount static files
static_path = Path("static")
if static_path.exists():
    app.mount("/static", StaticFiles(directory="static"), name="static")

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
            "backend": "python-fastapi",
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
        # Get prompts from database
        prompts = db.query(Prompt).limit(10).all()
        return {
            "prompts": [
                {
                    "id": prompt.id,
                    "title": prompt.title,
                    "description": prompt.description,
                    "content": prompt.content,
                    "category": prompt.category,
                    "created_at": prompt.created_at.isoformat() if prompt.created_at else None
                }
                for prompt in prompts
            ],
            "total": len(prompts)
        }
    except Exception as e:
        logger.error(f"Error getting prompts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/prompts")
async def create_prompt(request: Request, db: Session = Depends(get_db)):
    """Create a new prompt"""
    try:
        data = await request.json()
        
        prompt = Prompt(
            id=str(uuid.uuid4()),
            title=data.get('title', 'Untitled'),
            description=data.get('description'),
            content=data.get('content', ''),
            category=data.get('category'),
            user_id=data.get('user_id', 'anonymous'),
            tags=data.get('tags', []),
            is_public=data.get('is_public', False)
        )
        
        db.add(prompt)
        db.commit()
        db.refresh(prompt)
        
        return {
            "id": prompt.id,
            "title": prompt.title,
            "description": prompt.description,
            "content": prompt.content,
            "category": prompt.category,
            "created_at": prompt.created_at.isoformat()
        }
    except Exception as e:
        logger.error(f"Error creating prompt: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/auth/google")
async def google_auth():
    """Google OAuth endpoint"""
    return {"message": "Google OAuth - to be implemented", "status": "not_implemented"}

@app.get("/api/user/profile")
async def get_user_profile():
    """Get user profile"""
    return {"message": "User profile endpoint", "status": "not_implemented"}

# Frontend routes
@app.get("/", response_class=HTMLResponse)
async def serve_frontend(request: Request):
    """Serve the main frontend page"""
    return templates.TemplateResponse("index.html", {
        "request": request,
        "title": "Prompt House Premium",
        "api_url": os.getenv('NEXT_PUBLIC_API_URL', '/api')
    })

@app.get("/dashboard", response_class=HTMLResponse)
async def serve_dashboard(request: Request):
    """Serve the dashboard page"""
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "title": "Dashboard - Prompt House Premium"
    })

@app.get("/prompts", response_class=HTMLResponse)
async def serve_prompts(request: Request):
    """Serve the prompts page"""
    return templates.TemplateResponse("prompts.html", {
        "request": request,
        "title": "Prompts - Prompt House Premium"
    })

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database connection and tables on startup"""
    logger.info("🚀 Starting Prompt House Premium Unified Python Application...")
    try:
        await connect_with_retry()
        create_tables()
        logger.info("✅ Database connection and tables ready")
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv('PORT', 3000))
    host = os.getenv('HOSTNAME', '0.0.0.0')
    
    logger.info(f"🌐 Starting server on {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        log_level="info",
        access_log=True,
        reload=False
    )
