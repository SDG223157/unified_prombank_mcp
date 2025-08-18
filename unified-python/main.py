import os
import logging
import asyncio
from pathlib import Path
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session
from database import get_db, connect_with_retry, create_tables, User, Prompt
from auth import setup_oauth, create_access_token, get_current_user, require_auth, create_or_update_user_from_google
import uuid
import httpx

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

# Session middleware (required for OAuth)
app.add_middleware(
    SessionMiddleware, 
    secret_key=os.getenv('SESSION_SECRET', 'fallback-secret-key'),
    max_age=86400,  # 24 hours
    same_site='lax'
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

# Setup OAuth
google_oauth = setup_oauth()

# Mount static files
static_path = Path("static")
if static_path.exists():
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Health check endpoint
@app.get("/health")
async def health_check():
    try:
        # Test database connection
        from sqlalchemy import text
        db = next(get_db())
        db.execute(text("SELECT 1"))
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
async def google_auth(request: Request):
    """Initiate Google OAuth flow"""
    if not google_oauth:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    # Generate redirect URI
    redirect_uri = os.getenv('GOOGLE_CALLBACK_URL', f"{os.getenv('BACKEND_URL', 'http://localhost:3000')}/api/auth/google/callback")
    
    # Redirect to Google OAuth
    return await google_oauth.authorize_redirect(request, redirect_uri)

@app.get("/api/auth/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Handle Google OAuth callback"""
    if not google_oauth:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    try:
        # Get the token from Google
        token = await google_oauth.authorize_access_token(request)
        
        # Get user info from Google
        user_info = token.get('userinfo')
        if not user_info:
            # Fallback: fetch user info manually
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    'https://www.googleapis.com/oauth2/v2/userinfo',
                    headers={'Authorization': f"Bearer {token['access_token']}"}
                )
                user_info = response.json()
        
        # Create or update user in database
        user = await create_or_update_user_from_google(user_info, db)
        
        # Create JWT token
        access_token = create_access_token({"sub": user.id, "email": user.email})
        
        # Store user ID in session
        request.session['user_id'] = user.id
        request.session['access_token'] = access_token
        
        # Redirect to frontend with success
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return RedirectResponse(url=f"{frontend_url}/dashboard?auth=success")
        
    except Exception as e:
        logger.error(f"Google OAuth error: {e}")
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return RedirectResponse(url=f"{frontend_url}/?auth=error")

@app.get("/api/auth/logout")
async def logout(request: Request):
    """Logout user"""
    request.session.clear()
    return {"message": "Logged out successfully"}

@app.get("/api/user/profile")
async def get_user_profile(request: Request, current_user: User = Depends(get_current_user)):
    """Get user profile"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "profile_picture": current_user.profile_picture,
        "auth_provider": current_user.auth_provider,
        "subscription_tier": current_user.subscription_tier,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }

@app.get("/api/auth/status")
async def auth_status(request: Request, current_user: User = Depends(get_current_user)):
    """Check authentication status"""
    if current_user:
        return {
            "authenticated": True,
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "first_name": current_user.first_name,
                "last_name": current_user.last_name,
                "profile_picture": current_user.profile_picture
            }
        }
    else:
        return {"authenticated": False}

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
