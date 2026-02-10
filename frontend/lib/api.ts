/**
 * API client configuration and utilities.
 * 
 * NOTE: We rely on Next.js proxy configuration (next.config.js) to forward
 * /api/* requests to the FastAPI backend on port 8001.
 * DO NOT set baseURL here - it will bypass the proxy and cause 404 errors.
 */
import axios from 'axios';

export const api = axios.create({
    // NO baseURL - use Next.js proxy
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
            // Unauthorized - clear token and redirect to login
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default api;
