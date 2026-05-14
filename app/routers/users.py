from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
from app.database import get_db
from app.models.user import User
from app.models.session import UserSession
from app.models.audit import AuditLog
from app.routers.auth import get_current_user
from app.schemas import UserUpdate, UserProfile, UserSessionSchema, PasswordChange, PinChange, AuditLogSchema, AdminUserUpdate
from app.utils.security import verify_password, get_password_hash

router = APIRouter(
    prefix="/api/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

@router.get("", response_model=List[UserProfile])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.perfil not in ['DIRECTOR', 'ADMIN', 'admin']:
        raise HTTPException(status_code=403, detail="No autorizado")
    return db.query(User).offset(skip).limit(limit).all()



@router.get("/me", response_model=UserProfile)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserProfile)
async def update_user_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Update fields
    if user_update.nombre is not None:
        current_user.nombre = user_update.nombre
    if user_update.apellidos is not None:
        current_user.apellidos = user_update.apellidos
    if user_update.email is not None:
        current_user.email = user_update.email
    if user_update.phone_number is not None:
        current_user.phone_number = user_update.phone_number
    if user_update.job_title is not None:
        current_user.job_title = user_update.job_title
    if user_update.preferences is not None:
        # Merge preferences instead of overwriting
        current_prefs = current_user.preferences or {}
        current_prefs.update(user_update.preferences)
        current_user.preferences = current_prefs

    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Create directory if not exists
    upload_dir = "frontend/public/uploads/avatars"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"user_{current_user.id}_avatar{file_extension}"
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update user profile
    # Store relative path for frontend
    relative_path = f"/uploads/avatars/{filename}"
    current_user.avatar_url = relative_path
    db.commit()
    
    return {"url": relative_path}

@router.delete("/me/avatar")
async def delete_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete current user's avatar."""
    if current_user.avatar_url:
        # Optional: Delete file from filesystem
        # try:
        #     file_path = f"frontend/public{current_user.avatar_url}"
        #     if os.path.exists(file_path):
        #         os.remove(file_path)
        # except Exception as e:
        #     print(f"Error deleting file: {e}")
            
        current_user.avatar_url = None
        db.commit()
        
    return {"message": "Avatar eliminado correctamente"}

@router.post("/me/signature")
async def upload_signature(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Create directory if not exists
    upload_dir = "frontend/public/uploads/signatures"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"user_{current_user.id}_signature{file_extension}"
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update user profile
    relative_path = f"/uploads/signatures/{filename}"
    current_user.digital_signature_url = relative_path
    db.commit()
    
    return {"url": relative_path}

@router.get("/me/sessions", response_model=List[UserSessionSchema])
async def get_active_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active == True
    ).all()

@router.delete("/me/sessions/{session_id}")
async def revoke_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session.is_active = False
    db.commit()
    
    return {"message": "Session revoked"}

@router.put("/me/password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")
    
    # Verify new passwords match
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(status_code=400, detail="Las nuevas contraseñas no coinciden")
        
    # Update password
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()
    
    return {"message": "Contraseña actualizada correctamente"}

@router.put("/me/pin")
async def change_pin(
    pin_data: PinChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify current PIN (if exists)
    if current_user.pin_hash:
        if not verify_password(pin_data.current_pin, current_user.pin_hash):
            raise HTTPException(status_code=400, detail="El PIN actual es incorrecto")
    
    # Verify new PINs match
    if pin_data.new_pin != pin_data.confirm_pin:
        raise HTTPException(status_code=400, detail="Los nuevos PINs no coinciden")
        
    # Validate PIN format (6 digits)
    if not pin_data.new_pin.isdigit() or len(pin_data.new_pin) != 6:
        raise HTTPException(status_code=400, detail="El PIN debe ser de 6 dígitos numéricos")
        
    # Update PIN
    current_user.pin_hash = get_password_hash(pin_data.new_pin)
    db.commit()
    
    return {"message": "PIN de seguridad actualizado correctamente"}

@router.get("/me/audit-logs", response_model=List[AuditLogSchema])
async def get_audit_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id
    ).order_by(AuditLog.created_at.desc()).limit(50).all()

@router.put("/{user_id}", response_model=UserProfile)
async def update_user_admin(
    user_id: int,
    user_update: AdminUserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.perfil not in ['DIRECTOR', 'ADMIN', 'admin']:
        raise HTTPException(status_code=403, detail="No autorizado. Solo los directores pueden editar usuarios.")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if user_update.id_corporativo:
        # Check if exists
        existing = db.query(User).filter(User.id_corporativo == user_update.id_corporativo).first()
        if existing and existing.id != user_id:
            raise HTTPException(status_code=400, detail="ID Corporativo ya existe")
        user.id_corporativo = user_update.id_corporativo

    if user_update.password:
        user.password_hash = get_password_hash(user_update.password)
    
    if user_update.nombre: user.nombre = user_update.nombre
    if user_update.apellidos: user.apellidos = user_update.apellidos
    if user_update.email: user.email = user_update.email
    if user_update.perfil: user.perfil = user_update.perfil
    if user_update.activo is not None: user.activo = user_update.activo

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a user (admin only).
    Requires DIRECTOR role. Cannot delete yourself.
    """
    # Check admin permission
    if current_user.perfil not in ['DIRECTOR', 'ADMIN', 'admin']:
        raise HTTPException(status_code=403, detail="No autorizado. Solo los directores pueden eliminar usuarios.")
    
    # Prevent self-deletion
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta.")
    
    # Find user to delete
    user_to_delete = db.query(User).filter(User.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Delete user (cascading deletes will handle related records)
    db.delete(user_to_delete)
    db.commit()
    
    return {"message": f"Usuario {user_to_delete.id_corporativo} eliminado correctamente"}
