'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './auth-context';

interface Settings {
    theme: 'light' | 'dark' | 'system';
    accessibility: {
        fontSize: 'normal' | 'large';
        reducedMotion: boolean;
        sidebarCollapsed: boolean;
    };
    notifications: {
        email: boolean;
        app: boolean;
        new_guarantee: boolean;
        status_change: boolean;
        security_alert: boolean;
    };
    security: {
        autoLogout: '15m' | '30m' | '1h' | 'never';
        twoFactor?: boolean;
        loginAlerts?: boolean;
    };
    regional: {
        language?: string;
        dateFormat: string;
        timezone: string;
    };
}

const defaultSettings: Settings = {
    theme: 'system',
    accessibility: {
        fontSize: 'normal',
        reducedMotion: false,
        sidebarCollapsed: false,
    },
    notifications: {
        email: true,
        app: true,
        new_guarantee: true,
        status_change: true,
        security_alert: true,
    },
    security: {
        autoLogout: 'never',
        twoFactor: false,
        loginAlerts: true,
    },
    regional: {
        language: 'es',
        dateFormat: 'DD/MM/YYYY',
        timezone: 'America/Lima',
    },
};

interface SettingsContextType {
    settings: Settings;
    updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
    refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const { user, logout } = useAuth();
    const [settings, setSettings] = useState<Settings>(defaultSettings);

    // Load settings from user profile on mount or user change
    useEffect(() => {
        if (user) {
            refreshSettings();
        }
    }, [user]);

    // Apply Theme
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        if (settings.theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(settings.theme);
        }
    }, [settings.theme]);

    // Apply Font Size
    useEffect(() => {
        const root = window.document.documentElement;
        if (settings.accessibility.fontSize === 'large') {
            root.style.fontSize = '18px'; // Base size increase
        } else {
            root.style.fontSize = '16px'; // Default
        }
    }, [settings.accessibility.fontSize]);

    // Apply Reduced Motion
    useEffect(() => {
        const root = window.document.documentElement;
        if (settings.accessibility.reducedMotion) {
            root.style.scrollBehavior = 'auto';
            // You might want to add a global CSS class for more granular control
            root.classList.add('reduce-motion');
        } else {
            root.style.scrollBehavior = 'smooth';
            root.classList.remove('reduce-motion');
        }
    }, [settings.accessibility.reducedMotion]);

    // Auto Logout Logic
    useEffect(() => {
        if (settings.security.autoLogout === 'never' || !user) return;

        const parseDuration = (duration: string) => {
            switch (duration) {
                case '15m': return 15 * 60 * 1000;
                case '30m': return 30 * 60 * 1000;
                case '1h': return 60 * 60 * 1000;
                default: return 30 * 60 * 1000;
            }
        };

        const timeoutDuration = parseDuration(settings.security.autoLogout);
        let timeoutId: NodeJS.Timeout;

        const resetTimer = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                console.log('Auto logout triggered');
                logout();
                window.location.href = '/'; // Force redirect
            }, timeoutDuration);
        };

        // Events to monitor
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, resetTimer));

        resetTimer(); // Start timer

        return () => {
            clearTimeout(timeoutId);
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [settings.security.autoLogout, user]);

    const refreshSettings = async () => {
        try {
            const response = await api.get('/api/users/me');
            const userPrefs = response.data.preferences;
            if (userPrefs) {
                // Merge with defaults to ensure structure
                setSettings(prev => ({
                    ...prev,
                    ...userPrefs,
                    accessibility: { ...prev.accessibility, ...userPrefs.accessibility },
                    security: { ...prev.security, ...userPrefs.security },
                    regional: { ...prev.regional, ...userPrefs.regional },
                }));
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const updateSettings = async (newSettings: Partial<Settings>) => {
        // Optimistic update
        setSettings(prev => ({ ...prev, ...newSettings }));

        // Persist to backend (handled by the calling component usually, but good to have sync here if needed)
        // For now, we rely on the SettingsPage to call the API, but we could move it here.
        // Let's keep it simple: this context reflects the current state. 
        // The SettingsPage updates the backend and then calls refreshSettings (or we update state here).
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, refreshSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
