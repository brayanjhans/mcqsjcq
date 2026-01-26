"""
Notification Model - Sistema de notificaciones
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class NotificationType(str, enum.Enum):
    """Tipos de notificaciones"""
    LICITACION = "licitacion"
    CARTA_FIANZA = "carta_fianza"
    ADJUDICACION = "adjudicacion"
    CONSORCIO = "consorcio"
    REPORTE = "reporte"
    SISTEMA = "sistema"


class NotificationPriority(str, enum.Enum):
    """Prioridades de notificaciones"""
    HIGH = "high"      # Rojo - Urgente
    MEDIUM = "medium"  # Amarillo - Importante
    LOW = "low"        # Azul - Informativo


class Notification(Base):
    """Modelo de notificaciones"""
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    type = Column(Enum(NotificationType), nullable=False)
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.LOW)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String(500), nullable=True)  # URL para navegar
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    extra_data = Column(JSON, nullable=True) # Renamed from metadata to avoid reserved keyword conflict
    
    # Relación con User
    user = relationship("User", back_populates="notifications")
    
    def mark_as_read(self):
        """Marcar notificación como leída"""
        self.is_read = True
    
    def is_expired(self):
        """Verificar si la notificación ha expirado"""
        if self.expires_at is None:
            return False
        from datetime import datetime, timezone
        return datetime.now(timezone.utc) > self.expires_at
