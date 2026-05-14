/**
 * useNotifications Hook - Cliente para API de notificaciones
 * Refactorizado para usar fetch nativo puro con rutas relativas,
 * garantizando que pase por el proxy de Next.js y envíe cookies de sesión
 * de forma nativa sin verse afectado por la caché de Axios.
 */
import { useState, useEffect, useCallback } from 'react';

export interface Notification {
    id: number;
    user_id: number;
    type: string;
    priority: string;
    title: string;
    message: string;
    link: string | null;
    metadata?: any;
    is_read: boolean;
    created_at: string;
    expires_at: string | null;
}

export interface NotificationList {
    notifications: Notification[];
    total: number;
    unread_count: number;
}

// Helper para extraer token CSRF nativamente
function getCsrfToken(): string {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.split('; ').find(row => row.startsWith('csrf_token='));
    return match ? match.split('=')[1] : '';
}

export function useNotifications(autoRefreshSeconds: number = 30) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async (unreadOnly: boolean = false) => {
        try {
            setLoading(true);
            setError(null);

            const timestamp = new Date().getTime();
            const url = `/api/notifications/?unread_only=${unreadOnly}&limit=50&_t=${timestamp}`;

            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include', // Garantiza envío de cookies HttpOnly
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('[Notifications] No autorizado (401). Evitando expulsión silenciosa.');
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: NotificationList = await response.json();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unread_count || 0);
        } catch (err: any) {
            console.error('Error fetching notifications (native):', err);
            setError(err.message || 'Error al cargar notificaciones');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const timestamp = new Date().getTime();
            const response = await fetch(`/api/notifications/unread-count?_t=${timestamp}`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Cache-Control': 'no-cache' },
                cache: 'no-store'
            });
            if (response.ok) {
                const data = await response.json();
                setUnreadCount(data.count || 0);
            }
        } catch (err) {
            console.error('Error fetching unread count:', err);
        }
    }, []);

    const markAsRead = useCallback(async (notificationId: number) => {
        try {
            const csrf = getCsrfToken();
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrf ? { 'X-CSRF-Token': csrf } : {})
                }
            });

            if (response.ok) {
                setNotifications(prev => prev.map(n =>
                    n.id === notificationId ? { ...n, is_read: true } : n
                ));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err: any) {
            console.error('Error marking notification as read:', err);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            const csrf = getCsrfToken();
            const response = await fetch('/api/notifications/read-all', {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrf ? { 'X-CSRF-Token': csrf } : {})
                }
            });

            if (response.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                setUnreadCount(0);
            }
        } catch (err: any) {
            console.error('Error marking all notifications as read:', err);
        }
    }, []);

    const deleteNotification = useCallback(async (notificationId: number) => {
        try {
            const csrf = getCsrfToken();
            const response = await fetch(`/api/notifications/${notificationId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrf ? { 'X-CSRF-Token': csrf } : {})
                }
            });

            if (response.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                setNotifications(prev => prev.filter(n => n.id !== notificationId));
                // fetch unread count to be accurate
                fetchUnreadCount();
            }
        } catch (err: any) {
            console.error('Error deleting notification:', err);
        }
    }, [fetchUnreadCount]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    return {
        notifications,
        unreadCount,
        loading,
        error,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification
    };
}
