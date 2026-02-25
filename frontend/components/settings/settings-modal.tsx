'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, Settings, Moon, Sun, Monitor, Bell, ShieldCheck, Globe, Type, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/settings-context';
import { api } from '@/lib/api';

export function SettingsModal({
    open,
    onOpenChange
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { settings, updateSettings, refreshSettings } = useSettings();
    const [preferences, setPreferences] = useState(settings);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('appearance');

    useEffect(() => {
        setPreferences(settings);
    }, [settings, open]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.put('/api/users/me', { preferences });
            await refreshSettings();
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving:', error);
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
        updateSettings(newPrefs);
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
        updateSettings(newPrefs);
    };

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in" />
                <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-slate-900 shadow-2xl rounded-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                <Settings className="w-5 h-5" />
                            </div>
                            <DialogPrimitive.Title className="text-lg font-bold text-slate-900 dark:text-white">
                                Configuración
                            </DialogPrimitive.Title>
                        </div>
                        <DialogPrimitive.Close className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <X className="w-5 h-5 text-slate-500" />
                        </DialogPrimitive.Close>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {/* Sidebar Tabs */}
                        <div className="w-64 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-100 dark:border-slate-800 p-4 space-y-1 hidden md:block overflow-y-auto">
                            <SidebarTab active={activeTab === 'appearance'} onClick={() => setActiveTab('appearance')} icon={Monitor} label="Apariencia" />
                            <SidebarTab active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={Bell} label="Notificaciones" />
                            <SidebarTab active={activeTab === 'accessibility'} onClick={() => setActiveTab('accessibility')} icon={Type} label="Accesibilidad" />
                            <SidebarTab active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={ShieldCheck} label="Seguridad" />
                            <SidebarTab active={activeTab === 'regional'} onClick={() => setActiveTab('regional')} icon={Globe} label="Regional" />
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white dark:bg-slate-900">
                            {/* Mobile Tabs Dropdown (Visible only on small screens) */}
                            <div className="md:hidden mb-6">
                                <select
                                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50"
                                    value={activeTab}
                                    onChange={(e) => setActiveTab(e.target.value)}
                                >
                                    <option value="appearance">Apariencia</option>
                                    <option value="notifications">Notificaciones</option>
                                    <option value="accessibility">Accesibilidad</option>
                                    <option value="security">Seguridad</option>
                                    <option value="regional">Regional</option>
                                </select>
                            </div>

                            {activeTab === 'appearance' && (
                                <div className="space-y-6 animate-in hover-none fade-in slide-in-from-right-4 duration-300">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Apariencia</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        {[
                                            { id: 'light', icon: Sun, label: 'Claro' },
                                            { id: 'dark', icon: Moon, label: 'Oscuro' },
                                            { id: 'system', icon: Monitor, label: 'Sistema' }
                                        ].map((theme) => (
                                            <button
                                                key={theme.id}
                                                onClick={() => {
                                                    const newPrefs = { ...preferences, theme: theme.id as 'light' | 'dark' | 'system' };
                                                    setPreferences(newPrefs);
                                                    updateSettings(newPrefs);
                                                }}
                                                className={cn(
                                                    "p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all",
                                                    preferences.theme === theme.id
                                                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                                        : "border-slate-200 hover:border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-500"
                                                )}
                                            >
                                                <theme.icon className="w-6 h-6" />
                                                <span className="text-sm font-medium">{theme.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'notifications' && (
                                <div className="space-y-6 animate-in hover-none fade-in slide-in-from-right-4 duration-300">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Preferencias de Notificación</h3>
                                    <div className="space-y-4">
                                        <Toggle label="Notificaciones por Correo" description="Recibir resúmenes y alertas por email" checked={preferences.notifications?.email} onChange={() => toggleNotification('email')} />
                                        <Toggle label="Alertas en App" description="Mostrar popups dentro del sistema" checked={preferences.notifications?.app} onChange={() => toggleNotification('app')} />
                                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-4" />
                                        <Toggle label="Nuevas Garantías" checked={preferences.notifications?.new_guarantee} onChange={() => toggleNotification('new_guarantee')} />
                                        <Toggle label="Cambios de Estado" checked={preferences.notifications?.status_change} onChange={() => toggleNotification('status_change')} />
                                        <Toggle label="Alertas de Seguridad" checked={preferences.notifications?.security_alert} onChange={() => toggleNotification('security_alert')} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'accessibility' && (
                                <div className="space-y-6 animate-in hover-none fade-in slide-in-from-right-4 duration-300">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Accesibilidad</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tamaño de Fuente</span>
                                            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                                {['normal', 'large'].map((size) => (
                                                    <button
                                                        key={size}
                                                        onClick={() => updateNestedPreference('accessibility', 'fontSize', size)}
                                                        className={cn(
                                                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                                            preferences.accessibility?.fontSize === size ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                                                        )}
                                                    >
                                                        {size === 'normal' ? 'Normal' : 'Grande'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <Toggle label="Reducir Movimiento" checked={preferences.accessibility?.reducedMotion} onChange={() => updateNestedPreference('accessibility', 'reducedMotion', !preferences.accessibility?.reducedMotion)} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="space-y-6 animate-in hover-none fade-in slide-in-from-right-4 duration-300">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Seguridad de la Cuenta</h3>
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">Contraseña</h4>
                                            <p className="text-sm text-slate-500 mb-3">Tu contraseña actual es segura. Para cambiarla, dirígete a tu Perfil principal.</p>
                                            <Button variant="outline" className="w-full sm:w-auto" onClick={() => { onOpenChange(false); }}>
                                                Ir al Perfil
                                            </Button>
                                        </div>
                                        <Toggle label="Autenticación en Dos Pasos (2FA)" description="Protege tu cuenta con un código temporal además de tu contraseña." checked={preferences.security?.twoFactor} onChange={() => updateNestedPreference('security', 'twoFactor', !preferences.security?.twoFactor)} />
                                        <Toggle label="Alertas de Inicio de Sesión" description="Recibe un correo si detectamos un inicio de sesión desde un dispositivo nuevo." checked={preferences.security?.loginAlerts} onChange={() => updateNestedPreference('security', 'loginAlerts', !preferences.security?.loginAlerts)} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'regional' && (
                                <div className="space-y-6 animate-in hover-none fade-in slide-in-from-right-4 duration-300">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Configuración Regional</h3>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Idioma de la Interfaz</label>
                                            <select
                                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-200"
                                                value={preferences.regional?.language || 'es'}
                                                onChange={(e) => updateNestedPreference('regional', 'language', e.target.value)}
                                            >
                                                <option value="es">Español (Perú)</option>
                                                <option value="en">English (US)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Zona Horaria</label>
                                            <select
                                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-200"
                                                value={preferences.regional?.timezone || 'America/Lima'}
                                                onChange={(e) => updateNestedPreference('regional', 'timezone', e.target.value)}
                                            >
                                                <option value="America/Lima">(UTC-05:00) Lima, Quito, Bogotá</option>
                                                <option value="America/Santiago">(UTC-04:00) Santiago</option>
                                                <option value="America/Buenos_Aires">(UTC-03:00) Buenos Aires</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Other tabs can be added similarly if needed, but this covers main ones */}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 transition-colors">
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
                        <Button
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl px-6"
                        >
                            {loading ? <span className="animate-spin mr-2">⏳</span> : <Save className="w-4 h-4 mr-2" />}
                            Guardar Cambios
                        </Button>
                    </div>

                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

function SidebarTab({ active, onClick, icon: Icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all",
                active
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            )}
        >
            <Icon className="w-5 h-5" />
            {label}
        </button>
    );
}

function Toggle({ label, description, checked, onChange }: any) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="pr-4">
                <p className="font-medium text-slate-800 dark:text-white text-sm">{label}</p>
                {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
            </div>
            <button
                onClick={onChange}
                className={cn(
                    "w-11 h-6 rounded-full transition-colors relative flex-shrink-0",
                    checked ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                )}
            >
                <div className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform",
                    checked ? "translate-x-5" : "translate-x-0.5"
                )} />
            </button>
        </div>
    );
}
