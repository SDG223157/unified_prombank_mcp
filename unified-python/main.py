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
from sqlalchemy import text, func
from database import get_db, connect_with_retry, create_tables, User, Prompt, Token, Article
from auth import setup_oauth, create_access_token, get_current_user, require_auth, create_or_update_user_from_google, generate_api_token, hash_token, get_current_user_or_token
import uuid
import httpx
import json
import csv
import io
import re
from datetime import datetime
from typing import List, Dict, Any
from pydantic import BaseModel, ValidationError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models for import
class ImportPromptModel(BaseModel):
    title: str
    description: str = ""
    content: str
    category: str = "Imported"
    tags: List[str] = []
    variables: List[str] = []
    is_public: bool = False

class BulkImportRequest(BaseModel):
    prompts: List[ImportPromptModel]
    
class URLImportRequest(BaseModel):
    url: str
    format: str = "json"  # json, csv, md, or auto-detect

class CreateArticleRequest(BaseModel):
    title: str
    content: str
    category: str = None
    tags: List[str] = []
    prompt_id: str = None
    metadata: Dict[str, Any] = {}

class UpdateArticleRequest(BaseModel):
    title: str = None
    content: str = None
    category: str = None
    tags: List[str] = None
    metadata: Dict[str, Any] = None

def calculate_counts(content: str) -> tuple:
    """Calculate word and character counts for content"""
    char_count = len(content)
    word_count = len(content.strip().split()) if content.strip() else 0
    return word_count, char_count

