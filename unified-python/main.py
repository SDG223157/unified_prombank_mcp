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

@app.get("/api/prompts/{prompt_id}")
async def get_prompt(prompt_id: str, db: Session = Depends(get_db)):
    """Get a specific prompt by ID"""
    try:
        prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
        
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")
        
        return {
            "id": prompt.id,
            "title": prompt.title,
            "description": prompt.description,
            "content": prompt.content,
            "category": prompt.category,
            "tags": prompt.tags or [],
            "is_public": prompt.is_public,
            "variables": prompt.variables or [],
            "prompt_metadata": prompt.prompt_metadata or {},
            "created_at": prompt.created_at.isoformat() if prompt.created_at else None,
            "updated_at": prompt.updated_at.isoformat() if prompt.updated_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting prompt: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/api/prompts/{prompt_id}")
async def update_prompt(prompt_id: str, request: Request, db: Session = Depends(get_db)):
    """Update a specific prompt"""
    try:
        prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
        
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")
        
        data = await request.json()
        
        # Update fields
        if 'title' in data:
            prompt.title = data['title']
        if 'description' in data:
            prompt.description = data['description']
        if 'content' in data:
            prompt.content = data['content']
        if 'category' in data:
            prompt.category = data['category']
        if 'tags' in data:
            prompt.tags = data['tags']
        if 'is_public' in data:
            prompt.is_public = data['is_public']
        
        # Update timestamp
        from datetime import datetime
        prompt.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(prompt)
        
        return {
            "id": prompt.id,
            "title": prompt.title,
            "description": prompt.description,
            "content": prompt.content,
            "category": prompt.category,
            "tags": prompt.tags or [],
            "is_public": prompt.is_public,
            "updated_at": prompt.updated_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating prompt: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/api/prompts/{prompt_id}")
async def delete_prompt(prompt_id: str, db: Session = Depends(get_db)):
    """Delete a specific prompt"""
    try:
        prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
        
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")
        
        db.delete(prompt)
        db.commit()
        
        return {"message": "Prompt deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting prompt: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/auth/google")
async def google_auth(request: Request):
    """Initiate Google OAuth flow"""
    google_client_id = os.getenv('GOOGLE_CLIENT_ID')
    if not google_client_id:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    # Generate redirect URI
    redirect_uri = os.getenv('GOOGLE_CALLBACK_URL', f"{os.getenv('BACKEND_URL', 'http://localhost:3000')}/api/auth/google/callback")
    
    # Build Google OAuth URL manually
    from urllib.parse import urlencode
    import secrets
    
    # Generate state for security
    state = secrets.token_urlsafe(32)
    request.session['oauth_state'] = state
    
    oauth_params = {
        'client_id': google_client_id,
        'redirect_uri': redirect_uri,
        'scope': 'openid email profile',
        'response_type': 'code',
        'state': state,
        'access_type': 'online',
        'prompt': 'select_account'
    }
    
    google_auth_url = f"https://accounts.google.com/o/oauth2/auth?{urlencode(oauth_params)}"
    return RedirectResponse(url=google_auth_url)

@app.get("/api/auth/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Handle Google OAuth callback"""
    try:
        # Verify state parameter for security
        state = request.query_params.get('state')
        session_state = request.session.get('oauth_state')
        
        if not state or not session_state or state != session_state:
            raise Exception("Invalid state parameter")
        
        # Clear the state from session
        request.session.pop('oauth_state', None)
        
        # Get the authorization code from the callback
        code = request.query_params.get('code')
        if not code:
            raise Exception("No authorization code received")
        
        # Exchange code for token manually
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                'https://oauth2.googleapis.com/token',
                data={
                    'client_id': os.getenv('GOOGLE_CLIENT_ID'),
                    'client_secret': os.getenv('GOOGLE_CLIENT_SECRET'),
                    'code': code,
                    'grant_type': 'authorization_code',
                    'redirect_uri': os.getenv('GOOGLE_CALLBACK_URL', f"{os.getenv('BACKEND_URL', 'http://localhost:3000')}/api/auth/google/callback")
                }
            )
            
            if token_response.status_code != 200:
                raise Exception(f"Token exchange failed: {token_response.text}")
            
            token_data = token_response.json()
            access_token = token_data.get('access_token')
            
            if not access_token:
                raise Exception("No access token received")
            
            # Get user info from Google
            userinfo_response = await client.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if userinfo_response.status_code != 200:
                raise Exception(f"Failed to get user info: {userinfo_response.text}")
            
            user_info = userinfo_response.json()
        
        # Create or update user in database
        user = await create_or_update_user_from_google(user_info, db)
        
        # Create JWT token for our app
        jwt_token = create_access_token({"sub": user.id, "email": user.email})
        
        # Store user ID in session
        request.session['user_id'] = user.id
        request.session['access_token'] = jwt_token
        
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

@app.get("/prompts/create", response_class=HTMLResponse)
async def serve_create_prompt(request: Request):
    """Serve the create prompt page"""
    return templates.TemplateResponse("create_prompt.html", {
        "request": request,
        "title": "Create Prompt - Prompt House Premium"
    })

@app.get("/prompts/{prompt_id}", response_class=HTMLResponse)
async def serve_view_prompt(request: Request, prompt_id: str):
    """Serve the view prompt page"""
    return templates.TemplateResponse("view_prompt.html", {
        "request": request,
        "title": "View Prompt - Prompt House Premium",
        "prompt_id": prompt_id
    })

@app.get("/prompts/{prompt_id}/edit", response_class=HTMLResponse)
async def serve_edit_prompt(request: Request, prompt_id: str):
    """Serve the edit prompt page"""
    return templates.TemplateResponse("edit_prompt.html", {
        "request": request,
        "title": "Edit Prompt - Prompt House Premium",
        "prompt_id": prompt_id
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
