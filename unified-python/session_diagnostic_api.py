#!/usr/bin/env python3
"""
Session Diagnostic API
This helps debug authentication and session issues
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from database import get_db, User
from auth import get_current_user
import logging

logger = logging.getLogger(__name__)

# Create router for session diagnostic endpoints
session_diagnostic_router = APIRouter(prefix="/api/session-diagnostic", tags=["session-diagnostic"])

@session_diagnostic_router.get("/current-user")
async def get_current_user_info(request: Request, db: Session = Depends(get_db)):
    """Get information about the currently logged in user"""
    try:
        # Try to get current user from session/auth
        current_user = get_current_user(request, db)
        
        if not current_user:
            return {
                "authenticated": False,
                "session_data": dict(request.session),
                "message": "No user currently authenticated"
            }
        
        return {
            "authenticated": True,
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "first_name": current_user.first_name,
                "last_name": current_user.last_name,
                "is_admin": current_user.is_admin,
                "is_active": current_user.is_active,
                "auth_provider": current_user.auth_provider,
                "google_id": current_user.google_id,
                "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
                "updated_at": current_user.updated_at.isoformat() if current_user.updated_at else None
            },
            "session_data": dict(request.session),
            "admin_status_analysis": {
                "is_admin": current_user.is_admin,
                "should_be_admin": current_user.email == 'isky999@gmail.com',
                "admin_status_correct": (current_user.email == 'isky999@gmail.com' and current_user.is_admin) or (current_user.email != 'isky999@gmail.com' and not current_user.is_admin),
                "admin_issue_detected": current_user.email != 'isky999@gmail.com' and current_user.is_admin
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting current user info: {e}")
        return {
            "error": str(e),
            "session_data": dict(request.session),
            "authenticated": False
        }

@session_diagnostic_router.get("/search-user-by-email/{email}")
async def search_user_by_email(email: str, db: Session = Depends(get_db)):
    """Search for user by email with detailed info"""
    try:
        # Search by exact email
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Also search by partial email or case insensitive
            users_partial = db.query(User).filter(User.email.ilike(f"%{email}%")).all()
            
            return {
                "exact_match_found": False,
                "partial_matches": len(users_partial),
                "partial_match_users": [
                    {
                        "id": u.id,
                        "email": u.email,
                        "first_name": u.first_name,
                        "last_name": u.last_name,
                        "is_admin": u.is_admin,
                        "auth_provider": u.auth_provider
                    } for u in users_partial
                ],
                "message": f"No exact match found for {email}"
            }
        
        return {
            "exact_match_found": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_admin": user.is_admin,
                "is_active": user.is_active,
                "auth_provider": user.auth_provider,
                "google_id": user.google_id,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None
            },
            "admin_analysis": {
                "is_admin": user.is_admin,
                "should_be_admin": user.email == 'isky999@gmail.com',
                "admin_status_correct": (user.email == 'isky999@gmail.com' and user.is_admin) or (user.email != 'isky999@gmail.com' and not user.is_admin),
                "unauthorized_admin": user.email != 'isky999@gmail.com' and user.is_admin
            }
        }
        
    except Exception as e:
        logger.error(f"Error searching for user {email}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search for user: {str(e)}")

@session_diagnostic_router.get("/all-users-detailed")
async def get_all_users_detailed(db: Session = Depends(get_db)):
    """Get all users with detailed information"""
    try:
        users = db.query(User).all()
        
        result = {
            "total_users": len(users),
            "users": [],
            "admin_summary": {
                "total_admins": 0,
                "expected_admin_found": False,
                "unauthorized_admins": []
            }
        }
        
        for user in users:
            user_data = {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_admin": user.is_admin,
                "is_active": user.is_active,
                "auth_provider": user.auth_provider,
                "google_id": user.google_id,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None
            }
            
            result["users"].append(user_data)
            
            # Admin analysis
            if user.is_admin:
                result["admin_summary"]["total_admins"] += 1
                if user.email == 'isky999@gmail.com':
                    result["admin_summary"]["expected_admin_found"] = True
                else:
                    result["admin_summary"]["unauthorized_admins"].append({
                        "email": user.email,
                        "name": f"{user.first_name} {user.last_name}",
                        "auth_provider": user.auth_provider
                    })
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting all users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get users: {str(e)}")

@session_diagnostic_router.post("/fix-specific-user-admin/{email}")
async def fix_specific_user_admin(email: str, db: Session = Depends(get_db)):
    """Remove admin privileges from a specific user"""
    try:
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            raise HTTPException(status_code=404, detail=f"User {email} not found")
        
        was_admin = user.is_admin
        
        # Remove admin privileges if not the expected admin
        if user.email != 'isky999@gmail.com' and user.is_admin:
            user.is_admin = False
            db.commit()
            db.refresh(user)
            
            return {
                "success": True,
                "message": f"Removed admin privileges from {email}",
                "user": {
                    "email": user.email,
                    "was_admin": was_admin,
                    "is_admin_now": user.is_admin
                }
            }
        elif user.email == 'isky999@gmail.com':
            return {
                "success": True,
                "message": f"{email} is the expected admin user, no changes made",
                "user": {
                    "email": user.email,
                    "was_admin": was_admin,
                    "is_admin_now": user.is_admin
                }
            }
        else:
            return {
                "success": True,
                "message": f"{email} was already not an admin",
                "user": {
                    "email": user.email,
                    "was_admin": was_admin,
                    "is_admin_now": user.is_admin
                }
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fixing admin for user {email}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to fix admin privileges: {str(e)}")

@session_diagnostic_router.get("/debug-auth-flow")
async def debug_auth_flow(request: Request, db: Session = Depends(get_db)):
    """Debug the authentication flow"""
    try:
        session_data = dict(request.session)
        headers = dict(request.headers)
        
        # Try to get user from session
        user_id = session_data.get('user_id')
        user_from_session = None
        if user_id:
            user_from_session = db.query(User).filter(User.id == user_id).first()
        
        # Try to get user from auth
        current_user = get_current_user(request, db)
        
        return {
            "session_info": {
                "session_data": session_data,
                "user_id_in_session": user_id,
                "user_from_session": {
                    "found": user_from_session is not None,
                    "email": user_from_session.email if user_from_session else None,
                    "is_admin": user_from_session.is_admin if user_from_session else None
                } if user_from_session else None
            },
            "current_user_info": {
                "found": current_user is not None,
                "email": current_user.email if current_user else None,
                "is_admin": current_user.is_admin if current_user else None,
                "id": current_user.id if current_user else None
            } if current_user else None,
            "auth_headers": {
                "authorization": headers.get('authorization'),
                "x-api-token": headers.get('x-api-token')
            }
        }
        
    except Exception as e:
        logger.error(f"Error debugging auth flow: {e}")
        return {
            "error": str(e),
            "session_data": dict(request.session)
        }
