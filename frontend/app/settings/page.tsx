'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HeaderActions } from '@/components/layout/header-actions';
import { Save, Bell, Moon, Sun, Monitor, Type, ShieldCheck, Globe } from 'lucide-react';
import { api } from '@/lib/api';
import { useSettings } from '@/contexts/settings-context';

import { useAuthProtection } from '@/hooks/use-auth-protection';

export default function SettingsPage() {
    const { isAuthenticated, loading: authLoading } = useAuthProtection();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (isAuthenticated) fetchUserData();
    }, [isAuthenticated]);

    if (authLoading || !isAuthenticated) return null;

    const fetchUserData = async () => {
        try {
            const response = await api.get('/api/users/me');
            setUser(response.data);
        } catch (error) {
            console.error('Error fetching user:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-500">
            {/* Header */}
            <div className="h-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <i className="fas fa-arrow-left text-slate-600 dark:text-slate-300"></i>
                    </button>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Configuración</h1>
                </div>
                <HeaderActions />
            </div>

            <div className="max-w-4xl mx-auto p-8">
                {successMessage && (
                    <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3 text-green-700 dark:text-green-300 animate-in slide-in-from-top-2">
                        <i className="fas fa-check-circle"></i>
                        {successMessage}
                    </div>
                )}

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
                    <SettingsForm user={user} onUpdate={() => {
                        setSuccessMessage('Preferencias actualizadas correctamente');
                        fetchUserData();
                        setTimeout(() => setSuccessMessage(''), 3000);
                    }} />
                </div>
            </div>
        </div>
    );
}

function SettingsForm({ user, onUpdate }: { user: any, onUpdate: () => void }) {
    const { settings, updateSettings, refreshSettings } = useSettings();
    const [loading, setLoading] = useState(false);

    // Initialize local state from context, but keep it in sync
    const [preferences, setPreferences] = useState(settings);

    useEffect(() => {
        setPreferences(settings);
    }, [settings]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.put('/api/users/me', { preferences });
            await refreshSettings(); // Update global context from backend
            onUpdate();
        } catch (error) {
            console.error('Error saving preferences:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleNotification = (key: string) => {
        const newPrefs = {
            ...preferences,
            notifications: {
                ...preferences.notifications,
                [key]: !preferences.notifications[key as keyof typeof preferences.notifications]
            }
        };
        setPreferences(newPrefs);
        updateSettings(newPrefs); // Live preview
    };

    const updateNestedPreference = (category: string, key: string, value: any) => {
        const newPrefs = {
            ...preferences,
            [category]: {
                ...(preferences as any)[category],
                [key]: value
            }
        };
        setPreferences(newPrefs);
        updateSettings(newPrefs); // Live preview
    };

    const updateTheme = (theme: 'light' | 'dark' | 'system') => {
        const newPrefs = { ...preferences, theme };
        setPreferences(newPrefs);
        updateSettings(newPrefs);
    };

    return (
        <div className="space-y-8">
            {/* Theme Selection */}
            <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Monitor size={16} />
                    Apariencia
                </h3>
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { id: 'light', icon: Sun, label: 'Claro' },
                        { id: 'dark', icon: Moon, label: 'Oscuro' },
                        { id: 'system', icon: Monitor, label: 'Sistema' }
                    ].map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => updateTheme(theme.id as any)}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${preferences.theme === theme.id
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400'
                                }`}
                        >
                            <theme.icon size={24} />
                            <span className="text-sm font-medium">{theme.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Notifications */}
            <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Bell size={16} />
                    Notificaciones
                </h3>
                <div className="space-y-4">
                    <Toggle
                        label="Notificaciones por Correo"
                        description="Recibir resúmenes y alertas importantes por email"
                        checked={preferences.notifications?.email ?? true}
                        onChange={() => toggleNotification('email')}
                    />
                    <Toggle
                        label="Notificaciones en App"
                        description="Mostrar alertas dentro de la plataforma"
                        checked={preferences.notifications?.app ?? true}
                        onChange={() => toggleNotification('app')}
                    />
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-4" />
                    <Toggle
                        label="Nuevas Garantías"
                        description="Cuando se registra una nueva garantía"
                        checked={preferences.notifications?.new_guarantee ?? true}
                        onChange={() => toggleNotification('new_guarantee')}
                    />
                    <Toggle
                        label="Cambios de Estado"
                        description="Cuando una garantía cambia de estado"
                        checked={preferences.notifications?.status_change ?? true}
                        onChange={() => toggleNotification('status_change')}
                    />
                    <Toggle
                        label="Alertas de Seguridad"
                        description="Intentos de acceso y cambios de contraseña"
                        checked={preferences.notifications?.security_alert ?? true}
                        onChange={() => toggleNotification('security_alert')}
                    />
                </div>
            </div>

            {/* Accessibility & UI */}
            <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Type size={16} />
                    Accesibilidad y UI
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-800 dark:text-white text-sm">Tamaño de Fuente</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Ajusta el tamaño del texto</p>
                        </div>
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                            {['normal', 'large'].map((size) => (
                                <button
                                    key={size}
                                    onClick={() => updateNestedPreference('accessibility', 'fontSize', size)}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${preferences.accessibility.fontSize === size
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    {size === 'normal' ? 'Normal' : 'Grande'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <Toggle
                        label="Reducir Movimiento"
                        description="Minimizar animaciones de la interfaz"
                        checked={preferences.accessibility.reducedMotion}
                        onChange={() => updateNestedPreference('accessibility', 'reducedMotion', !preferences.accessibility.reducedMotion)}
                    />
                    <Toggle
                        label="Barra Lateral Colapsada"
                        description="Mantener el menú cerrado por defecto"
                        checked={preferences.accessibility.sidebarCollapsed}
                        onChange={() => updateNestedPreference('accessibility', 'sidebarCollapsed', !preferences.accessibility.sidebarCollapsed)}
                    />
                </div>
            </div>

            {/* Advanced Security */}
            <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <ShieldCheck size={16} />
                    Seguridad Avanzada
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-800 dark:text-white text-sm">Cierre de Sesión Automático</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Tiempo de inactividad permitido</p>
                        </div>
                        <select
                            value={preferences.security.autoLogout}
                            onChange={(e) => updateNestedPreference('security', 'autoLogout', e.target.value)}
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
                        >
                            <option value="15m">15 minutos</option>
                            <option value="30m">30 minutos</option>
                            <option value="1h">1 hora</option>
                            <option value="never">Nunca</option>
                        </select>
                    </div>
                    <Toggle
                        label="Autenticación de Dos Factores (2FA)"
                        description="Requerir código extra al iniciar sesión"
                        checked={preferences.security.twoFactor ?? false}
                        onChange={() => updateNestedPreference('security', 'twoFactor', !preferences.security.twoFactor)}
                    />
                </div>
            </div>

            {/* Regionalization */}
            <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Globe size={16} />
                    Regionalización
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-800 dark:text-white text-sm">Formato de Fecha</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Cómo se muestran las fechas</p>
                        </div>
                        <select
                            value={preferences.regional.dateFormat}
                            onChange={(e) => updateNestedPreference('regional', 'dateFormat', e.target.value)}
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
                        >
                            <option value="DD/MM/YYYY">DD/MM/AAAA (31/12/2024)</option>
                            <option value="YYYY-MM-DD">AAAA-MM-DD (2024-12-31)</option>
                            <option value="MM/DD/YYYY">MM/DD/AAAA (12/31/2024)</option>
                        </select>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-800 dark:text-white text-sm">Zona Horaria</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Para registros de auditoría</p>
                        </div>
                        <select
                            value={preferences.regional.timezone}
                            onChange={(e) => updateNestedPreference('regional', 'timezone', e.target.value)}
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
                        >
                            <option value="America/Lima">Lima (GMT-5)</option>
                            <option value="America/Bogota">Bogotá (GMT-5)</option>
                            <option value="America/Santiago">Santiago (GMT-4)</option>
                            <option value="UTC">UTC</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    {loading ? <span className="animate-spin">⏳</span> : <Save size={18} />}
                    Guardar Preferencias
                </button>
            </div>
        </div>
    );
}

function Toggle({ label, description, checked, onChange }: any) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="font-medium text-slate-800 dark:text-white text-sm">{label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
            </div>
            <button
                onClick={onChange}
                className={`w-12 h-6 rounded-full transition-colors relative ${checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
            >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-transform ${checked ? 'left-7' : 'left-1'}`} />
            </button>
        </div>
    );
}
