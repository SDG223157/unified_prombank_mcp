#!/usr/bin/env python3

import os
import sys
import logging
from sqlalchemy.orm import Session
from database import SessionLocal, User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def set_admin_user():
    admin_email = 'isky999@gmail.com'
    
    db = SessionLocal()
    try:
        # Check if user exists
        existing_user = db.query(User).filter(User.email == admin_email).first()
        
        if not existing_user:
            logger.error(f"❌ User with email {admin_email} not found. Please create the user first.")
            return False
        
        # Update user to admin
        existing_user.is_admin = True
        db.commit()
        db.refresh(existing_user)
        
        logger.info("✅ Admin user set successfully:")
        logger.info(f"   Email: {existing_user.email}")
        logger.info(f"   Name: {existing_user.first_name} {existing_user.last_name}")
        logger.info(f"   Admin: {existing_user.is_admin}")
        logger.info(f"   User ID: {existing_user.id}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error setting admin user: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = set_admin_user()
    sys.exit(0 if success else 1)
