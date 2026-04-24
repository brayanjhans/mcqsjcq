/**
 * useNotifications Hook - Cliente para API de notificaciones
 */
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export interface Notification {
    id: number;
    user_id: number;
    type: string;
    priority: string;
    title: string;
    message: string;
    link: string | null;
    metadata?: any; // To support dynamic fields like categoria, monto, etc.
    is_read: boolean;
    created_at: string;
    expires_at: string | null;
}

export interface NotificationList {
    notifications: Notification[];
    total: number;
    unread_count: number;
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

            const response = await api.get<NotificationList>('/api/notifications/', {
                params: { unread_only: unreadOnly, limit: 50 }
            });

            setNotifications(response.data.notifications);
            setUnreadCount(response.data.unread_count);
        } catch (err: any) {
            console.error('Error fetching notifications:', err);
            setError(err.response?.data?.detail || 'Error al cargar notificaciones');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const response = await api.get<{ count: number }>('/api/notifications/unread-count');
            setUnreadCount(response.data.count);
        } catch (err) {
            console.error('Error fetching unread count:', err);
        }
    }, []);

    const markAsRead = useCallback(async (notificationId: number) => {
        try {
            await api.put(`/api/notifications/${notificationId}/read`);

            // Actualizar estado local
            setNotifications(prev => prev.map(n =>
                n.id === notificationId ? { ...n, is_read: true } : n
            ));

            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err: any) {
            console.error('Error marking notification as read:', err);
            throw err;
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await api.put('/api/notifications/read-all');

            // Actualizar estado local
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err: any) {
            console.error('Error marking all notifications as read:', err);
            throw err;
        }
    }, []);

    const deleteNotification = useCallback(async (notificationId: number) => {
        try {
            await api.delete(`/api/notifications/${notificationId}`);

            // Actualizar estado local
            const deletedNotif = notifications.find(n => n.id === notificationId);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));

            if (deletedNotif && !deletedNotif.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err: any) {
            console.error('Error deleting notification:', err);
            throw err;
        }
    }, [notifications]);

    // Auto-refresh disabled to prevent API spam / loop
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
