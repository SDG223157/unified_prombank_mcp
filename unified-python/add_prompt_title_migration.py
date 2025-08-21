#!/usr/bin/env python3
"""
Migration script to add prompt_title column to articles table
and populate it with existing prompt titles
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

def run_migration():
    """Add prompt_title column and populate with existing data"""
    
    # Get database connection
    db = next(get_db())
    
    try:
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
        
        # Get all articles that have prompt_id
        articles_with_prompts = db.query(Article).filter(Article.prompt_id.isnot(None)).all()
        
        updated_count = 0
        for article in articles_with_prompts:
            # Get the prompt title
            prompt = db.query(Prompt).filter(Prompt.id == article.prompt_id).first()
            if prompt:
                article.prompt_title = prompt.title
                updated_count += 1
                logger.info(f"  📄 Updated article '{article.title}' with prompt title '{prompt.title}'")
        
        # Commit the changes
        db.commit()
        logger.info(f"✅ Migration completed successfully! Updated {updated_count} articles")
        
        return {
            "success": True,
            "message": f"Added prompt_title column and updated {updated_count} articles",
            "updated_articles": updated_count
        }
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        db.rollback()
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        db.close()

if __name__ == "__main__":
    result = run_migration()
    if result["success"]:
        print(f"✅ Migration successful: {result['message']}")
        sys.exit(0)
    else:
        print(f"❌ Migration failed: {result['error']}")
        sys.exit(1)
