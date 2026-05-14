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
            if (activeDropdown && !target.closest('.dropdown-container')) {
                setActiveDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeDropdown]);

    useEffect(() => {
        const loadUser = () => {
            const userData = sessionStorage.getItem('user_display');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
            }
        };

        loadUser();
        window.addEventListener('userUpdated', loadUser);

        // Forzar siempre modo claro
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');

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


    const confirmLogout = async () => {
        try {
            // Call backend to clear HttpOnly cookie and invalidate server session
            const csrfToken = document.cookie
                .split('; ')
                .find(r => r.startsWith('csrf_token='))
                ?.split('=')[1] || '';
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: { 'X-CSRF-Token': csrfToken }
            });
        } catch (e) {
            console.warn('[Logout] Request failed, clearing local state anyway.');
        }
        sessionStorage.removeItem('user_display');
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

    const [isReloading, setIsReloading] = useState(false);

    const handleUpdateMefClick = () => {
        setIsReloading(true);
        window.location.reload();
    };

    return (
        <>
                {/* Right side: Actions */}
                <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0">

                    {/* 1. FECHA — chip con ícono de reloj */}
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#0F2C4A]/60 border border-slate-200 dark:border-blue-900/40">
                        <svg className="w-3 h-3 text-blue-500 dark:text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                        </svg>
                        {mefLastUpdated || isUpdatingMef ? (
                            isUpdatingMef ? (
                                <span className="text-[11px] text-blue-500 font-semibold whitespace-nowrap">
                                    Trabajando...
                                </span>
                            ) : (
                                <span className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold whitespace-nowrap">
                                    {mefLastUpdated}
                                </span>
                            )
                        ) : null}
                    </div>

                    {/* 2. REFRESCAR — botón premium */}
                    <button
                        onClick={handleUpdateMefClick}
                        disabled={isReloading}
                        className={`group flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 border
                            ${isReloading
                                ? 'bg-blue-50 border-blue-200 text-blue-400 cursor-not-allowed'
                                : 'bg-white border-slate-200 text-slate-600 hover:text-[#0F2C4A] hover:border-[#0F2C4A] hover:bg-slate-50 shadow-sm'}`}
                        title="Refrescar vista"
                    >
                        <svg className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin text-blue-500' : 'text-slate-400 group-hover:text-[#0F2C4A] transition-colors'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        <span className="hidden md:inline">Refrescar</span>
                    </button>

                    {/* Portal Target */}
                    <div id="portal-header-actions" className="flex items-center"></div>

                    {/* Divisor */}
                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-700"></div>

                    {/* 3. NOTIFICACIONES — campana con badge */}
                    <div className="flex items-center justify-center relative shrink-0 dropdown-container">
                        <NotificationDropdown
                            isOpen={activeDropdown === 'notifications'}
                            onToggle={() => setActiveDropdown(activeDropdown === 'notifications' ? null : 'notifications')}
                            onClose={() => setActiveDropdown(null)}
                        />
                    </div>

                    {/* 4. PERFIL */}
                    <div className="relative shrink-0 dropdown-container">
                        <button
                            onClick={() => setActiveDropdown(isProfileOpen ? null : 'profile')}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full ring-2 ring-blue-500/40 hover:ring-blue-500/80 transition-all hover:scale-105 active:scale-95 p-0 overflow-hidden"
                        >
                            <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#0D1F38] to-blue-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
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
                                    <div className="mt-2 inline-block px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-widest border border-blue-200 dark:border-blue-800">
                                        {user?.role || user?.perfil || 'Colaborador'}
                                    </div>
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
