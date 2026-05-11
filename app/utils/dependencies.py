"""
FastAPI dependencies for authentication and authorization.
Supports dual-mode: HttpOnly Cookie (browser) + Bearer token (API scripts/external).
"""
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.utils.security import verify_token
from typing import Optional
import os

# Keep HTTPBearer for backward compatibility with external scripts
_bearer_scheme = HTTPBearer(auto_error=False)

# JWT Configuration (mirrors security.py)
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-CHANGE-IN-PRODUCTION-immediately")
ALGORITHM = "HS256"


def _extract_token_from_request(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials]
) -> Optional[str]:
    """
    Extract JWT from request using dual-mode strategy:
    1. HttpOnly Cookie 'access_token' (browser clients — most secure)
    2. Authorization: Bearer header (external scripts / API clients — backward compat)
    """
    # Priority 1: HttpOnly Cookie
    token = request.cookies.get("access_token")
    if token:
        return token

    # Priority 2: Bearer header (external API consumers, scripts)
    if credentials and credentials.credentials:
        return credentials.credentials

    return None


def verify_csrf_token(request: Request) -> None:
    """
    Verify CSRF token for state-changing requests (POST, PUT, DELETE, PATCH).
    Cookie-based clients MUST include X-CSRF-Token header.
    Bearer-only requests (scripts) skip CSRF check as they can't be CSRF-attacked.
    """
    # Only enforce CSRF for cookie-based sessions (not Bearer-only)
    is_cookie_session = bool(request.cookies.get("access_token"))
    is_bearer_only = not is_cookie_session and request.headers.get("Authorization")

    # Skip CSRF for Bearer-only requests (API scripts, external consumers)
    if is_bearer_only:
        return

    # Only check CSRF for mutating methods (GET is safe by design)
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    # Cookie session: require CSRF token header
    if is_cookie_session:
        csrf_header = request.headers.get("X-CSRF-Token")
        csrf_cookie = request.cookies.get("csrf_token")

        if not csrf_header or not csrf_cookie:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token missing"
            )

        if csrf_header != csrf_cookie:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token mismatch"
            )


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user.
    Reads JWT from HttpOnly cookie first, then falls back to Bearer header.
    """
    token = _extract_token_from_request(request, credentials)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    id_corporativo: str = payload.get("sub")
    if id_corporativo is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id_corporativo == id_corporativo).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    return user


def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Verify that current user has admin role."""
    if current_user.perfil and current_user.perfil.upper() != 'DIRECTOR':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Admin access required."
        )
    return current_user


def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise."""
    try:
        return get_current_user(request, credentials, db)
    except HTTPException:
        return None
