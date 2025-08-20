#!/usr/bin/env python3
"""
Email/Password Authentication System
Handles traditional email/password registration and login alongside Google OAuth
"""

import os
import uuid
import re
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request, Form
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, validator
from database import get_db, User
from auth import create_access_token, get_current_user
import logging

logger = logging.getLogger(__name__)

# Create router for email authentication
email_auth_router = APIRouter(prefix="/api/auth", tags=["email-auth"])

# Templates
templates = Jinja2Templates(directory="templates")

# Pydantic models for request validation
class UserRegistration(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('Password must contain at least one letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one number')
        return v
    
    @validator('first_name', 'last_name')
    def validate_names(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Name cannot be empty')
        if len(v.strip()) > 50:
            raise ValueError('Name cannot be longer than 50 characters')
        return v.strip()

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('Password must contain at least one letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one number')
        return v

# Password hashing utilities
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_user_from_email(user_data: UserRegistration, db: Session) -> User:
    """Create a new user from email registration"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Hash the password
    hashed_password = hash_password(user_data.password)
    
    # Create new user
    new_user = User(
        id=str(uuid.uuid4()),
        email=user_data.email,
        password_hash=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        auth_provider='local',
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def authenticate_user(email: str, password: str, db: Session) -> Optional[User]:
    """Authenticate a user with email and password"""
    user = db.query(User).filter(
        User.email == email,
        User.auth_provider == 'local',
        User.is_active == True
    ).first()
    
    if not user or not user.password_hash:
        return None
    
    if not verify_password(password, user.password_hash):
        return None
    
    return user

# API Endpoints
@email_auth_router.post("/register")
async def register_user(request: Request, user_data: UserRegistration, db: Session = Depends(get_db)):
    """Register a new user with email and password"""
    try:
        # Create the user
        new_user = create_user_from_email(user_data, db)
        
        # Create JWT token
        jwt_token = create_access_token({"sub": new_user.id, "email": new_user.email})
        
        # Store user ID in session
        request.session['user_id'] = new_user.id
        request.session['access_token'] = jwt_token
        
        logger.info(f"New user registered: {new_user.email}")
        
        return {
            "success": True,
            "message": "User registered successfully",
            "user": {
                "id": new_user.id,
                "email": new_user.email,
                "first_name": new_user.first_name,
                "last_name": new_user.last_name,
                "is_admin": new_user.is_admin
            },
            "token": jwt_token
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@email_auth_router.post("/login")
async def login_user(request: Request, user_data: UserLogin, db: Session = Depends(get_db)):
    """Login user with email and password"""
    try:
        # Authenticate user
        user = authenticate_user(user_data.email, user_data.password, db)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Create JWT token
        jwt_token = create_access_token({"sub": user.id, "email": user.email})
        
        # Store user ID in session
        request.session['user_id'] = user.id
        request.session['access_token'] = jwt_token
        
        logger.info(f"User logged in: {user.email}")
        
        return {
            "success": True,
            "message": "Login successful",
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_admin": user.is_admin
            },
            "token": jwt_token
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@email_auth_router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    try:
        if current_user.auth_provider != 'local' or not current_user.password_hash:
            raise HTTPException(status_code=400, detail="Password change not available for OAuth users")
        
        # Verify current password
        if not verify_password(password_data.current_password, current_user.password_hash):
            raise HTTPException(status_code=401, detail="Current password is incorrect")
        
        # Hash new password
        new_hashed_password = hash_password(password_data.new_password)
        
        # Update user password
        current_user.password_hash = new_hashed_password
        current_user.updated_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Password changed for user: {current_user.email}")
        
        return {
            "success": True,
            "message": "Password changed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password change error: {e}")
        raise HTTPException(status_code=500, detail="Password change failed")

# Form-based endpoints (for HTML forms)
@email_auth_router.post("/register-form")
async def register_user_form(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    db: Session = Depends(get_db)
):
    """Register user via HTML form"""
    try:
        # Validate form data
        user_data = UserRegistration(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        
        # Create the user
        new_user = create_user_from_email(user_data, db)
        
        # Create JWT token
        jwt_token = create_access_token({"sub": new_user.id, "email": new_user.email})
        
        # Store user ID in session
        request.session['user_id'] = new_user.id
        request.session['access_token'] = jwt_token
        
        logger.info(f"New user registered via form: {new_user.email}")
        
        # Redirect to dashboard
        return RedirectResponse(url="/dashboard?auth=success", status_code=303)
        
    except HTTPException as e:
        # Redirect back to register with error
        return RedirectResponse(url=f"/register?error={e.detail}", status_code=303)
    except Exception as e:
        logger.error(f"Form registration error: {e}")
        return RedirectResponse(url="/register?error=Registration failed", status_code=303)

@email_auth_router.post("/login-form")
async def login_user_form(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Login user via HTML form"""
    try:
        # Authenticate user
        user = authenticate_user(email, password, db)
        
        if not user:
            return RedirectResponse(url="/login?error=Invalid email or password", status_code=303)
        
        # Create JWT token
        jwt_token = create_access_token({"sub": user.id, "email": user.email})
        
        # Store user ID in session
        request.session['user_id'] = user.id
        request.session['access_token'] = jwt_token
        
        logger.info(f"User logged in via form: {user.email}")
        
        # Redirect to dashboard
        return RedirectResponse(url="/dashboard?auth=success", status_code=303)
        
    except Exception as e:
        logger.error(f"Form login error: {e}")
        return RedirectResponse(url="/login?error=Login failed", status_code=303)

# User info endpoint
@email_auth_router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "auth_provider": current_user.auth_provider,
        "is_admin": current_user.is_admin,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }
