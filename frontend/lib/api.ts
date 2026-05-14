/**
 * API client configuration and utilities.
 *
 * Security upgrade: No longer reads JWT from localStorage.
 * JWT is stored in HttpOnly cookie (sent automatically by browser).
 * CSRF token is read from readable cookie and attached as header.
 */
import axios from 'axios';

// Helper to read csrf_token cookie (readable, not HttpOnly)
function getCsrfTokenFromCookie(): string {
    if (typeof document === 'undefined') return '';
    const match = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_token='));
    return match ? match.split('=')[1] : '';
}

export const api = axios.create({
    // FIX: Siempre usamos rutas relativas para pasar por el proxy de Next.js.
    // Si usamos process.env.NEXT_PUBLIC_API_URL y está seteado a 127.0.0.1:8000, 
    // el navegador considerará la petición como cross-origin y NO enviará la cookie de sesión.
    baseURL: '',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Always send cookies (HttpOnly JWT is attached automatically)
});

// Request interceptor: attach CSRF token for mutating requests
api.interceptors.request.use(
    (config) => {
        const method = (config.method || 'get').toUpperCase();
        const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

        if (isMutating) {
            const csrf = getCsrfTokenFromCookie();
            if (csrf) {
                config.headers['X-CSRF-Token'] = csrf;
            }
        }

        // Let Axios handle the Content-Type automatically for FormData
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: handle 401 globally (session expired)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const url = error.config?.url || '';
            const skipLogoutUrls = ['/api/auth/verify-pin', '/api/auth/login'];
            const shouldSkip = skipLogoutUrls.some(u => url.includes(u));

            if (!shouldSkip && typeof window !== 'undefined') {
                console.warn(`[Auth] Sesión expirada por Axios interceptor. Error original:`, error.config?.url);
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
