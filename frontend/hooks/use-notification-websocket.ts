/**
 * useNotificationWebSocket - Hook para conexión WebSocket de notificaciones en tiempo real
 */
import { useEffect, useRef } from 'react';
import { useNotifications } from '@/hooks/use-notifications';

export function useNotificationWebSocket() {
    const wsRef = useRef<WebSocket | null>(null);
    const { fetchNotifications } = useNotifications();
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        const connectWebSocket = () => {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('No token, skipping WebSocket connection');
                return;
            }

            try {
                const wsUrl = `ws://localhost:8001/api/notifications/ws?token=${token}`;
                const ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    console.log('✅ WebSocket conectado');
                    wsRef.current = ws;

                    // Enviar ping cada 30s para keep-alive
                    const pingInterval = setInterval(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send('ping');
                        }
                    }, 30000);

                    // Guardar interval para limpieza
                    (ws as any).pingInterval = pingInterval;
                };

                ws.onmessage = (event) => {
                    try {
                        if (event.data === 'pong') return; // Ignorar pongs

                        const notification = JSON.parse(event.data);
                        console.log('📬 Nueva notificación:', notification);

                        // Mostrar notificación del navegador si tiene permiso
                        if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification(notification.title, {
                                body: notification.message,
                                icon: '/icon-192.png',
                                tag: `notification-${notification.id}`
                            });
                        }

                        // Refrescar lista de notificaciones
                        fetchNotifications();

                        // Reproducir sonido opcional
                        try {
                            const audio = new Audio('/notification.mp3');
                            audio.volume = 0.3;
                            audio.play().catch(() => { }); // Ignorar si falla
                        } catch (e) { }

                    } catch (error) {
                        console.error('Error parsing notification:', error);
                    }
                };

                ws.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                };

                ws.onclose = (event) => {
                    console.log('WebSocket cerrado:', event.code, event.reason);

                    // Limpiar ping interval
                    if ((ws as any).pingInterval) {
                        clearInterval((ws as any).pingInterval);
                    }

                    wsRef.current = null;

                    // Reconectar después de 5 segundos
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log('Reconectando WebSocket...');
                        connectWebSocket();
                    }, 5000);
                };

            } catch (error) {
                console.error('Error creating WebSocket:', error);
            }
        };

        // Conectar al montar
        connectWebSocket();

        // Limpieza al desmontar
        return () => {
            if (wsRef.current) {
                if ((wsRef.current as any).pingInterval) {
                    clearInterval((wsRef.current as any).pingInterval);
                }
                wsRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [fetchNotifications]);

    return wsRef.current;
}


/**
 * Hook para solicitar permiso de notificaciones del navegador
 */
export function useRequestNotificationPermission() {
    const requestPermission = async () => {
        if (!('Notification' in window)) {
            console.log('Este navegador no soporta notificaciones');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    };

    return { requestPermission, permission: Notification.permission };
}
