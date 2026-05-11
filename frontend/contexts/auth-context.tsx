'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

interface User {
    perfil: string;
    nombre: string;
    job_title: string;
    role?: string;
}

interface AuthContextType {
    user: User | null;
    logout: () => void;
    isAuthenticated: boolean;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // Load minimal display data from sessionStorage (no sensitive tokens)
        const raw = sessionStorage.getItem('user_display');
        if (raw) {
            try {
                setUser(JSON.parse(raw));
            } catch {
                sessionStorage.removeItem('user_display');
            }
        }
    }, []);

    const logout = async () => {
        try {
            // Call backend to clear HttpOnly cookie and invalidate server session
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-CSRF-Token': document.cookie
                        .split('; ')
                        .find(r => r.startsWith('csrf_token='))
                        ?.split('=')[1] || ''
                }
            });
        } catch (e) {
            console.warn('[Auth] Logout request failed, clearing local state anyway.');
        }
        setUser(null);
        sessionStorage.removeItem('user_display');
        window.location.href = '/';
    };

    const perfilUpper = (user?.perfil || user?.role || '').toUpperCase();
    const value = {
        user,
        logout,
        isAuthenticated: !!user,
        isAdmin: perfilUpper === 'DIRECTOR' || perfilUpper === 'ADMIN',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
