import os
import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer
from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from database import get_db, User, Token
import httpx
import secrets
import hashlib

# JWT Configuration
JWT_SECRET = os.getenv('JWT_SECRET')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# OAuth Configuration
oauth = OAuth()

def setup_oauth():
    """Setup Google OAuth client"""
    google_client_id = os.getenv('GOOGLE_CLIENT_ID')
    google_client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
    
    if not google_client_id or not google_client_secret:
        print("⚠️  Google OAuth credentials not found in environment variables")
        return None
    
    oauth.register(
        name='google',
        client_id=google_client_id,
        client_secret=google_client_secret,
        authorization_endpoint='https://accounts.google.com/o/oauth2/auth',
        token_endpoint='https://oauth2.googleapis.com/token',
        userinfo_endpoint='https://www.googleapis.com/oauth2/v2/userinfo',
        client_kwargs={
            'scope': 'openid email profile'
        }
    )
    return oauth.google

# Security scheme
security = HTTPBearer(auto_error=False)

def create_access_token(data: dict) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

def get_current_user(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """Get current user from session or token"""
    # Try to get user from session first
    user_id = request.session.get('user_id')
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            return user
    
    # Try to get user from Authorization header
    authorization = request.headers.get('Authorization')
    if authorization and authorization.startswith('Bearer '):
        token = authorization.split(' ')[1]
        payload = verify_token(token)
        if payload:
            user_id = payload.get('sub')
            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    return user
    
    return None

def require_auth(request: Request, db: Session = Depends(get_db)) -> User:
    """Require authentication, raise 401 if not authenticated"""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

async def create_or_update_user_from_google(google_user_info: dict, db: Session) -> User:
    """Create or update user from Google OAuth info"""
    google_id = google_user_info.get('sub')
    email = google_user_info.get('email')
    first_name = google_user_info.get('given_name', '')
    last_name = google_user_info.get('family_name', '')
    profile_picture = google_user_info.get('picture', '')
    
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.google_id == google_id) | (User.email == email)
    ).first()
    
    if existing_user:
        # Update existing user
        existing_user.google_id = google_id
        existing_user.first_name = first_name
        existing_user.last_name = last_name
        existing_user.profile_picture = profile_picture
        existing_user.auth_provider = 'google'
        existing_user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_user)
        return existing_user
    else:
        # Create new user
        new_user = User(
            id=str(uuid.uuid4()),
            email=email,
            google_id=google_id,
            first_name=first_name,
            last_name=last_name,
            profile_picture=profile_picture,
            auth_provider='google',
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

def generate_api_token() -> str:
    """Generate a secure API token"""
    return secrets.token_urlsafe(32)

def hash_token(token: str) -> str:
    """Hash a token for secure storage"""
    return hashlib.sha256(token.encode()).hexdigest()

def verify_api_token(token: str, db: Session) -> Optional[User]:
    """Verify API token and return associated user"""
    if not token:
        return None
    
    token_hash = hash_token(token)
    token_record = db.query(Token).filter(
        Token.token_hash == token_hash,
        Token.is_active == True
    ).first()
    
    if not token_record:
        return None
    
    # Update last used timestamp and usage count
    token_record.last_used_at = datetime.utcnow()
    token_record.usage_count += 1
    db.commit()
    
    # Get the user
    user = db.query(User).filter(User.id == token_record.user_id).first()
    return user

def get_current_user_or_token(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """Get current user from session, JWT token, or API token"""
    # Try session first
    user = get_current_user(request, db)
    if user:
        return user
    
    # Try API token from header
    api_token = request.headers.get('X-API-Token') or request.headers.get('Authorization', '').replace('Bearer ', '')
    if api_token:
        return verify_api_token(api_token, db)
    
    return None
