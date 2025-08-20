#!/usr/bin/env python3
"""
Admin User Diagnostic and Fix Script
This script will:
1. Check all users with admin privileges
2. Show detailed information about admin users
3. Optionally fix admin privileges (remove unauthorized admins)
"""

import os
import sys
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from database import SessionLocal, User

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def check_admin_users():
    """Check all admin users in the database"""
    
    db = SessionLocal()
    try:
        logger.info("🔍 Checking admin users in database...")
        
        # Get all admin users
        admin_users = db.query(User).filter(User.is_admin == True).all()
        
        logger.info(f"📊 Found {len(admin_users)} admin user(s)")
        print("\n" + "="*60)
        print("CURRENT ADMIN USERS:")
        print("="*60)
        
        if not admin_users:
            print("❌ No admin users found!")
            return []
        
        for i, user in enumerate(admin_users, 1):
            print(f"\n{i}. Admin User Details:")
            print(f"   Email: {user.email}")
            print(f"   Name: {user.first_name or 'N/A'} {user.last_name or 'N/A'}")
            print(f"   User ID: {user.id}")
            print(f"   Auth Provider: {user.auth_provider}")
            print(f"   Created: {user.created_at}")
            print(f"   Active: {user.is_active}")
            print(f"   Admin Status: {user.is_admin}")
            
            # Check if this is the expected admin
            if user.email == 'isky999@gmail.com':
                print("   ✅ This is the EXPECTED admin user")
            else:
                print("   ⚠️  This is NOT the expected admin user!")
        
        return admin_users
        
    except Exception as e:
        logger.error(f"❌ Error checking admin users: {e}")
        return []
    finally:
        db.close()

def check_specific_user(email):
    """Check a specific user's admin status"""
    
    db = SessionLocal()
    try:
        logger.info(f"🔍 Checking user: {email}")
        
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            logger.warning(f"❌ User {email} not found in database")
            return None
        
        print(f"\n📋 User Details for {email}:")
        print(f"   User ID: {user.id}")
        print(f"   Name: {user.first_name or 'N/A'} {user.last_name or 'N/A'}")
        print(f"   Auth Provider: {user.auth_provider}")
        print(f"   Is Admin: {user.is_admin}")
        print(f"   Is Active: {user.is_active}")
        print(f"   Created: {user.created_at}")
        print(f"   Updated: {user.updated_at}")
        
        return user
        
    except Exception as e:
        logger.error(f"❌ Error checking user {email}: {e}")
        return None
    finally:
        db.close()

def fix_admin_privileges():
    """Fix admin privileges - remove unauthorized admins and ensure correct admin"""
    
    db = SessionLocal()
    try:
        logger.info("🔧 Starting admin privilege fix...")
        
        # First, remove admin privileges from all users except the expected admin
        result = db.query(User).filter(
            User.is_admin == True,
            User.email != 'isky999@gmail.com'
        ).update({User.is_admin: False})
        
        unauthorized_admins_removed = result
        logger.info(f"🔄 Removed admin privileges from {unauthorized_admins_removed} unauthorized user(s)")
        
        # Ensure the expected admin has admin privileges
        expected_admin = db.query(User).filter(User.email == 'isky999@gmail.com').first()
        
        if expected_admin:
            if not expected_admin.is_admin:
                expected_admin.is_admin = True
                logger.info("✅ Granted admin privileges to isky999@gmail.com")
            else:
                logger.info("✅ isky999@gmail.com already has admin privileges")
        else:
            logger.warning("⚠️  Expected admin user (isky999@gmail.com) not found in database")
        
        # Commit changes
        db.commit()
        
        logger.info("🎉 Admin privilege fix completed!")
        
        # Verify the fix
        logger.info("🔍 Verifying admin users after fix...")
        admin_users_after = db.query(User).filter(User.is_admin == True).all()
        
        print(f"\n📊 Admin users after fix: {len(admin_users_after)}")
        for user in admin_users_after:
            print(f"   ✅ {user.email} - {user.first_name} {user.last_name}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error fixing admin privileges: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def main():
    """Main function with interactive menu"""
    
    print("🏠 Admin User Diagnostic Tool")
    print("="*50)
    
    while True:
        print("\nChoose an option:")
        print("1. Check all admin users")
        print("2. Check specific user (chenjg223157@gmail.com)")
        print("3. Check expected admin (isky999@gmail.com)")
        print("4. Fix admin privileges (remove unauthorized admins)")
        print("5. Exit")
        
        try:
            choice = input("\nEnter your choice (1-5): ").strip()
            
            if choice == '1':
                admin_users = check_admin_users()
                
            elif choice == '2':
                check_specific_user('chenjg223157@gmail.com')
                
            elif choice == '3':
                check_specific_user('isky999@gmail.com')
                
            elif choice == '4':
                confirm = input("⚠️  This will remove admin privileges from unauthorized users. Continue? (y/N): ").strip().lower()
                if confirm in ['y', 'yes']:
                    success = fix_admin_privileges()
                    if success:
                        print("✅ Admin privileges fixed successfully!")
                    else:
                        print("❌ Failed to fix admin privileges")
                else:
                    print("❌ Operation cancelled")
                    
            elif choice == '5':
                print("👋 Goodbye!")
                break
                
            else:
                print("❌ Invalid choice. Please enter 1-5.")
                
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            logger.error(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        sys.exit(1)
