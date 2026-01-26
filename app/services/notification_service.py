"""
Notification Service - Lógica de negocio para notificaciones
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from app.models.notification import Notification, NotificationType, NotificationPriority


class NotificationService:
    """Servicio para gestionar notificaciones"""
    
    @staticmethod
    def create_notification(
        db: Session,
        user_id: int,
        type: NotificationType,
        priority: NotificationPriority,
        title: str,
        message: str,
        link: Optional[str] = None,
        metadata: Optional[dict] = None,
        expires_days: Optional[int] = 30
    ) -> Notification:
        """Crear una nueva notificación"""
        expires_at = None
        if expires_days:
            expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)
        
        notification = Notification(
            user_id=user_id,
            type=type,
            priority=priority,
            title=title,
            message=message,
            link=link,
            extra_data=metadata, # Pass payload to new column
            expires_at=expires_at
        )
        
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification
    
    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: int,
        unread_only: bool = False,
        type_filter: Optional[str] = None,
        priority_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Notification]:
        """Obtener notificaciones de un usuario con filtros"""
        query = db.query(Notification).filter(Notification.user_id == user_id)
        
        if unread_only:
            query = query.filter(Notification.is_read == False)
        
        if type_filter:
            query = query.filter(Notification.type == type_filter)
        
        if priority_filter:
            query = query.filter(Notification.priority == priority_filter)
        
        # Filtrar notificaciones no expiradas
        query = query.filter(
            or_(
                Notification.expires_at == None,
                Notification.expires_at > datetime.now(timezone.utc)
            )
        )
        
        notifications = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()
        return notifications
    
    @staticmethod
    def get_unread_count(db: Session, user_id: int) -> int:
        """Obtener cantidad de notificaciones no leídas"""
        count = db.query(Notification).filter(
            and_(
                Notification.user_id == user_id,
                Notification.is_read == False,
                or_(
                    Notification.expires_at == None,
                    Notification.expires_at > datetime.now(timezone.utc)
                )
            )
        ).count()
        return count
    
    @staticmethod
    def mark_as_read(db: Session, notification_id: int, user_id: int) -> Optional[Notification]:
        """Marcar notificación como leída"""
        notification = db.query(Notification).filter(
            and_(
                Notification.id == notification_id,
                Notification.user_id == user_id
            )
        ).first()
        
        if notification:
            notification.mark_as_read()
            db.commit()
            db.refresh(notification)
        
        return notification
    
    @staticmethod
    def mark_all_as_read(db: Session, user_id: int) -> int:
        """Marcar todas las notificaciones como leídas"""
        updated = db.query(Notification).filter(
            and_(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
        ).update({"is_read": True})
        
        db.commit()
        return updated
    
    @staticmethod
    def delete_notification(db: Session, notification_id: int, user_id: int) -> bool:
        """Eliminar una notificación"""
        notification = db.query(Notification).filter(
            and_(
                Notification.id == notification_id,
                Notification.user_id == user_id
            )
        ).first()
        
        if notification:
            db.delete(notification)
            db.commit()
            return True
        
        return False
    
    @staticmethod
    def cleanup_expired(db: Session) -> int:
        """Eliminar notificaciones expiradas"""
        deleted = db.query(Notification).filter(
            and_(
                Notification.expires_at != None,
                Notification.expires_at < datetime.now(timezone.utc)
            )
        ).delete()
        
        db.commit()
        return deleted


# Singleton
notification_service = NotificationService()
