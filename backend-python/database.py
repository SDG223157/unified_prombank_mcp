import os
import time
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
import logging

logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'mysql+pymysql://mysql:password@localhost:3306/default')

# Convert Node.js style URL to Python style if needed
if DATABASE_URL.startswith('mysql://'):
    DATABASE_URL = DATABASE_URL.replace('mysql://', 'mysql+pymysql://', 1)

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def connect_with_retry(retries=5, delay=2000):
    """Connect to database with retry logic"""
    for i in range(retries):
        try:
            print(f"🔄 Attempting database connection (attempt {i + 1}/{retries})")
            
            # Test connection
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                result.fetchone()
            
            print(f"✅ Database connected successfully on attempt {i + 1}")
            return True
            
        except OperationalError as error:
            print(f"❌ Database connection attempt {i + 1} failed: {error}")
            
            if i < retries - 1:
                wait_time = delay / 1000  # Convert to seconds
                print(f"⏳ Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
                delay = min(delay * 1.5, 10000)  # Exponential backoff, max 10s
    
    raise Exception(f"Failed to connect to database after {retries} attempts")

def get_database():
    """Get database session"""
    return SessionLocal()

# Test database connection on import
if __name__ == "__main__":
    import asyncio
    asyncio.run(connect_with_retry())
