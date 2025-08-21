#!/usr/bin/env python3
"""
Database migration: Add prompt_title column to articles table
This will be run automatically on deployment
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from database import get_db, Article, Prompt
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_add_prompt_title():
    """Add prompt_title column to articles table and populate existing data"""
    
    try:
        # Get database connection
        db = next(get_db())
        
        # Check if column already exists
        try:
            result = db.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'articles' 
                AND COLUMN_NAME = 'prompt_title'
            """)).fetchone()
            
            if result:
                logger.info("✅ prompt_title column already exists")
                return {"success": True, "message": "Column already exists", "already_migrated": True}
        except Exception as e:
            logger.info(f"Column check failed, proceeding with migration: {e}")
        
        # Add the prompt_title column
        logger.info("📝 Adding prompt_title column to articles table...")
        db.execute(text("""
            ALTER TABLE articles 
            ADD COLUMN prompt_title VARCHAR(500) NULL 
            COMMENT 'Title of the source prompt for easy identification'
        """))
        
        logger.info("✅ Column added successfully")
        
        # Populate existing articles with prompt titles
        logger.info("🔄 Populating existing articles with prompt titles...")
        
        articles_with_prompts = db.query(Article).filter(Article.prompt_id.isnot(None)).all()
        
        updated_count = 0
        for article in articles_with_prompts:
            prompt = db.query(Prompt).filter(Prompt.id == article.prompt_id).first()
            if prompt:
                article.prompt_title = prompt.title
                updated_count += 1
                logger.info(f"  📄 Updated: '{article.title}' ← '{prompt.title}'")
        
        db.commit()
        logger.info(f"✅ Migration completed! Updated {updated_count} articles")
        
        return {
            "success": True,
            "message": f"Added prompt_title column and updated {updated_count} articles",
            "updated_articles": updated_count
        }
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        if 'db' in locals():
            db.rollback()
        return {"success": False, "error": str(e)}
    finally:
        if 'db' in locals():
            db.close()

if __name__ == "__main__":
    result = migrate_add_prompt_title()
    if result["success"]:
        print(f"✅ {result['message']}")
        sys.exit(0)
    else:
        print(f"❌ Migration failed: {result['error']}")
        sys.exit(1)
