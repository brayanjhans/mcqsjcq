'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogoutModal } from '@/components/ui/logout-modal';
import NotificationDropdown from '@/components/notifications/notification-dropdown';
import { NotificationModal } from '@/components/notifications/notification-modal';
import { SettingsModal } from '@/components/settings/settings-modal';
import { ProfileModal } from '@/components/profile/profile-modal';
import { SupportModal } from '@/components/support/support-modal';

export function HeaderActions() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [darkMode, setDarkMode] = useState(false);
    const [isUpdatingMef, setIsUpdatingMef] = useState(false);
    const [updateSuccess, setUpdateSuccess] = useState(false);
    const [mefStatusText, setMefStatusText] = useState('Actualizando...');
    const [mefLastUpdated, setMefLastUpdated] = useState<string | null>(null);
    const [isUpdatingOsce, setIsUpdatingOsce] = useState(false);
    const [osceSuccess, setOsceSuccess] = useState(false);
    const [osceStatusText, setOsceStatusText] = useState('Actualizando SEACE...');

    // Unified Dropdown State (Mutual Exclusion)
    const [activeDropdown, setActiveDropdown] = useState<'profile' | 'notifications' | null>(null);
    const isProfileOpen = activeDropdown === 'profile';

    // Modal States
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (activeDropdown && !target.closest('.relative')) {
                setActiveDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeDropdown]);

    useEffect(() => {
        const loadUser = () => {
            const userData = localStorage.getItem('user');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
            }
        };

        loadUser();
        window.addEventListener('userUpdated', loadUser);

        const isDark = localStorage.getItem('theme') === 'dark' ||
            (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);

        setDarkMode(isDark);
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        return () => window.removeEventListener('userUpdated', loadUser);
    }, []);

    const fetchLastUpdated = async () => {
        try {
            const { default: integracionService } = await import('@/lib/services/integracionService');
            const data = await integracionService.getMefLastUpdated();
            if (data.last_updated) {
                const date = new Date(data.last_updated);
                setMefLastUpdated(date.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }));
            }
        } catch (err) {
            console.error("Error fetching MEF last updated date:", err);
        }
    };

    // Check if MEF update is already running on mount
    useEffect(() => {
        const checkInitialStatus = async () => {
            try {
                const res = await fetch('/api/integraciones/update-mef/status');
                if (res.ok) {
                    const statusData = await res.json();
                    if (statusData.is_running && !isUpdatingMef) {
                        setIsUpdatingMef(true);
                        setMefStatusText(statusData.current_step || 'Actualizando...');
                        startPolling();
                    }
                }
            } catch (err) {
                console.error("Error checking initial MEF status:", err);
            }
        };

        checkInitialStatus();
        fetchLastUpdated();

        // Check status periodically to keep the UI in sync even if the cron job or another ADMIN triggers it
        const backgroundCheckInterval = setInterval(async () => {
            if (!isUpdatingMef) {
                const res = await fetch('/api/integraciones/update-mef/status');
                if (res.ok) {
                    const statusData = await res.json();
                    if (statusData.is_running) {
                        setIsUpdatingMef(true);
                        setMefStatusText(statusData.current_step || 'Actualizando...');
                        startPolling();
                    } else {
                        // If not running, just update the date text
                        fetchLastUpdated();
                    }
                }
            }
        }, 30 * 1000); // Check every 30 seconds globally
        return () => {
            clearInterval(backgroundCheckInterval);
        };
    }, []);

    const startPolling = () => {
        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch('/api/integraciones/update-mef/status');
                if (!res.ok) throw new Error("Failed to fetch status");

                const statusData = await res.json();

                if (statusData.current_step) {
                    setMefStatusText(statusData.current_step);
                }

                if (!statusData.is_running && statusData.current_step !== '') {
                    // Process finished
                    clearInterval(pollInterval);
                    setIsUpdatingMef(false);

                    if (statusData.current_step.includes('Error')) {
                        setUpdateSuccess(false);
                        setMefStatusText('Error al actualizar');
                        setTimeout(() => setMefStatusText('Actualizar MEF'), 5000);
                    } else {
                        setUpdateSuccess(true);
                        setMefStatusText('Actualizado');
                        fetchLastUpdated();
                        setTimeout(() => {
                            setUpdateSuccess(false);
                            setMefStatusText('Actualizar MEF');
                        }, 5000);
                    }
                }
            } catch (err) {
                console.error("Error polling MEF update status:", err);
                clearInterval(pollInterval);
                setIsUpdatingMef(false);
                setMefStatusText('Error de conexión');
                setTimeout(() => setMefStatusText('Actualizar MEF'), 5000);
            }
        }, 3000);
        return pollInterval;
    };

    const toggleTheme = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        if (newMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    const confirmLogout = () => {
        localStorage.clear();
        window.location.href = '/';
    };

    const handleUpdateMef = async () => {
        if (isUpdatingMef) return;
        setIsUpdatingMef(true);
        setUpdateSuccess(false);
        setMefStatusText('Iniciando...');

        try {
            // 1. Trigger the update (starts background process)
            const { default: integracionService } = await import('@/lib/services/integracionService');
            await integracionService.triggerMefUpdate();
            startPolling();
        } catch (error: any) {
            if (error.response?.status === 409) {
                // If it's already in progress (409 conflict), just start polling to catch up
                startPolling();
            } else {
                console.error("Error starting MEF Update:", error);
                setIsUpdatingMef(false);
                setMefStatusText('Error al iniciar');
                setTimeout(() => setMefStatusText('Actualizar MEF'), 3000);
            }
        }
    };

    const handleUpdateOsce = async () => {
        if (isUpdatingOsce) return;
        setIsUpdatingOsce(true);
        setOsceSuccess(false);
        setOsceStatusText('Iniciando...');

        try {
            await fetch('/api/integraciones/update-osce', { method: 'POST' });

            // Start polling
            const pollInterval = setInterval(async () => {
                try {
                    const res = await fetch('/api/integraciones/update-osce/status');
                    if (!res.ok) throw new Error('Failed to fetch status');
                    const statusData = await res.json();

                    if (statusData.current_step) setOsceStatusText(statusData.current_step);

                    if (!statusData.is_running && statusData.current_step !== '') {
                        clearInterval(pollInterval);
                        setIsUpdatingOsce(false);
                        if (statusData.current_step.includes('Error')) {
                            setOsceStatusText('Error al actualizar');
                            setTimeout(() => setOsceStatusText('Actualizar SEACE'), 5000);
                        } else {
                            setOsceSuccess(true);
                            setOsceStatusText('Actualizado');
                            setTimeout(() => { setOsceSuccess(false); setOsceStatusText('Actualizar SEACE'); }, 5000);
                        }
                    }
                } catch (err) {
                    clearInterval(pollInterval);
                    setIsUpdatingOsce(false);
                    setOsceStatusText('Error de conexión');
                    setTimeout(() => setOsceStatusText('Actualizar SEACE'), 5000);
                }
            }, 3000);
        } catch (error: any) {
            if (error?.status === 409) {
                setOsceStatusText('Ya en ejecución...');
            } else {
                setIsUpdatingOsce(false);
                setOsceStatusText('Error al iniciar');
                setTimeout(() => setOsceStatusText('Actualizar SEACE'), 3000);
            }
        }
    };

    const handleUpdateMefClick = () => {
        window.location.reload();
    };

    return (
        <>
            <div className="w-full h-14 sm:h-16 bg-white dark:bg-[#0b122b] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-2 sm:px-6 z-40 shrink-0 shadow-sm transition-colors duration-300">

                {/* Left side: Back Button Portal Target */}
                <div id="portal-header-left" className="flex items-center min-w-0"></div>

                {/* Right side: Actions */}
                <div className="flex items-center justify-end gap-1 sm:gap-3 shrink-0 ml-auto">
                    {/* Last Updated Label - Hidden on mobile */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                        {mefLastUpdated || isUpdatingMef ? (
                            isUpdatingMef ? (
                                <span className="text-xs sm:text-sm text-blue-500 font-medium whitespace-nowrap">
                                    <i className="fas fa-database fa-fade"></i> Trabajando...
                                </span>
                            ) : (
                                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                                    Datos al {mefLastUpdated}
                                </span>
                            )
                        ) : null}
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={handleUpdateMefClick}
                        className={`flex h-10 px-4 rounded-full backdrop-blur-md border border-gray-200 dark:border-slate-700 shadow-sm items-center justify-center gap-2 transition-all 
                            ${isUpdatingMef ? 'bg-blue-50/50 dark:bg-blue-900/30' : 'bg-white hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 active:scale-95'} 
                            text-slate-700 dark:text-blue-300 font-medium text-sm`}
                        title="Refrescar vista"
                    >
                        <i className={`fas fa-sync ${isUpdatingMef ? 'fa-spin text-blue-500' : ''}`}></i>
                        <span className="hidden md:inline">
                            Refrescar
                        </span>
                    </button>

                    {/* Portal Target for Page-Specific Actions like Export */}
                    <div id="portal-header-actions" className="flex items-center"></div>

                    {/* Vertical line separator */}
                    <div className="hidden xs:flex h-6 items-center">
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 sm:mx-2"></div>
                    </div>

                    {/* Notifications */}
                    <div className="flex w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-50 dark:bg-slate-800/50 backdrop-blur-md items-center justify-center transition-all relative shrink-0">
                        <NotificationDropdown
                            isOpen={activeDropdown === 'notifications'}
                            onToggle={() => setActiveDropdown(activeDropdown === 'notifications' ? null : 'notifications')}
                            onClose={() => setActiveDropdown(null)}
                        />
                    </div>

                    {/* User Profile */}
                    <div className="relative shrink-0">
                        <button
                            onClick={() => setActiveDropdown(isProfileOpen ? null : 'profile')}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-slate-800/50 backdrop-blur-md flex items-center justify-center text-gray-700 dark:text-gray-200 hover:scale-105 active:scale-95 group p-0"
                        >
                            <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white text-lg font-bold shadow-sm overflow-hidden border-2 border-white dark:border-slate-800">
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    user?.nombre?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'
                                )}
                            </div>
                        </button>

                        {/* Dropdown Menu */}
                        {isProfileOpen && (
                            <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right z-[9999]">
                                <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
                                    <p className="font-bold text-gray-900 dark:text-white mb-1">{user?.nombre || 'Usuario'}</p>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{user?.job_title || 'Sin cargo definido'}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email || 'usuario@example.com'}</p>
                                </div>

                                {/* Theme & Alerts Row */}
                                <div className="flex items-center justify-around gap-4 p-3 m-2 bg-gray-50/80 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleTheme();
                                        }}
                                        className="flex flex-col items-center gap-1 group"
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm border transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-blue-300' : 'bg-white border-gray-200 text-amber-500'} group-active:scale-95`}>
                                            <i className={`fas ${darkMode ? 'fa-moon' : 'fa-sun'} text-lg`}></i>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Tema</span>
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveDropdown(null);
                                            setIsNotificationModalOpen(true);
                                        }}
                                        className="flex flex-col items-center gap-1 group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 group-active:scale-95 relative">
                                            <i className="fas fa-bell text-lg"></i>
                                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-800"></span>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Alertas</span>
                                    </button>
                                </div>

                                <div className="p-2">
                                    {['admin', 'director', 'DIRECTOR', 'ADMIN'].includes(user?.role) && (
                                        <>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUpdateMef();
                                                }}
                                                disabled={isUpdatingMef}
                                                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-3 transition-colors"
                                                title="Actualizar base de datos del MEF"
                                            >
                                                <div className="w-6 flex justify-center">
                                                    <i className={`fas ${updateSuccess ? 'fa-check text-emerald-500' : 'fa-database'} ${isUpdatingMef ? 'fa-spin' : ''}`}></i>
                                                </div>
                                                {isUpdatingMef || updateSuccess || mefStatusText.includes('Error') ? mefStatusText : 'Extraer Datos MEF'}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUpdateOsce();
                                                }}
                                                disabled={isUpdatingOsce}
                                                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-3 transition-colors"
                                                title="Actualizar datos OSCE/SEACE (modo incremental)"
                                            >
                                                <div className="w-6 flex justify-center">
                                                    <i className={`fas ${osceStatusText === 'Actualizado con datos nuevos' ? 'fa-check text-emerald-500' :
                                                        osceStatusText === 'Sin cambios nuevos' ? 'fa-circle-check text-blue-400' :
                                                            osceStatusText.includes('Error') ? 'fa-triangle-exclamation text-red-400' :
                                                                'fa-satellite-dish'
                                                        } ${isUpdatingOsce ? 'fa-pulse' : ''}`}></i>
                                                </div>
                                                <span className={
                                                    osceStatusText === 'Sin cambios nuevos' ? 'text-blue-500 dark:text-blue-400' :
                                                        osceStatusText.includes('Error') ? 'text-red-500' : ''
                                                }>
                                                    {isUpdatingOsce || osceStatusText !== 'Actualizando SEACE...' ? osceStatusText : 'Actualizar SEACE'}
                                                </span>
                                            </button>
                                            <div className="h-px bg-gray-100 dark:bg-slate-700 my-1"></div>
                                        </>
                                    )}
                                    <button
                                        onClick={() => {
                                            setActiveDropdown(null);
                                            router.push('/profile');
                                        }}
                                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700/50 text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-3 transition-colors"
                                    >
                                        <div className="w-6 flex justify-center">
                                            <i className="fas fa-user-circle text-gray-400"></i>
                                        </div>
                                        Editar perfil
                                    </button>
                                    <button
                                        onClick={() => {
                                            setActiveDropdown(null);
                                            setIsSettingsModalOpen(true);
                                        }}
                                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700/50 text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-3 transition-colors"
                                    >
                                        <div className="w-6 flex justify-center">
                                            <i className="fas fa-cog text-gray-400"></i>
                                        </div>
                                        Configuración
                                    </button>
                                    <button
                                        onClick={() => {
                                            setActiveDropdown(null);
                                            setIsSupportModalOpen(true);
                                        }}
                                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700/50 text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-3 transition-colors"
                                    >
                                        <div className="w-6 flex justify-center">
                                            <i className="fas fa-circle-info text-gray-400"></i>
                                        </div>
                                        Soporte
                                    </button>
                                    <div className="h-px bg-gray-100 dark:bg-slate-700 my-1"></div>
                                    <button
                                        onClick={() => {
                                            setActiveDropdown(null);
                                            setIsLogoutModalOpen(true);
                                        }}
                                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-3 transition-colors"
                                    >
                                        <div className="w-6 flex justify-center">
                                            <i className="fas fa-right-from-bracket"></i>
                                        </div>
                                        Cerrar Sesión
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <LogoutModal
                open={isLogoutModalOpen}
                onOpenChange={setIsLogoutModalOpen}
                onConfirm={confirmLogout}
            />
            <SettingsModal
                open={isSettingsModalOpen}
                onOpenChange={setIsSettingsModalOpen}
            />
            <ProfileModal
                open={isProfileModalOpen}
                onOpenChange={setIsProfileModalOpen}
            />
            <SupportModal
                open={isSupportModalOpen}
                onOpenChange={setIsSupportModalOpen}
            />
            <NotificationModal
                open={isNotificationModalOpen}
                onOpenChange={setIsNotificationModalOpen}
            />
        </>
    );
}
