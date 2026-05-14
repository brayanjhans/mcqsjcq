'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Hook de protección de rutas autenticadas.
 *
 * Estrategia de seguridad:
 * - Ya NO verifica localStorage (que era inseguro y falseable).
 * - Hace un fetch ligero a /api/auth/me con las cookies HttpOnly.
 * - Si el servidor responde 200 → sesión válida, continúa.
 * - Si responde 401 → sesión inválida/expirada, redirige al login.
 * - Este check ocurre en cada navegación/refresh, garantizando que el
 *   servidor siempre valida el estado real de la sesión.
 */
export function useAuthProtection() {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Skip check on login page
        if (pathname === '/') {
            setLoading(false);
            return;
        }

        const checkAuth = async () => {
            try {
                // Se agrega un parámetro de timestamp para evitar que el navegador o Next.js
                // devuelvan un 401 falso que haya quedado en caché de un intento anterior.
                const timestamp = new Date().getTime();
                const response = await fetch(`/api/auth/me?t=${timestamp}`, {
                    method: 'GET',
                    credentials: 'include', // Send HttpOnly cookie automatically
                    headers: { 
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    },
                    cache: 'no-store'
                });

                if (response.ok) {
                    // Session is valid — server confirmed it
                    setIsAuthenticated(true);
                } else {
                    // 401 or any error — session invalid or expired
                    console.warn(`[Auth] Session invalid (${response.status}). Redirecting to login.`);
                    setIsAuthenticated(false);
                    router.replace('/');
                }
            } catch (error) {
                // Network error — fail safe: redirect to login
                console.error('[Auth] Network error during session check:', error);
                setIsAuthenticated(false);
                router.replace('/');
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [router, pathname]);

    return { isAuthenticated, loading };
}
