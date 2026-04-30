/**
 * API client configuration and utilities.
 * 
 * Uses NEXT_PUBLIC_API_URL environment variable to configure the base URL.
 * In production, this points to https://api.mcqs-jcq.com
 * In development, it can be empty to use Next.js proxy or set to localhost.
 */
import axios from 'axios';

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || '', // Use env variable or empty for proxy
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Let Axios handle the Content-Type automatically for FormData
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Exclude endpoints where 401 is a normal error (wrong PIN, etc.)
            const url = error.config?.url || '';
            const skipLogoutUrls = ['/api/auth/verify-pin', '/api/auth/login'];
            const shouldSkip = skipLogoutUrls.some(u => url.includes(u));
            if (!shouldSkip) {
                // Unauthorized - clear token and redirect to login
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
