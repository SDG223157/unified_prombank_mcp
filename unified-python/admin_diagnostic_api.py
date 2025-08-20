#!/usr/bin/env python3
"""
Admin Diagnostic API Endpoint
This creates API endpoints that can be called from your deployed Coolify application
to investigate and fix admin user issues.

Add these endpoints to your main.py or call this script directly.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from database import get_db, User
import logging

logger = logging.getLogger(__name__)

# Create router for admin diagnostic endpoints
admin_diagnostic_router = APIRouter(prefix="/api/admin-diagnostic", tags=["admin-diagnostic"])

@admin_diagnostic_router.get("/check-all-admins")
async def check_all_admin_users(db: Session = Depends(get_db)):
    """Check all users with admin privileges"""
    try:
        admin_users = db.query(User).filter(User.is_admin == True).all()
        
        result = {
            "total_admin_users": len(admin_users),
            "admin_users": [],
            "expected_admin_found": False,
            "unauthorized_admins": []
        }
        
        for user in admin_users:
            user_data = {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "auth_provider": user.auth_provider,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None
            }
            
            result["admin_users"].append(user_data)
            
            if user.email == 'isky999@gmail.com':
                result["expected_admin_found"] = True
                user_data["is_expected_admin"] = True
            else:
                result["unauthorized_admins"].append(user_data)
                user_data["is_expected_admin"] = False
        
        return result
        
    except Exception as e:
        logger.error(f"Error checking admin users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check admin users: {str(e)}")

@admin_diagnostic_router.get("/check-user/{email}")
async def check_specific_user(email: str, db: Session = Depends(get_db)):
    """Check a specific user's admin status"""
    try:
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            raise HTTPException(status_code=404, detail=f"User with email {email} not found")
        
        return {
            "user_found": True,
            "user_details": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_admin": user.is_admin,
                "is_active": user.is_active,
                "auth_provider": user.auth_provider,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None
            },
            "is_expected_admin": user.email == 'isky999@gmail.com',
            "should_be_admin": user.email == 'isky999@gmail.com',
            "admin_status_correct": (user.email == 'isky999@gmail.com' and user.is_admin) or (user.email != 'isky999@gmail.com' and not user.is_admin)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking user {email}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check user: {str(e)}")

@admin_diagnostic_router.post("/fix-admin-privileges")
async def fix_admin_privileges(request: Request, db: Session = Depends(get_db)):
    """Fix admin privileges - remove unauthorized admins and ensure correct admin"""
    try:
        # Get current state
        all_admins_before = db.query(User).filter(User.is_admin == True).all()
        
        # Remove admin privileges from unauthorized users
        unauthorized_result = db.query(User).filter(
            User.is_admin == True,
            User.email != 'isky999@gmail.com'
        ).update({User.is_admin: False})
        
        # Ensure the expected admin has admin privileges
        expected_admin = db.query(User).filter(User.email == 'isky999@gmail.com').first()
        expected_admin_updated = False
        
        if expected_admin:
            if not expected_admin.is_admin:
                expected_admin.is_admin = True
                expected_admin_updated = True
        
        # Commit changes
        db.commit()
        
        # Get final state
        all_admins_after = db.query(User).filter(User.is_admin == True).all()
        
        result = {
            "success": True,
            "changes_made": {
                "unauthorized_admins_removed": unauthorized_result,
                "expected_admin_updated": expected_admin_updated,
                "expected_admin_found": expected_admin is not None
            },
            "before_fix": {
                "total_admins": len(all_admins_before),
                "admin_emails": [user.email for user in all_admins_before]
            },
            "after_fix": {
                "total_admins": len(all_admins_after),
                "admin_emails": [user.email for user in all_admins_after]
            },
            "message": "Admin privileges have been corrected"
        }
        
        if not expected_admin:
            result["warning"] = "Expected admin user (isky999@gmail.com) not found in database"
        
        return result
        
    except Exception as e:
        logger.error(f"Error fixing admin privileges: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to fix admin privileges: {str(e)}")

@admin_diagnostic_router.get("/database-stats")
async def get_database_stats(db: Session = Depends(get_db)):
    """Get general database statistics"""
    try:
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        admin_users = db.query(User).filter(User.is_admin == True).count()
        google_users = db.query(User).filter(User.auth_provider == 'google').count()
        local_users = db.query(User).filter(User.auth_provider == 'local').count()
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "admin_users": admin_users,
            "google_auth_users": google_users,
            "local_auth_users": local_users,
            "inactive_users": total_users - active_users
        }
        
    except Exception as e:
        logger.error(f"Error getting database stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get database stats: {str(e)}")

# Standalone script functionality
if __name__ == "__main__":
    import sys
    from database import SessionLocal
    
    def run_diagnostic():
        """Run diagnostic as standalone script"""
        db = SessionLocal()
        try:
            print("🔍 Admin User Diagnostic Report")
            print("=" * 50)
            
            # Check all admin users
            admin_users = db.query(User).filter(User.is_admin == True).all()
            print(f"\n📊 Total admin users: {len(admin_users)}")
            
            expected_admin_found = False
            unauthorized_admins = []
            
            for user in admin_users:
                print(f"\n👤 Admin User:")
                print(f"   Email: {user.email}")
                print(f"   Name: {user.first_name} {user.last_name}")
                print(f"   Auth Provider: {user.auth_provider}")
                print(f"   Active: {user.is_active}")
                print(f"   Created: {user.created_at}")
                
                if user.email == 'isky999@gmail.com':
                    print("   ✅ EXPECTED admin user")
                    expected_admin_found = True
                else:
                    print("   ⚠️  UNAUTHORIZED admin user")
                    unauthorized_admins.append(user)
            
            print(f"\n📋 Summary:")
            print(f"   Expected admin found: {'✅ Yes' if expected_admin_found else '❌ No'}")
            print(f"   Unauthorized admins: {len(unauthorized_admins)}")
            
            if unauthorized_admins:
                print(f"\n⚠️  Unauthorized admin users:")
                for user in unauthorized_admins:
                    print(f"   - {user.email} ({user.first_name} {user.last_name})")
            
            return len(unauthorized_admins) == 0 and expected_admin_found
            
        finally:
            db.close()
    
    # Run the diagnostic
    success = run_diagnostic()
    sys.exit(0 if success else 1)
