#!/usr/bin/env python3
"""
Script to manually apply the admin role migration.
Run this if the is_admin column is missing from the users table.
"""

import os
import sys
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def apply_admin_migration():
    """Apply the admin role migration manually"""
    
    # Get database URL from environment
    DATABASE_URL = os.getenv('DATABASE_URL', 'mysql+pymysql://mysql:password@localhost:3306/default')
    
    logger.info(f"Connecting to database...")
    
    try:
        # Create engine
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as conn:
            # Check if column exists
            logger.info("Checking if is_admin column exists...")
            
            result = conn.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'users' 
                  AND COLUMN_NAME = 'is_admin'
            """))
            
            column_exists = result.fetchone() is not None
            
            if column_exists:
                logger.info("✅ is_admin column already exists!")
            else:
                logger.info("❌ is_admin column does not exist. Adding it...")
                
                # Add the column
                conn.execute(text("""
                    ALTER TABLE `users` ADD COLUMN `is_admin` BOOLEAN NOT NULL DEFAULT false
                """))
                conn.commit()
                
                logger.info("✅ is_admin column added successfully!")
            
            # Set the admin user
            logger.info("Setting admin user (isky999@gmail.com)...")
            
            result = conn.execute(text("""
                UPDATE `users` SET `is_admin` = true WHERE `email` = 'isky999@gmail.com'
            """))
            conn.commit()
            
            rows_affected = result.rowcount
            if rows_affected > 0:
                logger.info(f"✅ Admin user updated successfully! ({rows_affected} rows affected)")
            else:
                logger.warning("⚠️  No user found with email 'isky999@gmail.com'. Admin role not set.")
            
            # Verify the setup
            logger.info("Verifying admin setup...")
            
            result = conn.execute(text("""
                SELECT email, is_admin 
                FROM `users` 
                WHERE `email` = 'isky999@gmail.com'
            """))
            
            admin_user = result.fetchone()
            if admin_user:
                email, is_admin = admin_user
                logger.info(f"✅ Admin user verification: {email} -> is_admin: {is_admin}")
            else:
                logger.warning("⚠️  Admin user not found in verification step.")
            
            # Show column info
            result = conn.execute(text("""
                SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'users' 
                  AND COLUMN_NAME = 'is_admin'
            """))
            
            column_info = result.fetchone()
            if column_info:
                name, col_type, default, nullable = column_info
                logger.info(f"📋 Column info: {name} {col_type} DEFAULT {default} {'NULL' if nullable == 'YES' else 'NOT NULL'}")
            
            logger.info("🎉 Migration completed successfully!")
            return True
            
    except OperationalError as e:
        logger.error(f"❌ Database error: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = apply_admin_migration()
    sys.exit(0 if success else 1)
