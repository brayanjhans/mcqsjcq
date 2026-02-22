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

        // Sondeo automático cada 5 minutos para refrescar la fecha de actualización 
        // en caso de que el planificador ETL (BackgroundScheduler) actúe en el VPS
        const intervalId = setInterval(fetchLastUpdated, 5 * 60 * 1000);
        return () => clearInterval(intervalId);
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

    return (
        <>
            <div className="absolute top-6 right-6 z-50 flex items-center gap-4">
                {/* MEF Update Button (Responsive) */}
                <div className="relative flex flex-col items-center">
                    <button
                        onClick={handleUpdateMef}
                        disabled={isUpdatingMef}
                        className={`flex h-12 px-4 rounded-full backdrop-blur-md border shadow-lg items-center justify-center gap-2 transition-all 
                            ${updateSuccess
                                ? 'bg-emerald-500/90 border-emerald-400 text-white'
                                : isUpdatingMef
                                    ? 'bg-blue-500/80 border-blue-400 text-white cursor-wait'
                                    : 'bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-blue-300 hover:bg-white dark:hover:bg-slate-800'
                            }`}
                        title="Actualizar datos del MEF (CSV 2025/2026)"
                    >
                        <i className={`fas ${updateSuccess ? 'fa-check' : 'fa-sync'} ${isUpdatingMef ? 'fa-spin' : ''}`}></i>
                        <span className="hidden md:inline text-sm font-bold max-w-[200px] truncate text-center">
                            {isUpdatingMef || updateSuccess || mefStatusText.includes('Error') ? mefStatusText : 'Actualizar MEF'}
                        </span>
                    </button>
                    {mefLastUpdated && !isUpdatingMef && (
                        <span className="absolute -bottom-5 text-[10px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                            Datos del MEF al {mefLastUpdated}
                        </span>
                    )}
                </div>

                {/* Dark Mode Toggle (Desktop) */}
                <button
                    onClick={toggleTheme}
                    className="hidden lg:flex w-12 h-12 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-gray-200 dark:border-slate-700 shadow-lg items-center justify-center text-slate-700 dark:text-blue-300 hover:bg-white dark:hover:bg-slate-800 transition-all group"
                    title={darkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
                >
                    <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'} text-xl transition-transform group-hover:rotate-12`}></i>
                </button>

                {/* Notifications (Desktop) */}
                <div className="hidden lg:flex w-12 h-12 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-gray-200 dark:border-slate-700 shadow-lg items-center justify-center transition-all">
                    <NotificationDropdown
                        isOpen={activeDropdown === 'notifications'}
                        onToggle={() => setActiveDropdown(activeDropdown === 'notifications' ? null : 'notifications')}
                        onClose={() => setActiveDropdown(null)}
                    />
                </div>

                {/* User Profile (Visible always) */}
                <div className="relative">
                    <button
                        onClick={() => setActiveDropdown(isProfileOpen ? null : 'profile')}
                        className="w-12 h-12 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-gray-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-slate-800 transition-all hover:scale-110 active:scale-95 group p-0.5"
                    >
                        <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white text-lg font-bold shadow-md overflow-hidden">
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

                            {/* Mobile Icons Row */}
                            <div className="lg:hidden flex items-center justify-around gap-4 p-3 m-2 bg-gray-50/80 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700">
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
