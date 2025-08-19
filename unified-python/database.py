import os
import time
import logging
from sqlalchemy import create_engine, text, Column, String, DateTime, Boolean, Integer, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import OperationalError
from datetime import datetime

logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'mysql+pymysql://mysql:password@localhost:3306/default')

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=False,
    connect_args={"charset": "utf8mb4"}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(String(255), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    google_id = Column(String(255), unique=True, nullable=True)
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    profile_picture = Column(String(500), nullable=True)
    auth_provider = Column(String(50), default="local")
    subscription_tier = Column(String(50), default="free")
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Prompt(Base):
    __tablename__ = "prompts"
    
    id = Column(String(255), primary_key=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    tags = Column(JSON, default=list)
    is_public = Column(Boolean, default=False)
    category = Column(String(255), nullable=True)
    version = Column(Integer, default=1)
    parent_id = Column(String(255), nullable=True)
    user_id = Column(String(255), nullable=False)
    variables = Column(JSON, default=list)
    prompt_metadata = Column(JSON, default=dict)
    template_id = Column(String(255), nullable=True)
    word_count = Column(Integer, nullable=True)
    char_count = Column(Integer, nullable=True)
    estimated_tokens = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Token(Base):
    __tablename__ = "tokens"
    
    id = Column(String(255), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    token_hash = Column(String(255), nullable=False)  # Hashed version of the token
    user_id = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime, nullable=True)
    usage_count = Column(Integer, default=0)
    permissions = Column(JSON, default=list)  # List of permissions like ['read', 'write']
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Article(Base):
    __tablename__ = "articles"
    
    id = Column(String(255), primary_key=True)
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)  # LONGTEXT for large markdown content
    category = Column(String(255), nullable=True)
    tags = Column(JSON, default=list)
    prompt_id = Column(String(255), nullable=True)  # Optional reference to source prompt
    user_id = Column(String(255), nullable=False)
    word_count = Column(Integer, nullable=True)
    char_count = Column(Integer, nullable=True)
    metadata = Column(JSON, default=dict)  # Additional metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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

def create_tables():
    """Create database tables"""
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created/verified")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        raise

def get_database_session():
    """Get database session"""
    return SessionLocal()
