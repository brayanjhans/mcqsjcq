/**
 * CSRF token utilities for secure cookie-based authentication.
 *
 * Strategy:
 * - Backend sets `csrf_token` as a readable cookie (NOT HttpOnly)
 * - Frontend reads it and sends as `X-CSRF-Token` header on every mutating request
 * - Backend compares header vs cookie — if they match, request is legitimate
 * - A third-party attacker cannot read the cookie (SameSite=Strict), so they cannot forge the header
 */

/**
 * Read the `csrf_token` cookie value set by the backend after login.
 * Returns empty string if not found (unauthenticated).
 */
export function getCsrfToken(): string {
    if (typeof document === 'undefined') return ''; // SSR safety
    const match = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_token='));
    return match ? match.split('=')[1] : '';
}

/**
 * Check if user has an active session by reading csrf_token cookie presence.
 * NOTE: This is a lightweight client-side check only.
 * For authoritative check, use /api/auth/me
 */
export function hasActiveSession(): boolean {
    return getCsrfToken().length > 0;
}

/**
 * Secure fetch wrapper that:
 * 1. Sends cookies automatically (credentials: 'include')
 * 2. Attaches X-CSRF-Token header for mutating requests
 * 3. Handles 401 globally by redirecting to login
 */
export async function authFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const method = (options.method || 'GET').toUpperCase();
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    const headers = new Headers(options.headers || {});

    // Add CSRF token for state-changing requests
    if (isMutating) {
        const csrf = getCsrfToken();
        if (csrf) {
            headers.set('X-CSRF-Token', csrf);
        }
    }

    // Ensure JSON content-type if body is an object
    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
        ...options,
        credentials: 'include',  // Always send cookies (HttpOnly JWT)
        headers,
    });

    // Global 401 handler — session expired or invalid
    if (response.status === 401) {
        const skipUrls = ['/api/auth/login', '/api/auth/verify-pin'];
        const shouldSkip = skipUrls.some(u => url.includes(u));
        if (!shouldSkip && typeof window !== 'undefined') {
            console.warn('[authFetch] Session expired. Redirecting to login.');
            window.location.href = '/';
        }
    }

    return response;
}
