"""
Security utilities for password hashing, JWT tokens, and CSRF token generation.
"""
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from werkzeug.security import generate_password_hash, check_password_hash


# JWT Configuration — read from environment, fallback for local dev only
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-CHANGE-IN-PRODUCTION-immediately")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours (was 30 days — reduced for security)

# CSRF Configuration
CSRF_SECRET = os.getenv("CSRF_SECRET", "dev-csrf-secret-CHANGE-IN-PRODUCTION-immediately")

# Admin PIN — in production, store this in env or DB
ADMIN_PIN = os.getenv("ADMIN_PIN", "123456")
ADMIN_PIN_HASH = generate_password_hash(ADMIN_PIN)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash using werkzeug.

    Args:
        plain_password: The plain text password
        hashed_password: The hashed password from database

    Returns:
        True if password matches, False otherwise
    """
    try:
        return check_password_hash(hashed_password, plain_password)
    except Exception as e:
        print(f"Error verifying password: {e}")
        return False


def get_password_hash(password: str) -> str:
    """
    Hash a password using werkzeug.

    Args:
        password: Plain text password

    Returns:
        Hashed password
    """
    return generate_password_hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def generate_csrf_token() -> str:
    """
    Generate a cryptographically secure random CSRF token.
    Uses secrets.token_hex for unpredictable 64-character hex strings.
    """
    return secrets.token_hex(32)


def verify_admin_pin(pin: str) -> bool:
    """Verify admin PIN."""
    return pin == ADMIN_PIN
