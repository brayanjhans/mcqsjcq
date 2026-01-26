"""
Notification Triggers - Detecta eventos de negocio y genera notificaciones automáticas
"""
from sqlalchemy.orm import Session
from sqlalchemy import text, and_, or_
from datetime import datetime, timedelta, timezone
from typing import List
from app.models.notification import NotificationType, NotificationPriority
from app.services.notification_service import notification_service
import logging

logger = logging.getLogger(__name__)


class NotificationTriggers:
    """Servicio para detectar eventos y generar notificaciones automáticas"""
    
    @staticmethod
    def check_carta_fianza_expiration(db: Session) -> int:
        """
        Verificar cartas fianza próximas a vencer y crear notificaciones
        - 30 días: Notificación LOW
        - 15 días: Notificación MEDIUM
        - 7 días: Notificación HIGH
        """
        notifications_created = 0
        now = datetime.now(timezone.utc)
        
        # Definir períodos de alerta
        alert_periods = [
            (30, NotificationPriority.LOW, "en 30 días"),
            (15, NotificationPriority.MEDIUM, "en 15 días"),
            (7, NotificationPriority.HIGH, "en 7 días")
        ]
        
        try:
            for days, priority, message_suffix in alert_periods:
                target_date = now + timedelta(days=days)
                date_str = target_date.strftime('%Y-%m-%d')
                
                # Buscar cartas fianza que vencen en X días
                # NOTA: Ajusta la query según tu esquema real de tabla de cartas fianza
                query = text("""
                    SELECT DISTINCT cf.id, cf.numero, cf.monto, cf.fecha_vencimiento, u.id as user_id
                    FROM cartas_fianza cf
                    CROSS JOIN usuarios u
                    WHERE DATE(cf.fecha_vencimiento) = :target_date
                    AND cf.estado = 'VIGENTE'
                    AND u.activo = 1
                    AND NOT EXISTS (
                        SELECT 1 FROM notification_tracking nt
                        WHERE nt.entity_type = 'carta_fianza'
                        AND nt.entity_id = cf.id
                        AND nt.notification_type = :notif_type
                        AND DATE(nt.last_notified) = CURDATE()
                    )
                    LIMIT 100
                """)
                
                result = db.execute(query, {
                    'target_date': date_str,
                    'notif_type': f'expiration_{days}d'
                })
                
                for row in result:
                    # Crear notificación
                    notification_service.create_notification(
                        db=db,
                        user_id=row.user_id,
                        type=NotificationType.CARTA_FIANZA,
                        priority=priority,
                        title=f"⚠️ Carta Fianza #{row.numero} vence {message_suffix}",
                        message=f"La carta fianza #{row.numero} por un monto de S/ {row.monto:,.2f} vencerá el {row.fecha_vencimiento.strftime('%d/%m/%Y')}. Se requiere acción para renovar o liberar.",
                        link=f"/mqs/cartas-fianza?id={row.id}",
                        expires_days=days
                    )
                    
                    # Registrar tracking
                    db.execute(text("""
                        INSERT INTO notification_tracking 
                        (entity_type, entity_id, notification_type, last_notified)
                        VALUES ('carta_fianza', :entity_id, :notif_type, NOW())
                    """), {
                        'entity_id': str(row.id),
                        'notif_type': f'expiration_{days}d'
                    })
                    
                    notifications_created += 1
            
            db.commit()
            logger.info(f"Cartas Fianza: {notifications_created} notificaciones creadas")
            
        except Exception as e:
            logger.error(f"Error checking carta fianza expiration: {e}")
            db.rollback()
        
        return notifications_created
    
    @staticmethod
    def check_new_licitaciones(db: Session) -> int:
        """Detectar nuevas licitaciones publicadas en las últimas 24 horas"""
        notifications_created = 0
        
        try:
            # Buscar licitaciones nuevas (últimas 24 horas)
            query = text("""
                SELECT DISTINCT l.id_convocatoria, l.descripcion, l.comprador, 
                       l.monto_estimado, l.departamento, l.tipo_procedimiento, u.id as user_id
                FROM licitaciones_cabecera l
                CROSS JOIN usuarios u
                WHERE l.fecha_publicacion >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                AND u.activo = 1
                AND NOT EXISTS (
                    SELECT 1 FROM notification_tracking nt
                    WHERE nt.entity_type = 'licitacion'
                    AND nt.entity_id = l.id_convocatoria
                    AND nt.notification_type = 'new_publication'
                    AND nt.last_notified >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                )
                LIMIT 50
            """)
            
            result = db.execute(query)
            
            for row in result:
                monto_texto = f"S/ {row.monto_estimado:,.2f}" if row.monto_estimado else "No especificado"
                
                # Determinar icono y prefijo basado en tipo_procedimiento
                tipo = (row.tipo_procedimiento or "").upper()
                if "LICITACIÓN PÚBLICA" in tipo or "CONCURSO PÚBLICO" in tipo:
                    icon = "📢" 
                    prefix = "[PRINCIPAL]"
                    priority = NotificationPriority.HIGH
                elif "ADJUDICACIÓN SIMPLIFICADA" in tipo:
                    icon = "🔨"
                    prefix = "[SIMPLIFICADA]"
                    priority = NotificationPriority.MEDIUM
                elif "SUBASTA" in tipo:
                    icon = "📉"
                    prefix = "[SUBASTA]"
                    priority = NotificationPriority.MEDIUM
                else:
                    icon = "📋"
                    prefix = "[PROCESO]"
                    priority = NotificationPriority.LOW

                # Titulo más descriptivo
                title = f"{icon} {prefix} {row.comprador}"
                
                # Mensaje limpia y precisa
                msg_body = f"{row.tipo_procedimiento}\n\n{row.descripcion[:120]}...\n\n💰 {monto_texto} | 📍 {row.departamento or 'Nacional'}"

                notification_service.create_notification(
                    db=db,
                    user_id=row.user_id,
                    type=NotificationType.LICITACION,
                    priority=priority,
                    title=title,
                    message=msg_body,
                    link=f"/seace/database?id={row.id_convocatoria}",
                    expires_days=30
                )
                
                # Tracking
                db.execute(text("""
                    INSERT INTO notification_tracking 
                    (entity_type, entity_id, notification_type, last_notified)
                    VALUES ('licitacion', :entity_id, 'new_publication', NOW())
                """), {'entity_id': row.id_convocatoria})
                
                notifications_created += 1
            
            db.commit()
            logger.info(f"Licitaciones: {notifications_created} notificaciones creadas")
            
        except Exception as e:
            logger.error(f"Error checking new licitaciones: {e}")
            db.rollback()
        
        return notifications_created
    
    @staticmethod
    def check_new_adjudicaciones(db: Session) -> int:
        """Detectar nuevas adjudicaciones en las últimas 12 horas"""
        notifications_created = 0
        
        try:
            query = text("""
                SELECT DISTINCT a.id_adjudicacion, a.id_convocatoria, a.ganador_nombre,
                       a.monto_adjudicado, a.fecha_adjudicacion, l.descripcion,
                       u.id as user_id
                FROM licitaciones_adjudicaciones a
                JOIN licitaciones_cabecera l ON a.id_convocatoria = l.id_convocatoria
                CROSS JOIN usuarios u
                WHERE a.fecha_adjudicacion >= DATE_SUB(NOW(), INTERVAL 12 HOUR)
                AND u.activo = 1
                AND NOT EXISTS (
                    SELECT 1 FROM notification_tracking nt
                    WHERE nt.entity_type = 'adjudicacion'
                    AND nt.entity_id = a.id_adjudicacion
                    AND nt.notification_type = 'new_award'
                )
                LIMIT 50
            """)
            
            result = db.execute(query)
            
            for row in result:
                monto_texto = f"S/ {row.monto_adjudicado:,.2f}" if row.monto_adjudicado else "Monto no especificado"
                
                notification_service.create_notification(
                    db=db,
                    user_id=row.user_id,
                    type=NotificationType.ADJUDICACION,
                    priority=NotificationPriority.MEDIUM,
                    title=f"🏆 Nueva Adjudicación: {row.ganador_nombre}",
                    message=f"Licitación '{row.descripcion[:100]}...' adjudicada. Monto: {monto_texto}. Fecha: {row.fecha_adjudicacion.strftime('%d/%m/%Y')}",
                    link=f"/seace/database?id={row.id_convocatoria}",
                    expires_days=30
                )
                
                db.execute(text("""
                    INSERT INTO notification_tracking 
                    (entity_type, entity_id, notification_type, last_notified)
                    VALUES ('adjudicacion', :entity_id, 'new_award', NOW())
                """), {'entity_id': row.id_adjudicacion})
                
                notifications_created += 1
            
            db.commit()
            logger.info(f"Adjudicaciones: {notifications_created} notificaciones creadas")
            
        except Exception as e:
            logger.error(f"Error checking new adjudicaciones: {e}")
            db.rollback()
        
        return notifications_created
    
    @staticmethod
    def check_important_changes(db: Session) -> int:
        """Detectar cambios importantes en licitaciones (cambios de estado, montos)"""
        notifications_created = 0
        
        try:
            # Ejemplo: Detectar licitaciones que cambiaron a estado "CANCELADA" o "DESIERTA"
            query = text("""
                SELECT DISTINCT l.id_convocatoria, l.descripcion, l.estado, u.id as user_id
                FROM licitaciones_cabecera l
                CROSS JOIN usuarios u
                WHERE l.estado IN ('CANCELADA', 'DESIERTA', 'SUSPENDIDA')
                AND l.fecha_actualizacion >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                AND u.activo = 1
                AND NOT EXISTS (
                    SELECT 1 FROM notification_tracking nt
                    WHERE nt.entity_type = 'licitacion_change'
                    AND nt.entity_id = l.id_convocatoria
                    AND nt.notification_type = CONCAT('status_', l.estado)
                    AND nt.last_notified >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                )
                LIMIT 30
            """)
            
            result = db.execute(query)
            
            for row in result:
                estado_emoji = {
                    'CANCELADA': '❌',
                    'DESIERTA': '📭',
                    'SUSPENDIDA': '⏸️'
                }.get(row.estado, '⚠️')
                
                notification_service.create_notification(
                    db=db,
                    user_id=row.user_id,
                    type=NotificationType.LICITACION,
                    priority=NotificationPriority.HIGH,
                    title=f"{estado_emoji} Cambio Importante: Licitación {row.estado}",
                    message=f"La licitación '{row.descripcion[:120]}...' ha cambiado a estado {row.estado}.",
                    link=f"/seace/database?id={row.id_convocatoria}",
                    expires_days=15
                )
                
                db.execute(text("""
                    INSERT INTO notification_tracking 
                    (entity_type, entity_id, notification_type, last_notified)
                    VALUES ('licitacion_change', :entity_id, :notif_type, NOW())
                """), {
                    'entity_id': row.id_convocatoria,
                    'notif_type': f'status_{row.estado}'
                })
                
                notifications_created += 1
            
            db.commit()
            logger.info(f"Cambios: {notifications_created} notificaciones creadas")
            
        except Exception as e:
            logger.error(f"Error checking important changes: {e}")
            db.rollback()
        
        return notifications_created
    
    @staticmethod
    def run_all_checks(db: Session) -> dict:
        """Ejecutar todos los checks y retornar resumen"""
        results = {
            'carta_fianza': 0,
            'licitaciones': 0,
            'adjudicaciones': 0,
            'changes': 0,
            'total': 0
        }
        
        try:
            results['carta_fianza'] = NotificationTriggers.check_carta_fianza_expiration(db)
            results['licitaciones'] = NotificationTriggers.check_new_licitaciones(db)
            results['adjudicaciones'] = NotificationTriggers.check_new_adjudicaciones(db)
            results['changes'] = NotificationTriggers.check_important_changes(db)
            results['total'] = sum([results['carta_fianza'], results['licitaciones'], 
                                   results['adjudicaciones'], results['changes']])
            
            logger.info(f"Triggers ejecutados: {results['total']} notificaciones totales")
        except Exception as e:
            logger.error(f"Error en run_all_checks: {e}")
        
        return results


# Singleton
notification_triggers = NotificationTriggers()
