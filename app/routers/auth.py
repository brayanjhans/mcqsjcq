"""
Authentication router for user login, registration, PIN verification, and logout.
Uses HttpOnly cookies for secure session management in browser clients.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
import hashlib
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User, UserRole
from app.models.session import UserSession
from app.auth_schemas import (
    UserCreate,
    UserResponse,
    UserLogin,
    Token,
    PinVerification,
    PinVerificationResponse
)
from app.utils.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    generate_csrf_token,
    verify_admin_pin
)
from app.utils.dependencies import get_current_user, get_current_admin_user, verify_csrf_token
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Cookie settings — adjust for local dev vs production
COOKIE_SECURE = True       # Set False only for local HTTP dev if needed
COOKIE_SAMESITE = "strict"  # Prevents CSRF from cross-site requests
COOKIE_MAX_AGE = 86400     # 24 hours in seconds


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Register a new user (admin only).
    Only administrators can create new user accounts.
    """
    existing_user = db.query(User).filter(User.id_corporativo == user_data.id_corporativo).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID Corporativo ya está registrado"
        )

    if user_data.email:
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email ya está registrado"
            )

    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        id_corporativo=user_data.id_corporativo,
        nombre=user_data.nombre,
        email=user_data.email,
        password_hash=hashed_password,
        perfil=user_data.perfil,
        job_title=user_data.job_title,
        activo=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login")
@limiter.limit("5/minute")  # REGLA 1: Anti fuerza bruta — 5 intentos por minuto por IP
def login(
    credentials: UserLogin,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Login with id_corporativo and password.
    Sets HttpOnly cookie with JWT (inaccessible to JavaScript).
    Sets readable csrf_token cookie for CSRF protection.
    Returns minimal user info in body (no token — it's in the cookie).
    """
    user = db.query(User).filter(User.id_corporativo == credentials.id_corporativo).first()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cuenta de usuario inactiva"
        )

    # Create JWT access token
    access_token = create_access_token(
        data={
            "sub": user.id_corporativo,
            "role": user.perfil.value if hasattr(user.perfil, 'value') else user.perfil
        }
    )

    # Generate CSRF token (cryptographically random, not the JWT)
    csrf_token = generate_csrf_token()

    # --- Set HttpOnly Cookie (JWT — invisible to JavaScript) ---
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,           # JS cannot read this cookie (XSS protection)
        secure=COOKIE_SECURE,    # Only sent over HTTPS
        samesite=COOKIE_SAMESITE,  # CSRF protection
        max_age=COOKIE_MAX_AGE,
        path="/"
    )

    # --- Set readable CSRF Cookie (JavaScript CAN read this) ---
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,          # JS must be able to read this to send it as a header
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=COOKIE_MAX_AGE,
        path="/"
    )

    # Record session in DB
    user_agent = request.headers.get('user-agent')
    ip_address = request.client.host

    max_id_result = db.query(func.max(UserSession.id)).scalar()
    next_id = (max_id_result or 0) + 1

    new_session = UserSession(
        id=next_id,
        user_id=user.id,
        token_hash=hashlib.sha256(access_token.encode()).hexdigest(),
        ip_address=ip_address,
        user_agent=user_agent,
        device_type="Desktop" if "Windows" in str(user_agent) or "Macintosh" in str(user_agent) else "Mobile",
        is_active=True
    )
    db.add(new_session)
    db.commit()

    # Convert perfil to string
    perfil_value = str(user.perfil) if user.perfil else "COLABORADOR"

    print(f"\n=== LOGIN SEGURO ===")
    print(f"User: {user.id_corporativo} | Perfil: {perfil_value}")
    print(f"Cookie HttpOnly: access_token SET | CSRF token SET")
    print(f"Token en body: NO (cookie-only)\n")

    # Return MINIMAL data in body — no token, no sensitive IDs
    return {
        "ok": True,
        "perfil": perfil_value,
        "nombre": user.nombre,
        "job_title": user.job_title or ""
    }


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Logout: invalidate cookies and mark session as inactive in DB.
    """
    # Invalidate session in DB
    token = request.cookies.get("access_token")
    if token:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        session = db.query(UserSession).filter(
            UserSession.user_id == current_user.id,
            UserSession.token_hash == token_hash,
            UserSession.is_active == True
        ).first()
        if session:
            session.is_active = False
            db.commit()

    # Delete cookies by setting Max-Age=0
    response.delete_cookie(key="access_token", path="/", samesite=COOKIE_SAMESITE)
    response.delete_cookie(key="csrf_token", path="/", samesite=COOKIE_SAMESITE)

    return {"ok": True, "message": "Sesión cerrada correctamente"}


@router.post("/verify-pin", response_model=PinVerificationResponse)
def verify_pin(
    pin_data: PinVerification,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _csrf: None = Depends(verify_csrf_token)
):
    """
    Verify user's PIN for elevated access.
    """
    if not current_user.pin_hash:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have PIN access configured"
        )

    is_valid = verify_password(pin_data.pin, current_user.pin_hash)

    if is_valid:
        return {"valid": True, "message": "PIN verified successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid PIN"
        )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user information.
    Used by frontend to verify session validity after page refresh.
    """
    return current_user


@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    List all users (admin only).
    """
    users = db.query(User).all()
    return users