def parse_markdown_prompts(markdown_content: str) -> List[Dict[str, Any]]:
    """
    Parse Markdown content to extract prompts.
    
    Expected format:
    # Prompt Title
    
    **Description:** Optional description here
    **Category:** Optional category
    **Tags:** tag1, tag2, tag3
    **Public:** false (optional, defaults to false)
    
    Your prompt content goes here with {{variables}} if needed.
    
    ---
    
    # Another Prompt Title
    ...
    """
    prompts = []
    
    # Split content by horizontal rules or headers at start of line
    sections = re.split(r'\n\s*---\s*\n|\n(?=#+\s)', markdown_content.strip())
    
    for section in sections:
        if not section.strip():
            continue
            
        lines = section.strip().split('\n')
        if not lines:
            continue
        
        # Extract title from first line (should be a header)
        title_match = re.match(r'^#+\s*(.+)$', lines[0].strip())
        if not title_match:
            continue
            
        title = title_match.group(1).strip()
        
        # Initialize prompt data
        prompt_data = {
            'title': title,
            'description': '',
            'category': 'Imported',
            'tags': [],
            'is_public': False,
            'content': ''
        }
        
        # Parse metadata and content
        content_lines = []
        in_content = False
        
        for line in lines[1:]:
            line = line.strip()
            
            # Check for metadata
            if line.startswith('**') and ':' in line and not in_content:
                # Extract metadata
                metadata_match = re.match(r'\*\*([^:]+):\*\*\s*(.+)', line)
                if metadata_match:
                    key = metadata_match.group(1).strip().lower()
                    value = metadata_match.group(2).strip()
                    
                    if key == 'description':
                        prompt_data['description'] = value
                    elif key == 'category':
                        prompt_data['category'] = value
                    elif key == 'tags':
                        # Parse comma-separated tags
                        prompt_data['tags'] = [tag.strip() for tag in value.split(',') if tag.strip()]
                    elif key == 'public':
                        prompt_data['is_public'] = value.lower() in ['true', '1', 'yes']
                continue
            
            # If we hit a non-metadata line, start collecting content
            if line or in_content:
                in_content = True
                content_lines.append(line)
        
        # Join content lines and clean up
        content = '\n'.join(content_lines).strip()
        if content:
            prompt_data['content'] = content
            prompts.append(prompt_data)
    
    return prompts

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
async def get_prompts(
    request: Request,
    sortBy: str = "created_at",
    sortOrder: str = "desc",
    db: Session = Depends(get_db)
):
    """Get prompts accessible to the current user (public + user's own) with sorting support"""
    # Require authentication
    current_user = get_current_user_or_token(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Validate sort parameters
        valid_sort_fields = {
            "title": Prompt.title,
            "category": Prompt.category,
            "created_at": Prompt.created_at,
            "createdAt": Prompt.created_at  # Support both formats
        }
        
        if sortBy not in valid_sort_fields:
            sortBy = "created_at"
        
        if sortOrder.lower() not in ["asc", "desc"]:
            sortOrder = "desc"
        
        # Build query with proper access control
        # Users can see: public prompts OR their own prompts (public or private)
        query = db.query(Prompt).filter(
            (Prompt.is_public == True) | (Prompt.user_id == current_user.id)
        )
        
        # Apply sorting
        sort_column = valid_sort_fields[sortBy]
        if sortOrder.lower() == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        
        prompts = query.limit(50).all()
        
        return {
            "prompts": [
                {
                    "id": prompt.id,
                    "title": prompt.title,
                    "description": prompt.description,
                    "content": prompt.content,
                    "category": prompt.category,
                    "is_public": prompt.is_public,
                    "is_owner": prompt.user_id == current_user.id,
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
async def get_prompt(prompt_id: str, request: Request, db: Session = Depends(get_db)):
    """Get a specific prompt by ID (with proper access control)"""
    # Require authentication
    current_user = get_current_user_or_token(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Find prompt with proper access control
        prompt = db.query(Prompt).filter(
            Prompt.id == prompt_id,
            (Prompt.is_public == True) | (Prompt.user_id == current_user.id)
        ).first()
        
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found or access denied")
        
        return {
            "id": prompt.id,
            "title": prompt.title,
            "description": prompt.description,
            "content": prompt.content,
            "category": prompt.category,
            "tags": prompt.tags or [],
            "is_public": prompt.is_public,
            "is_owner": prompt.user_id == current_user.id,
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
    # Support both session and API token authentication
    current_user = get_current_user_or_token(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
        
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")
        
        # Check authorization: user owns prompt OR (user is admin AND prompt is public)
        is_owner = prompt.user_id == current_user.id
        is_admin_updating_public = current_user.is_admin and prompt.is_public
        
        if not is_owner and not is_admin_updating_public:
            error_message = "Only admins can update public prompts that are not their own" if prompt.is_public else "You can only update your own prompts"
            raise HTTPException(status_code=403, detail=error_message)
        
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
async def delete_prompt(prompt_id: str, request: Request, db: Session = Depends(get_db)):
    """Delete a specific prompt"""
    # Support both session and API token authentication
    current_user = get_current_user_or_token(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
        
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")
        
        # Check authorization: user owns prompt OR (user is admin AND prompt is public)
        is_owner = prompt.user_id == current_user.id
        is_admin_deleting_public = current_user.is_admin and prompt.is_public
        
        if not is_owner and not is_admin_deleting_public:
            error_message = "Only admins can delete public prompts that are not their own" if prompt.is_public else "You can only delete your own prompts"
            raise HTTPException(status_code=403, detail=error_message)
        
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
        
        # Redirect to dashboard with success
        return RedirectResponse(url="/dashboard?auth=success")
        
    except Exception as e:
        logger.error(f"Google OAuth error: {e}")
        return RedirectResponse(url="/?auth=error")

@app.get("/api/auth/logout")
async def logout(request: Request):
    """Logout user"""
    request.session.clear()
    return {"message": "Logged out successfully"}

@app.get("/api/user/profile")
async def get_user_profile(request: Request, db: Session = Depends(get_db)):
    """Get user profile"""
    current_user = get_current_user_or_token(request, db)
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
        "is_admin": current_user.is_admin,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }

@app.get("/api/user/stats")
async def get_user_stats(request: Request, db: Session = Depends(get_db)):
    """Get user statistics including prompt counts"""
    current_user = get_current_user_or_token(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # Count total prompts
        total_prompts = db.query(Prompt).filter(Prompt.user_id == current_user.id).count()
        
        # Count public prompts
        public_prompts = db.query(Prompt).filter(
            Prompt.user_id == current_user.id,
            Prompt.is_public == True
        ).count()
        
        # Count private prompts
        private_prompts = total_prompts - public_prompts
        
        return {
            "user": {
                "id": current_user.id,
                "name": f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email,
                "email": current_user.email,
                "subscription_tier": current_user.subscription_tier,
                "is_admin": current_user.is_admin,
                "created_at": current_user.created_at.isoformat() if current_user.created_at else None
            },
            "stats": {
                "prompts": {
                    "total": total_prompts,
                    "public": public_prompts,
                    "private": private_prompts
                }
            }
        }
    except Exception as e:
        logger.error(f"Error getting user stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

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
                "profile_picture": current_user.profile_picture,
                "is_admin": current_user.is_admin
            }
        }
    else:
        return {"authenticated": False}

# Token Management API Endpoints
@app.get("/api/tokens")
async def get_tokens(current_user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """Get all API tokens for the current user"""
    try:
        # Log the user ID for security auditing
        logger.info(f"User {current_user.id} ({current_user.email}) requesting their tokens")
        
        # Ensure we only get tokens for the authenticated user
        tokens = db.query(Token).filter(Token.user_id == current_user.id).all()
        
        # Additional security check - verify all returned tokens belong to the user
        for token in tokens:
            if token.user_id != current_user.id:
                logger.error(f"SECURITY ALERT: Token {token.id} belongs to user {token.user_id} but was returned for user {current_user.id}")
                raise HTTPException(status_code=500, detail="Security error detected")
        
        logger.info(f"Returning {len(tokens)} tokens for user {current_user.id}")
        
        return {
            "tokens": [
                {
                    "id": token.id,
                    "name": token.name,
                    "description": token.description,
                    "is_active": token.is_active,
                    "last_used_at": token.last_used_at.isoformat() if token.last_used_at else None,
                    "usage_count": token.usage_count,
                    "permissions": token.permissions or [],
                    "expires_at": token.expires_at.isoformat() if token.expires_at else None,
                    "created_at": token.created_at.isoformat() if token.created_at else None,
                    # Add user_id in response for debugging (can be removed in production)
                    "owner_user_id": token.user_id
                }
                for token in tokens
            ],
            "user_id": current_user.id,  # Include current user ID for verification
            "count": len(tokens)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tokens for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/tokens")
async def create_token(request: Request, current_user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """Create a new API token"""
    try:
        data = await request.json()
        
        # Generate the actual token
        raw_token = generate_api_token()
        token_hash = hash_token(raw_token)
        
        # Create token record
        token = Token(
            id=str(uuid.uuid4()),
            name=data.get('name', 'MCP Token'),
            description=data.get('description', ''),
            token_hash=token_hash,
            user_id=current_user.id,
            permissions=data.get('permissions', ['read', 'write']),
            expires_at=None  # No expiration by default
        )
        
        db.add(token)
        db.commit()
        db.refresh(token)
        
        # Generate MCP configuration
        mcp_config = {
            "mcpServers": {
                "prompt-house-premium": {
                    "command": "prompt-house-premium-mcp",
                    "env": {
                        "PROMPTHOUSE_API_URL": "https://prombank.app",
                        "PROMPTHOUSE_ACCESS_TOKEN": raw_token
                    }
                }
            }
        }
        
        return {
            "id": token.id,
            "name": token.name,
            "description": token.description,
            "token": raw_token,  # Only returned once during creation
            "permissions": token.permissions,
            "created_at": token.created_at.isoformat(),
            "message": "Token created successfully. Save this token - it won't be shown again!",
            "mcp_config": mcp_config,
            "installation_command": "curl -fsSL https://raw.githubusercontent.com/SDG223157/unified_prombank_mcp/main/install-mcp.sh | bash"
        }
    except Exception as e:
        logger.error(f"Error creating token: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/api/tokens/{token_id}")
async def update_token(token_id: str, request: Request, current_user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """Update an API token (name, description, status)"""
    try:
        logger.info(f"User {current_user.id} ({current_user.email}) attempting to update token {token_id}")
        
        # Use both token_id and user_id in the filter to ensure ownership
        token = db.query(Token).filter(
            Token.id == token_id,
            Token.user_id == current_user.id
        ).first()
        
        if not token:
            logger.warning(f"User {current_user.id} attempted to update non-existent or unauthorized token {token_id}")
            raise HTTPException(status_code=404, detail="Token not found")
        
        # Additional security check
        if token.user_id != current_user.id:
            logger.error(f"SECURITY ALERT: User {current_user.id} attempted to update token {token_id} owned by user {token.user_id}")
            raise HTTPException(status_code=403, detail="Access denied")
        
        data = await request.json()
        
        # Update fields
        if 'name' in data:
            token.name = data['name']
        if 'description' in data:
            token.description = data['description']
        if 'is_active' in data:
            token.is_active = data['is_active']
        if 'permissions' in data:
            token.permissions = data['permissions']
        
        from datetime import datetime
        token.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(token)
        
        logger.info(f"Token {token_id} updated successfully by user {current_user.id}")
        
        return {
            "id": token.id,
            "name": token.name,
            "description": token.description,
            "is_active": token.is_active,
            "permissions": token.permissions,
            "updated_at": token.updated_at.isoformat(),
            "owner_user_id": token.user_id  # For debugging
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating token {token_id} for user {current_user.id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/api/tokens/{token_id}")
async def delete_token(token_id: str, current_user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """Delete an API token"""
    try:
        logger.info(f"User {current_user.id} ({current_user.email}) attempting to delete token {token_id}")
        
        # Use both token_id and user_id in the filter to ensure ownership
        token = db.query(Token).filter(
            Token.id == token_id,
            Token.user_id == current_user.id
        ).first()
        
        if not token:
            logger.warning(f"User {current_user.id} attempted to delete non-existent or unauthorized token {token_id}")
            raise HTTPException(status_code=404, detail="Token not found")
        
        # Additional security check
        if token.user_id != current_user.id:
            logger.error(f"SECURITY ALERT: User {current_user.id} attempted to delete token {token_id} owned by user {token.user_id}")
            raise HTTPException(status_code=403, detail="Access denied")
        
        db.delete(token)
        db.commit()
        
        logger.info(f"Token {token_id} deleted successfully by user {current_user.id}")
        
        return {"message": "Token deleted successfully", "token_id": token_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting token {token_id} for user {current_user.id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/tokens/{token_id}/mcp-config")
async def get_mcp_config(token_id: str, current_user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """Get MCP configuration for a specific token"""
    try:
        logger.info(f"User {current_user.id} ({current_user.email}) requesting MCP config for token {token_id}")
        
        # Use both token_id and user_id in the filter to ensure ownership
        token = db.query(Token).filter(
            Token.id == token_id,
            Token.user_id == current_user.id
        ).first()
        
        if not token:
            logger.warning(f"User {current_user.id} attempted to get MCP config for non-existent or unauthorized token {token_id}")
            raise HTTPException(status_code=404, detail="Token not found")
        
        # Additional security check
        if token.user_id != current_user.id:
            logger.error(f"SECURITY ALERT: User {current_user.id} attempted to get MCP config for token {token_id} owned by user {token.user_id}")
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Note: We can't regenerate the raw token, so we provide a template
        mcp_config = {
            "mcpServers": {
                "prompt-house-premium": {
                    "command": "prompt-house-premium-mcp",
                    "env": {
                        "PROMPTHOUSE_API_URL": "https://prombank.app",
                        "PROMPTHOUSE_ACCESS_TOKEN": "YOUR_API_TOKEN_HERE"
                    }
                }
            }
        }
        
        return {
            "token_name": token.name,
            "token_id": token.id,
            "mcp_config": mcp_config,
            "installation_command": "curl -fsSL https://raw.githubusercontent.com/SDG223157/unified_prombank_mcp/main/install-mcp.sh | bash",
            "note": "Replace 'YOUR_API_TOKEN_HERE' with your actual API token",
            "owner_user_id": token.user_id  # For debugging
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting MCP config: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Security endpoint to verify token ownership (can be removed in production)
@app.get("/api/tokens/debug/ownership")
async def debug_token_ownership(current_user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """Debug endpoint to verify token ownership - remove in production"""
    try:
        logger.info(f"Debug: User {current_user.id} ({current_user.email}) checking token ownership")
        
        # Get all tokens for this user
        user_tokens = db.query(Token).filter(Token.user_id == current_user.id).all()
        
        # Get count of all tokens in system (for comparison)
        total_tokens = db.query(Token).count()
        
        return {
            "current_user_id": current_user.id,
            "current_user_email": current_user.email,
            "user_tokens_count": len(user_tokens),
            "total_tokens_in_system": total_tokens,
            "user_tokens": [
                {
                    "id": token.id,
                    "name": token.name,
                    "user_id": token.user_id,
                    "created_at": token.created_at.isoformat()
                }
                for token in user_tokens
            ]
        }
    except Exception as e:
        logger.error(f"Error in debug endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# MCP API Endpoints (for Cursor integration)
@app.get("/api/mcp/prompts")
async def mcp_get_prompts(request: Request, db: Session = Depends(get_db)):
    """MCP endpoint to get prompts (requires API token)"""
    current_user = get_current_user_or_token(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="API token required")
    
    try:
        # Get prompts accessible to this user (public + user's own)
        prompts = db.query(Prompt).filter(
            (Prompt.is_public == True) | (Prompt.user_id == current_user.id)
        ).limit(50).all()
        
        return {
            "prompts": [
                {
                    "name": prompt.title,
                    "description": prompt.description or "",
                    "arguments": [
                        {
                            "name": var,
                            "description": f"Variable: {var}",
                            "required": True
                        }
                        for var in (prompt.variables or [])
                    ]
                }
                for prompt in prompts
            ]
        }
    except Exception as e:
        logger.error(f"Error getting MCP prompts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/mcp/prompts/{prompt_name}")
async def mcp_get_prompt(prompt_name: str, request: Request, db: Session = Depends(get_db)):
    """MCP endpoint to get a specific prompt by name"""
    current_user = get_current_user_or_token(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="API token required")
    
    try:
        # Find prompt by title (case insensitive)
        prompt = db.query(Prompt).filter(
            Prompt.title.ilike(f"%{prompt_name}%"),
            (Prompt.is_public == True) | (Prompt.user_id == current_user.id)
        ).first()
        
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")
        
        # Get arguments from request
        data = await request.json() if request.method == "POST" else {}
        arguments = data.get("arguments", {})
        
        # Replace variables in prompt content
        content = prompt.content
        for var, value in arguments.items():
            content = content.replace(f"{{{var}}}", str(value))
        
        return {
            "messages": [
                {
                    "role": "user",
                    "content": {
                        "type": "text",
                        "text": content
                    }
                }
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting MCP prompt: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Import endpoints
@app.post("/api/import/json")
async def import_prompts_json(
    request: BulkImportRequest,
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Import prompts from JSON data"""
    try:
        imported_prompts = []
        for prompt_data in request.prompts:
            # Extract variables from content
            import re
            variables = re.findall(r'\{\{(\w+)\}\}', prompt_data.content)
            variables = list(set(variables))  # Remove duplicates
            
            new_prompt = Prompt(
                id=str(uuid.uuid4()),
                title=prompt_data.title,
                description=prompt_data.description,
                content=prompt_data.content,
                category=prompt_data.category,
                tags=prompt_data.tags,
                variables=variables,
                is_public=prompt_data.is_public,
                user_id=current_user.id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(new_prompt)
            imported_prompts.append({
                "id": new_prompt.id,
                "title": new_prompt.title,
                "variables_detected": variables
            })
        
        db.commit()
        return {
            "message": f"Successfully imported {len(imported_prompts)} prompts",
            "imported_prompts": imported_prompts
        }
    except Exception as e:
        logger.error(f"Error importing prompts: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@app.post("/api/import/csv")
async def import_prompts_csv(
    request: Request,
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Import prompts from CSV data"""
    try:
        form = await request.form()
        csv_content = form.get("csv_content", "")
        
        if not csv_content:
            raise HTTPException(status_code=400, detail="No CSV content provided")
        
        # Parse CSV
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        imported_prompts = []
        
        for row in csv_reader:
            # Required fields
            if not row.get('title') or not row.get('content'):
                continue
                
            # Extract variables from content
            import re
            variables = re.findall(r'\{\{(\w+)\}\}', row.get('content', ''))
            variables = list(set(variables))
            
            # Parse tags (comma-separated)
            tags = [tag.strip() for tag in row.get('tags', '').split(',') if tag.strip()]
            
            new_prompt = Prompt(
                id=str(uuid.uuid4()),
                title=row.get('title'),
                description=row.get('description', ''),
                content=row.get('content'),
                category=row.get('category', 'Imported'),
                tags=tags,
                variables=variables,
                is_public=row.get('is_public', '').lower() in ['true', '1', 'yes'],
                user_id=current_user.id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(new_prompt)
            imported_prompts.append({
                "id": new_prompt.id,
                "title": new_prompt.title,
                "variables_detected": variables
            })
        
        db.commit()
        return {
            "message": f"Successfully imported {len(imported_prompts)} prompts from CSV",
            "imported_prompts": imported_prompts
        }
    except Exception as e:
        logger.error(f"Error importing CSV: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"CSV import failed: {str(e)}")

@app.post("/api/import/md")
async def import_prompts_md(
    request: Request,
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Import prompts from Markdown data"""
    try:
        form = await request.form()
        md_content = form.get("md_content", "")
        
        if not md_content:
            raise HTTPException(status_code=400, detail="No Markdown content provided")
        
        # Parse Markdown
        prompts_data = parse_markdown_prompts(md_content)
        imported_prompts = []
        
        for prompt_data in prompts_data:
            if not prompt_data.get('title') or not prompt_data.get('content'):
                continue
                
            # Extract variables from content
            variables = re.findall(r'\{\{(\w+)\}\}', prompt_data.get('content', ''))
            variables = list(set(variables))
            
            new_prompt = Prompt(
                id=str(uuid.uuid4()),
                title=prompt_data.get('title'),
                description=prompt_data.get('description', ''),
                content=prompt_data.get('content'),
                category=prompt_data.get('category', 'Imported'),
                tags=prompt_data.get('tags', []),
                variables=variables,
                is_public=prompt_data.get('is_public', False),
                user_id=current_user.id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(new_prompt)
            imported_prompts.append({
                "id": new_prompt.id,
                "title": new_prompt.title,
                "variables_detected": variables
            })
        
        db.commit()
        return {
            "message": f"Successfully imported {len(imported_prompts)} prompts from Markdown",
            "imported_prompts": imported_prompts
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing Markdown prompts: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Markdown import failed: {str(e)}")

@app.post("/api/import/url")
async def import_prompts_url(
    request: URLImportRequest,
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Import prompts from a URL (JSON or CSV)"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(request.url)
            response.raise_for_status()
            content = response.text
        
        imported_prompts = []
        
        if request.format == "json" or (request.format == "auto-detect" and content.strip().startswith('{')):
            # Parse as JSON
            data = json.loads(content)
            prompts_data = data if isinstance(data, list) else data.get('prompts', [])
            
            for prompt_data in prompts_data:
                if not prompt_data.get('title') or not prompt_data.get('content'):
                    continue
                    
                # Extract variables
                import re
                variables = re.findall(r'\{\{(\w+)\}\}', prompt_data.get('content', ''))
                variables = list(set(variables))
                
                new_prompt = Prompt(
                    id=str(uuid.uuid4()),
                    title=prompt_data.get('title'),
                    description=prompt_data.get('description', ''),
                    content=prompt_data.get('content'),
                    category=prompt_data.get('category', 'Imported'),
                    tags=prompt_data.get('tags', []),
                    variables=variables,
                    is_public=prompt_data.get('is_public', False),
                    user_id=current_user.id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(new_prompt)
                imported_prompts.append({
                    "id": new_prompt.id,
                    "title": new_prompt.title,
                    "variables_detected": variables
                })
        
        elif request.format == "csv" or (request.format == "auto-detect" and ',' in content and 'title' in content.split('\n')[0]):
            # Parse as CSV
            csv_reader = csv.DictReader(io.StringIO(content))
            
            for row in csv_reader:
                if not row.get('title') or not row.get('content'):
                    continue
                    
                # Extract variables
                variables = re.findall(r'\{\{(\w+)\}\}', row.get('content', ''))
                variables = list(set(variables))
                
                # Parse tags
                tags = [tag.strip() for tag in row.get('tags', '').split(',') if tag.strip()]
                
                new_prompt = Prompt(
                    id=str(uuid.uuid4()),
                    title=row.get('title'),
                    description=row.get('description', ''),
                    content=row.get('content'),
                    category=row.get('category', 'Imported'),
                    tags=tags,
                    variables=variables,
                    is_public=row.get('is_public', '').lower() in ['true', '1', 'yes'],
                    user_id=current_user.id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(new_prompt)
                imported_prompts.append({
                    "id": new_prompt.id,
                    "title": new_prompt.title,
                    "variables_detected": variables
                })
        
        elif request.format == "md" or (request.format == "auto-detect" and content.strip().startswith('#')):
            # Parse as Markdown
            prompts_data = parse_markdown_prompts(content)
            
            for prompt_data in prompts_data:
                if not prompt_data.get('title') or not prompt_data.get('content'):
                    continue
                    
                # Extract variables
                variables = re.findall(r'\{\{(\w+)\}\}', prompt_data.get('content', ''))
                variables = list(set(variables))
                
                new_prompt = Prompt(
                    id=str(uuid.uuid4()),
                    title=prompt_data.get('title'),
                    description=prompt_data.get('description', ''),
                    content=prompt_data.get('content'),
                    category=prompt_data.get('category', 'Imported'),
                    tags=prompt_data.get('tags', []),
                    variables=variables,
                    is_public=prompt_data.get('is_public', False),
                    user_id=current_user.id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(new_prompt)
                imported_prompts.append({
                    "id": new_prompt.id,
                    "title": new_prompt.title,
                    "variables_detected": variables
                })
        
        db.commit()
        return {
            "message": f"Successfully imported {len(imported_prompts)} prompts from URL",
            "imported_prompts": imported_prompts,
            "source_url": request.url
        }
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")
    except Exception as e:
        logger.error(f"Error importing from URL: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"URL import failed: {str(e)}")

# MCP Import endpoint
@app.post("/api/mcp/import")
async def mcp_import_prompts(request: Request, db: Session = Depends(get_db)):
    """MCP endpoint to import prompts (requires API token)"""
    current_user = get_current_user_or_token(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="API token required")
    
    try:
        data = await request.json()
        import_type = data.get("type", "json")  # json, csv, url
        
        if import_type == "json":
            prompts_data = data.get("prompts", [])
            imported_count = 0
            
            for prompt_data in prompts_data:
                if not prompt_data.get('title') or not prompt_data.get('content'):
                    continue
                    
                # Extract variables
                import re
                variables = re.findall(r'\{\{(\w+)\}\}', prompt_data.get('content', ''))
                variables = list(set(variables))
                
                new_prompt = Prompt(
                    id=str(uuid.uuid4()),
                    title=prompt_data.get('title'),
                    description=prompt_data.get('description', ''),
                    content=prompt_data.get('content'),
                    category=prompt_data.get('category', 'Imported'),
                    tags=prompt_data.get('tags', []),
                    variables=variables,
                    is_public=prompt_data.get('is_public', False),
                    user_id=current_user.id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(new_prompt)
                imported_count += 1
            
            db.commit()
            return {"message": f"Successfully imported {imported_count} prompts via MCP"}
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported import type for MCP")
            
    except Exception as e:
        logger.error(f"Error in MCP import: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="MCP import failed")

# Article API Routes
@app.get("/api/articles")
async def get_articles(
    request: Request,
    page: int = 1,
    limit: int = 10,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    category: str = None,
    search: str = None,
    db: Session = Depends(get_db)
):
    """Get articles with pagination and filtering"""
    current_user = get_current_user_or_token(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # Validate pagination parameters
        if page < 1:
            page = 1
        if limit < 1 or limit > 100:
            limit = 10
        
        # Validate sort parameters
        valid_sort_fields = ["title", "category", "created_at", "updated_at"]
        if sort_by not in valid_sort_fields:
            sort_by = "created_at"
        
        if sort_order not in ["asc", "desc"]:
            sort_order = "desc"
        
        # Build query
        query = db.query(Article).filter(Article.user_id == current_user.id)
        
        # Apply filters
        if category:
            query = query.filter(Article.category == category)
        
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                (Article.title.like(search_pattern)) |
                (Article.content.like(search_pattern))
            )
        
        # Get total count before pagination
        total_count = query.count()
        
        # Apply sorting
        if sort_order == "desc":
            query = query.order_by(getattr(Article, sort_by).desc())
        else:
            query = query.order_by(getattr(Article, sort_by).asc())
        
        # Apply pagination
        offset = (page - 1) * limit
        articles = query.offset(offset).limit(limit).all()
        
        # Get unique categories for filtering
        categories_query = db.query(Article.category).filter(
            Article.user_id == current_user.id,
            Article.category.isnot(None)
        ).distinct()
        categories = [cat[0] for cat in categories_query.all()]
        
        # Format response
        articles_data = []
        for article in articles:
            # Get source prompt info if available
            prompt_info = None
            if article.prompt_id:
                prompt = db.query(Prompt).filter(Prompt.id == article.prompt_id).first()
                if prompt:
                    prompt_info = {"id": prompt.id, "title": prompt.title}
            
            articles_data.append({
                "id": article.id,
                "title": article.title,
                "category": article.category,
                "tags": article.tags,
                "word_count": article.word_count,
                "char_count": article.char_count,
                "created_at": article.created_at.isoformat() if article.created_at else None,
                "updated_at": article.updated_at.isoformat() if article.updated_at else None,
                "prompt": prompt_info
            })
        
        return {
            "articles": articles_data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_count": total_count,
                "total_pages": (total_count + limit - 1) // limit,
                "has_next_page": page < ((total_count + limit - 1) // limit),
                "has_prev_page": page > 1
            },
            "categories": sorted(categories)
        }
        
    except Exception as e:
        logger.error(f"Error fetching articles: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch articles")

@app.get("/api/articles/{article_id}")
async def get_article(article_id: str, request: Request, db: Session = Depends(get_db)):
    """Get a specific article"""
    current_user = get_current_user_or_token(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        article = db.query(Article).filter(
            Article.id == article_id,
            Article.user_id == current_user.id
        ).first()
        
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        # Get source prompt info if available
        prompt_info = None
        if article.prompt_id:
            prompt = db.query(Prompt).filter(Prompt.id == article.prompt_id).first()
            if prompt:
                prompt_info = {
                    "id": prompt.id,
                    "title": prompt.title,
                    "description": prompt.description
                }
        
        return {
            "id": article.id,
            "title": article.title,
            "content": article.content,
            "category": article.category,
            "tags": article.tags,
            "prompt_id": article.prompt_id,
            "word_count": article.word_count,
            "char_count": article.char_count,
            "metadata": article.article_metadata,
            "created_at": article.created_at.isoformat() if article.created_at else None,
            "updated_at": article.updated_at.isoformat() if article.updated_at else None,
            "prompt": prompt_info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching article: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch article")

@app.post("/api/articles")
async def create_article(
    article_data: CreateArticleRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Create a new article"""
    current_user = get_current_user_or_token(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # Verify prompt exists and belongs to user if prompt_id is provided
        if article_data.prompt_id:
            prompt = db.query(Prompt).filter(
                Prompt.id == article_data.prompt_id,
                Prompt.user_id == current_user.id
            ).first()
            
            if not prompt:
                raise HTTPException(status_code=400, detail="Prompt not found or does not belong to user")
        
        # Calculate word and character counts
        word_count, char_count = calculate_counts(article_data.content)
        
        # Create article
        article = Article(
            id=str(uuid.uuid4()),
            title=article_data.title,
            content=article_data.content,
            category=article_data.category,
            tags=article_data.tags,
            prompt_id=article_data.prompt_id,
            user_id=current_user.id,
            word_count=word_count,
            char_count=char_count,
            article_metadata=article_data.metadata
        )
        
        db.add(article)
        db.commit()
        db.refresh(article)
        
        # Get source prompt info if available
        prompt_info = None
        if article.prompt_id:
            prompt = db.query(Prompt).filter(Prompt.id == article.prompt_id).first()
            if prompt:
                prompt_info = {"id": prompt.id, "title": prompt.title}
        
        return {
            "id": article.id,
            "title": article.title,
            "content": article.content,
            "category": article.category,
            "tags": article.tags,
            "prompt_id": article.prompt_id,
            "word_count": article.word_count,
            "char_count": article.char_count,
            "metadata": article.article_metadata,
            "created_at": article.created_at.isoformat() if article.created_at else None,
            "updated_at": article.updated_at.isoformat() if article.updated_at else None,
            "prompt": prompt_info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating article: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create article")

@app.put("/api/articles/{article_id}")
async def update_article(
    article_id: str,
    article_data: UpdateArticleRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Update an existing article"""
    current_user = get_current_user_or_token(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # Find article
        article = db.query(Article).filter(
            Article.id == article_id,
            Article.user_id == current_user.id
        ).first()
        
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        # Update fields
        if article_data.title is not None:
            article.title = article_data.title
        if article_data.content is not None:
            article.content = article_data.content
            # Recalculate counts if content changed
            word_count, char_count = calculate_counts(article_data.content)
            article.word_count = word_count
            article.char_count = char_count
        if article_data.category is not None:
            article.category = article_data.category
        if article_data.tags is not None:
            article.tags = article_data.tags
        if article_data.metadata is not None:
            article.article_metadata = article_data.metadata
        
        article.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(article)
        
        # Get source prompt info if available
        prompt_info = None
        if article.prompt_id:
            prompt = db.query(Prompt).filter(Prompt.id == article.prompt_id).first()
            if prompt:
                prompt_info = {"id": prompt.id, "title": prompt.title}
        
        return {
            "id": article.id,
            "title": article.title,
            "content": article.content,
            "category": article.category,
            "tags": article.tags,
            "prompt_id": article.prompt_id,
            "word_count": article.word_count,
            "char_count": article.char_count,
            "metadata": article.article_metadata,
            "created_at": article.created_at.isoformat() if article.created_at else None,
            "updated_at": article.updated_at.isoformat() if article.updated_at else None,
            "prompt": prompt_info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating article: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update article")

@app.delete("/api/articles/{article_id}")
async def delete_article(article_id: str, request: Request, db: Session = Depends(get_db)):
    """Delete an article"""
    current_user = get_current_user_or_token(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # Find article
        article = db.query(Article).filter(
            Article.id == article_id,
            Article.user_id == current_user.id
        ).first()
        
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        db.delete(article)
        db.commit()
        
        return {"success": True, "message": "Article deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting article: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete article")

@app.get("/api/articles/stats/overview")
async def get_article_stats(request: Request, db: Session = Depends(get_db)):
    """Get article statistics"""
    current_user = get_current_user_or_token(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # Get total count
        total_count = db.query(Article).filter(Article.user_id == current_user.id).count()
        
        # Get total words
        total_words_result = db.query(
            func.sum(Article.word_count)
        ).filter(Article.user_id == current_user.id).scalar()
        total_words = total_words_result or 0
        
        # Get category breakdown
        category_stats = db.query(
            Article.category,
            func.count(Article.id).label('count')
        ).filter(Article.user_id == current_user.id).group_by(Article.category).all()
        
        category_breakdown = [
            {
                "category": stat.category or "Uncategorized",
                "count": stat.count
            }
            for stat in category_stats
        ]
        
        # Get recent articles
        recent_articles = db.query(Article).filter(
            Article.user_id == current_user.id
        ).order_by(Article.created_at.desc()).limit(5).all()
        
        recent_articles_data = [
            {
                "id": article.id,
                "title": article.title,
                "category": article.category,
                "word_count": article.word_count,
                "created_at": article.created_at.isoformat() if article.created_at else None
            }
            for article in recent_articles
        ]
        
        return {
            "total_articles": total_count,
            "total_words": total_words,
            "category_breakdown": category_breakdown,
            "recent_articles": recent_articles_data
        }
        
    except Exception as e:
        logger.error(f"Error getting article stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get article statistics")

@app.post("/api/migrate-articles/add-articles-table")
async def migrate_articles_table(db: Session = Depends(get_db)):
    """Create articles table - migration endpoint"""
    try:
        logger.info("🔧 Starting articles table migration...")
        
        # Check if table already exists
        try:
            result = db.execute(text("""
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name = 'articles'
            """))
            exists = result.fetchone()[0] > 0
            
            if exists:
                logger.info("✅ Articles table already exists")
                return {
                    "success": True,
                    "message": "Articles table already exists",
                    "already_migrated": True
                }
        except Exception as e:
            logger.info(f"Table check failed, proceeding with migration: {e}")
        
        # Create articles table
        logger.info("📝 Creating articles table...")
        db.execute(text("""
            CREATE TABLE articles (
                id VARCHAR(255) NOT NULL,
                title VARCHAR(500) NOT NULL,
                content LONGTEXT NOT NULL,
                category VARCHAR(255) NULL,
                tags JSON DEFAULT ('[]'),
                prompt_id VARCHAR(255) NULL,
                user_id VARCHAR(255) NOT NULL,
                word_count INT NULL,
                char_count INT NULL,
                article_metadata JSON DEFAULT ('{}'),
                created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                
                PRIMARY KEY (id),
                KEY articles_user_id_idx (user_id),
                KEY articles_prompt_id_idx (prompt_id),
                KEY articles_category_idx (category),
                KEY articles_created_at_idx (created_at),
                
                CONSTRAINT articles_user_id_fkey 
                  FOREIGN KEY (user_id) REFERENCES users (id) 
                  ON DELETE CASCADE ON UPDATE CASCADE,
                
                CONSTRAINT articles_prompt_id_fkey 
                  FOREIGN KEY (prompt_id) REFERENCES prompts (id) 
                  ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """))
        
        db.commit()
        logger.info("✅ Articles table created successfully")
        
        return {
            "success": True,
            "message": "Articles table migration completed successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Articles migration failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")

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

@app.get("/tokens", response_class=HTMLResponse)
async def serve_tokens(request: Request):
    """Serve the tokens management page"""
    return templates.TemplateResponse("tokens.html", {
        "request": request,
        "title": "API Tokens - Prompt House Premium"
    })

@app.get("/import", response_class=HTMLResponse)
async def serve_import(request: Request):
    """Serve the import page"""
    return templates.TemplateResponse("import.html", {
        "request": request,
        "title": "Import Prompts - Prompt House Premium"
    })

# Article Frontend Routes
@app.get("/articles", response_class=HTMLResponse)
async def serve_articles(request: Request):
    """Serve the articles list page"""
    return templates.TemplateResponse("articles.html", {
        "request": request,
        "title": "Articles - Prompt House Premium"
    })

@app.get("/articles/create", response_class=HTMLResponse)
async def serve_create_article(request: Request):
    """Serve the create article page"""
    return templates.TemplateResponse("create_article.html", {
        "request": request,
        "title": "Create Article - Prompt House Premium"
    })

@app.get("/articles/{article_id}", response_class=HTMLResponse)
async def serve_view_article(request: Request, article_id: str):
    """Serve the view article page"""
    return templates.TemplateResponse("view_article.html", {
        "request": request,
        "title": "View Article - Prompt House Premium",
        "article_id": article_id
    })

@app.get("/articles/{article_id}/edit", response_class=HTMLResponse)
async def serve_edit_article(request: Request, article_id: str):
    """Serve the edit article page"""
    return templates.TemplateResponse("edit_article.html", {
        "request": request,
        "title": "Edit Article - Prompt House Premium",
        "article_id": article_id
    })

# Feature Pages
@app.get("/features/editor", response_class=HTMLResponse)
async def serve_editor_features(request: Request):
    """Serve the Advanced Editor features page"""
    return templates.TemplateResponse("features_editor.html", {
        "request": request,
        "title": "Advanced Editor - Prompt House Premium"
    })

@app.get("/features/collaboration", response_class=HTMLResponse)
async def serve_collaboration_features(request: Request):
    """Serve the Team Collaboration features page"""
    return templates.TemplateResponse("features_collaboration.html", {
        "request": request,
        "title": "Team Collaboration - Prompt House Premium"
    })

@app.get("/features/search", response_class=HTMLResponse)
async def serve_search_features(request: Request):
    """Serve the Smart Search features page"""
    return templates.TemplateResponse("features_search.html", {
        "request": request,
        "title": "Smart Search - Prompt House Premium"
    })

# Admin Routes
@app.get("/admin", response_class=HTMLResponse)
async def serve_admin_dashboard(request: Request, current_user: User = Depends(require_auth)):
    """Serve the admin dashboard page (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return templates.TemplateResponse("admin_dashboard.html", {
        "request": request,
        "title": "Admin Dashboard - Prompt House Premium"
    })

@app.get("/admin-diagnostic", response_class=HTMLResponse)
async def serve_admin_diagnostic(request: Request):
    """Serve the admin diagnostic page (no auth required for debugging)"""
    return templates.TemplateResponse("admin_diagnostic.html", {
        "request": request,
        "title": "Admin Diagnostic - Prompt House Premium"
    })

@app.get("/api/security-diagnostic")
async def security_diagnostic_endpoint(request: Request, db: Session = Depends(get_db)):
    """Security diagnostic endpoint to check prompt visibility"""
    current_user = get_current_user_or_token(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Get all prompts this user can see (using the same logic as /api/prompts)
        visible_prompts = db.query(Prompt).filter(
            (Prompt.is_public == True) | (Prompt.user_id == current_user.id)
        ).all()
        
        # Categorize prompts
        public_prompts = [p for p in visible_prompts if p.is_public]
        own_private_prompts = [p for p in visible_prompts if not p.is_public and p.user_id == current_user.id]
        own_public_prompts = [p for p in visible_prompts if p.is_public and p.user_id == current_user.id]
        
        # Get total counts in system
        total_prompts = db.query(Prompt).count()
        total_public = db.query(Prompt).filter(Prompt.is_public == True).count()
        total_private = total_prompts - total_public
        
        return {
            "user": {
                "email": current_user.email,
                "is_admin": current_user.is_admin
            },
            "visibility_summary": {
                "total_visible_to_user": len(visible_prompts),
                "public_from_all_users": len([p for p in public_prompts if p.user_id != current_user.id]),
                "own_public_prompts": len(own_public_prompts),
                "own_private_prompts": len(own_private_prompts)
            },
            "system_totals": {
                "total_prompts_in_system": total_prompts,
                "total_public_prompts": total_public,
                "total_private_prompts": total_private
            },
            "visible_prompts": [
                {
                    "id": p.id,
                    "title": p.title,
                    "is_public": p.is_public,
                    "is_owner": p.user_id == current_user.id,
                    "visibility_reason": "Public (visible to all)" if p.is_public else "Your own private prompt"
                }
                for p in visible_prompts
            ],
            "security_status": "✅ Working correctly - you can only see public prompts and your own prompts"
        }
        
    except Exception as e:
        logger.error(f"Error in security diagnostic: {e}")
        raise HTTPException(status_code=500, detail="Diagnostic failed")

@app.get("/register", response_class=HTMLResponse)
async def serve_register_page(request: Request):
    """Serve the registration page"""
    return templates.TemplateResponse("register.html", {
        "request": request,
        "title": "Register - Prompt House Premium"
    })

@app.get("/login", response_class=HTMLResponse)
async def serve_login_page(request: Request):
    """Serve the login page"""
    return templates.TemplateResponse("login.html", {
        "request": request,
        "title": "Login - Prompt House Premium"
    })

@app.get("/settings", response_class=HTMLResponse)
async def serve_settings_page(request: Request, current_user: User = Depends(require_auth)):
    """Serve the settings page (authenticated users only)"""
    return templates.TemplateResponse("settings.html", {
        "request": request,
        "title": "Account Settings - Prompt House Premium"
    })

@app.get("/api/admin/database/overview")
async def get_database_overview(current_user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """Get database overview statistics (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Get table counts
        users_count = db.query(func.count(User.id)).scalar()
        prompts_count = db.query(func.count(Prompt.id)).scalar()
        articles_count = db.query(func.count(Article.id)).scalar()
        tokens_count = db.query(func.count(Token.id)).scalar()
        
        # Get recent activity
        recent_users = db.query(User).order_by(User.created_at.desc()).limit(5).all()
        recent_prompts = db.query(Prompt).order_by(Prompt.created_at.desc()).limit(5).all()
        recent_articles = db.query(Article).order_by(Article.created_at.desc()).limit(5).all()
        
        # Get admin users
        admin_users = db.query(User).filter(User.is_admin == True).all()
        
        return {
            "counts": {
                "users": users_count,
                "prompts": prompts_count,
                "articles": articles_count,
                "tokens": tokens_count
            },
            "recent_activity": {
                "users": [{"id": u.id, "email": u.email, "name": f"{u.first_name or ''} {u.last_name or ''}".strip(), "created_at": u.created_at.isoformat()} for u in recent_users],
                "prompts": [{"id": p.id, "title": p.title, "category": p.category, "is_public": p.is_public, "created_at": p.created_at.isoformat()} for p in recent_prompts],
                "articles": [{"id": a.id, "title": a.title, "category": a.category, "word_count": a.word_count, "created_at": a.created_at.isoformat()} for a in recent_articles]
            },
            "admin_users": [{"id": u.id, "email": u.email, "name": f"{u.first_name or ''} {u.last_name or ''}".strip(), "created_at": u.created_at.isoformat()} for u in admin_users]
        }
    except Exception as e:
        logger.error(f"Error getting database overview: {e}")
        raise HTTPException(status_code=500, detail="Failed to get database overview")

@app.get("/api/admin/database/users")
async def get_all_users(current_user: User = Depends(require_auth), db: Session = Depends(get_db), skip: int = 0, limit: int = 50):
    """Get all users (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        users = db.query(User).offset(skip).limit(limit).all()
        total = db.query(func.count(User.id)).scalar()
        
        return {
            "users": [
                {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "auth_provider": user.auth_provider,
                    "subscription_tier": user.subscription_tier,
                    "is_active": user.is_active,
                    "is_admin": user.is_admin,
                    "created_at": user.created_at.isoformat(),
                    "updated_at": user.updated_at.isoformat()
                }
                for user in users
            ],
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Error getting users: {e}")
        raise HTTPException(status_code=500, detail="Failed to get users")

@app.get("/api/admin/database/prompts")
async def get_all_prompts_admin(current_user: User = Depends(require_auth), db: Session = Depends(get_db), skip: int = 0, limit: int = 50):
    """Get all prompts (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        prompts = db.query(Prompt).offset(skip).limit(limit).all()
        total = db.query(func.count(Prompt.id)).scalar()
        
        return {
            "prompts": [
                {
                    "id": prompt.id,
                    "title": prompt.title,
                    "description": prompt.description,
                    "category": prompt.category,
                    "tags": prompt.tags,
                    "is_public": prompt.is_public,
                    "user_id": prompt.user_id,
                    "word_count": prompt.word_count,
                    "char_count": prompt.char_count,
                    "created_at": prompt.created_at.isoformat(),
                    "updated_at": prompt.updated_at.isoformat()
                }
                for prompt in prompts
            ],
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Error getting prompts: {e}")
        raise HTTPException(status_code=500, detail="Failed to get prompts")

@app.get("/api/admin/database/articles")
async def get_all_articles_admin(current_user: User = Depends(require_auth), db: Session = Depends(get_db), skip: int = 0, limit: int = 50):
    """Get all articles (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        articles = db.query(Article).offset(skip).limit(limit).all()
        total = db.query(func.count(Article.id)).scalar()
        
        return {
            "articles": [
                {
                    "id": article.id,
                    "title": article.title,
                    "category": article.category,
                    "tags": article.tags,
                    "user_id": article.user_id,
                    "word_count": article.word_count,
                    "char_count": article.char_count,
                    "created_at": article.created_at.isoformat(),
                    "updated_at": article.updated_at.isoformat()
                }
                for article in articles
            ],
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Error getting articles: {e}")
        raise HTTPException(status_code=500, detail="Failed to get articles")

@app.post("/api/admin/create-admin-user")
async def create_admin_user_endpoint(request: Request, db: Session = Depends(get_db)):
    """Create admin user with email and password - one-time setup endpoint"""
    admin_email = 'admin@cfa187260.com'
    admin_password = 'Gern@828017'
    
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == admin_email).first()
        
        if existing_user:
            # Update existing user to admin
            existing_user.is_admin = True
            db.commit()
            db.refresh(existing_user)
            
            logger.info(f"✅ Admin privileges granted to existing user {admin_email}")
            return {
                "success": True,
                "message": f"Admin privileges granted to existing user {admin_email}",
                "user": {
                    "id": existing_user.id,
                    "email": existing_user.email,
                    "is_admin": existing_user.is_admin
                }
            }
        
        # Import password hashing function
        import bcrypt
        
        # Hash the password
        password_hash = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create new admin user
        new_admin = User(
            id=str(uuid.uuid4()),
            email=admin_email,
            password_hash=password_hash,
            first_name="Admin",
            last_name="User",
            auth_provider="local",
            subscription_tier="premium",
            is_active=True,
            is_admin=True
        )
        
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        
        logger.info(f"✅ Admin user created successfully: {admin_email}")
        
        return {
            "success": True,
            "message": f"Admin user created successfully: {admin_email}",
            "user": {
                "id": new_admin.id,
                "email": new_admin.email,
                "first_name": new_admin.first_name,
                "last_name": new_admin.last_name,
                "is_admin": new_admin.is_admin,
                "auth_provider": new_admin.auth_provider
            },
            "login_info": {
                "email": admin_email,
                "password": "Gern@828017",
                "note": "Use these credentials to sign in"
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Error creating admin user: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create admin user: {str(e)}")

@app.post("/api/admin/set-admin-user")
async def set_admin_user_endpoint(request: Request, db: Session = Depends(get_db)):
    """Set isky999@gmail.com as admin user - one-time setup endpoint"""
    admin_email = 'isky999@gmail.com'
    
    try:
        # Check if user exists
        existing_user = db.query(User).filter(User.email == admin_email).first()
        
        if not existing_user:
            raise HTTPException(status_code=404, detail=f"User with email {admin_email} not found. Please sign in first.")
        
        # Update user to admin
        existing_user.is_admin = True
        db.commit()
        db.refresh(existing_user)
        
        logger.info(f"✅ Admin privileges granted to {admin_email}")
        
        return {
            "success": True,
            "message": f"Admin privileges granted to {admin_email}",
            "user": {
                "id": existing_user.id,
                "email": existing_user.email,
                "name": f"{existing_user.first_name or ''} {existing_user.last_name or ''}".strip(),
                "is_admin": existing_user.is_admin
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Error setting admin user: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to set admin user: {str(e)}")

# Include admin diagnostic endpoints
from admin_diagnostic_api import admin_diagnostic_router
from session_diagnostic_api import session_diagnostic_router
from email_auth import email_auth_router
app.include_router(admin_diagnostic_router)
app.include_router(session_diagnostic_router)
app.include_router(email_auth_router)

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
