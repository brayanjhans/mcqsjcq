"""
Database configuration and session management.
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection URL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:123456789@localhost:3306/garantias_seace"
)

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using them
    pool_size=50,        # Increase base pool size (was 20)
    max_overflow=20,     # Allow 20 extra connections (was 10)
    pool_timeout=30,     # Timeout after 30 seconds if no connection available
    pool_recycle=1800,   # Recycle connections after 30 minutes
    echo=False,          # Set to True for SQL query logging
    connect_args={'charset': 'utf8mb4'} # Fix for upside-down question marks and emojis/accents
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


# Dependency for FastAPI routes
def get_db():
    """
    Database session dependency for FastAPI.
    Yields a database session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
