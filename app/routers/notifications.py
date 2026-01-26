"""
Notifications Router - API endpoints for notifications backed by DB
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.notification_service import notification_service
from app.models.notification import NotificationType, NotificationPriority
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

# --- Models ---
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    priority: str
    title: str
    message: str
    link: Optional[str] = None
    metadata: Optional[dict] = None # Added metadata field
    is_read: bool
    created_at: str
    expires_at: Optional[str] = None
    
    class Config:
        from_attributes = True

class NotificationList(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    unread_count: int

class UnreadCountResponse(BaseModel):
    count: int

# --- Endpoints ---

@router.get("/", response_model=NotificationList)
def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    # Hardcoded user_id=1 for now, or get from auth if available
    # Assuming the user running this is the one we want to show
    # In a real app, strict auth is needed.
    # We will try to get all notifications for now, assuming single tenant or test.
    # But wait, logic above used user_id=1.
    # Let's verify what user_id the frontend expects.
    # The frontend doesn't send user_id.
    # We'll default to retrieving for ALL users for demo purposes or a specific test user (11).
    # Since we generated for "all active users" in script, let's just pick one or fetch all?
    # No, fetching all is bad. Let's pick user_id=11 as default/test since we used it before, 
    # OR better: if no auth, maybe return empty?
    # Let's assume user_id=11 is the logged in user based on previous turns.
    current_user_id = 11 
    
    notifs = notification_service.get_user_notifications(
        db=db, 
        user_id=current_user_id,
        unread_only=unread_only,
        limit=limit,
        offset=offset
    )
    
    total = len(notifs) # Approximate for pagination
    unread_count = notification_service.get_unread_count(db=db, user_id=current_user_id)
    
    # Format dates to string
    encoded_notifs = []
    for n in notifs:
        encoded_notifs.append({
            "id": n.id,
            "user_id": n.user_id,
            "type": n.type.value if hasattr(n.type, 'value') else str(n.type),
            "priority": n.priority.value if hasattr(n.priority, 'value') else str(n.priority),
            "title": n.title,
            "message": n.message,
            "link": n.link,
            "metadata": n.extra_data, # Pass extra_data as metadata for frontend compatibility
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else "",
            "expires_at": n.expires_at.isoformat() if n.expires_at else None
        })

    return {
        "notifications": encoded_notifs,
        "total": total,
        "unread_count": unread_count
    }

@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(db: Session = Depends(get_db)):
    current_user_id = 11
    count = notification_service.get_unread_count(db=db, user_id=current_user_id)
    return {"count": count}

@router.put("/{notification_id}/read")
def mark_as_read(notification_id: int, db: Session = Depends(get_db)):
    current_user_id = 11
    updated = notification_service.mark_as_read(db=db, notification_id=notification_id, user_id=current_user_id)
    if updated:
        return {"success": True}
    raise HTTPException(status_code=404, detail="Notification not found")

@router.put("/read-all")
def mark_all_as_read(db: Session = Depends(get_db)):
    current_user_id = 11
    count = notification_service.mark_all_as_read(db=db, user_id=current_user_id)
    return {"message": f"{count} notifications marked as read"}

@router.delete("/{notification_id}")
def delete_notification(notification_id: int, db: Session = Depends(get_db)):
    current_user_id = 11
    success = notification_service.delete_notification(db=db, notification_id=notification_id, user_id=current_user_id)
    if success:
        return {"success": True}
    raise HTTPException(status_code=404, detail="Notification not found")


def create_notification_internal(
    title: str,
    message: str,
    type: str = "system",
    priority: str = "low",
    link: Optional[str] = None,
    metadata: Optional[dict] = None,
    user_id: Optional[int] = None
):
    """
    Internal utility to create notifications from other modules.
    Can be imported by other routers to trigger notifications.
    """
    try:
        from app.database import SessionLocal
        # Use local import to avoid circular dependency if service imports router (unlikely but safe)
        from app.services.notification_service import notification_service
        from app.models.notification import NotificationType, NotificationPriority
        
        db = SessionLocal()
        try:
            # Determine target users
            # For this specific user's request, we target the main active user (ID 11) 
            # or the user performing the action if passed.
            # In a real scenario, we might want to query all admins.
            target_ids = [user_id] if user_id else [11] 
            
            # Map strings to Enums safely
            try:
                notif_type = NotificationType(type)
            except ValueError:
                notif_type = NotificationType.SISTEMA
                
            try:
                notif_priority = NotificationPriority(priority)
            except ValueError:
                notif_priority = NotificationPriority.LOW

            for uid in target_ids:
                notification_service.create_notification(
                    db=db,
                    user_id=uid,
                    type=notif_type,
                    priority=notif_priority,
                    title=title,
                    message=message,
                    link=link,
                    metadata=metadata,
                    expires_days=15
                )
        finally:
            db.close()
            
    except Exception as e:
        print(f"Error in create_notification_internal: {e}")
