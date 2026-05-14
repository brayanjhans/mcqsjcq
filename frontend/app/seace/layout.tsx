'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { HeaderActions } from '@/components/layout/header-actions';
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';
import { useAuthProtection } from '@/hooks/use-auth-protection';

export default function SEACELayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const userData = sessionStorage.getItem('user_display');
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, [router]);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    const isActive = (path: string) => pathname === path;
    const getDelay = (index: number) => `${index * 50}ms`;

    const { isAuthenticated, loading } = useAuthProtection();

    if (loading || !isAuthenticated) {
        return null; // Or a loading spinner
    }

    return (
        <div className="flex flex-col w-full h-screen overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-500">
            {/* Overlay Móvil Glassmorphism */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 lg:hidden bg-black/20 backdrop-blur-sm transition-all duration-500 ease-in-out"
                    onClick={() => setMobileMenuOpen(false)}
                ></div>
            )}

            {/* Header Superior - Portal de Contrataciones (FULL WIDTH) */}
            <header className="h-[70px] w-full bg-white dark:bg-[#0A192F] flex items-center justify-between px-4 lg:px-8 z-[60] shadow-md relative shrink-0 pt-[12px] pb-[6px]">
                {/* Línea Superior Texturizada */}
                <div className="absolute top-0 left-0 w-full h-[12px] bg-gradient-to-r from-[#0F2C4A] from-[35%] via-blue-600 via-[50%] to-amber-500 to-[65%] overflow-hidden">
                    <div className="absolute inset-0 texture-diamonds mix-blend-overlay opacity-60"></div>
                </div>

                {/* Línea Inferior Texturizada (Degradado Inverso) */}
                <div className="absolute bottom-0 left-0 w-full h-[6px] bg-gradient-to-l from-[#0F2C4A] from-[35%] via-blue-600 via-[50%] to-amber-500 to-[65%] overflow-hidden">
                    <div className="absolute inset-0 texture-diamonds mix-blend-overlay opacity-60"></div>
                </div>

                <div className="flex items-center gap-1.5 lg:gap-3 flex-shrink-0">
                    <button 
                        onClick={() => setMobileMenuOpen(true)}
                        className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white"
                    >
                        <i className="fas fa-bars"></i>
                    </button>
                    <div className="flex items-center gap-1.5 lg:gap-3">
                        <div className="flex items-center gap-1 lg:gap-2">
                            <img src="/logo-mqs.png" alt="MQS" className="h-8 lg:h-12 w-auto object-contain mix-blend-multiply" />
                            <div className="hidden sm:block leading-none">
                                <p className="text-[9px] lg:text-[11px] font-black text-[#0F2C4A] dark:text-white uppercase tracking-wider">Asesoramiento</p>
                                <p className="text-[9px] lg:text-[11px] font-black text-[#0F2C4A] dark:text-white uppercase tracking-wider">de Finanzas</p>
                            </div>
                        </div>
                        <div className="w-[1px] h-8 lg:h-12 bg-slate-200 dark:bg-white/10 mx-1 lg:mx-2"></div>
                        <div className="flex items-center gap-1 lg:gap-2">
                            <img src="/logo-jcq.png" alt="JCQ" className="h-8 lg:h-12 w-auto object-contain mix-blend-multiply" />
                            <div className="hidden sm:block leading-none">
                                <p className="text-[9px] lg:text-[11px] font-black text-[#0F2C4A] dark:text-white uppercase tracking-wider">Asesoramiento en</p>
                                <p className="text-[9px] lg:text-[11px] font-black text-[#0F2C4A] dark:text-white uppercase tracking-wider">Construccion</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center pointer-events-none">
                    <h2 className="text-xl lg:text-2xl font-black text-[#0F2C4A] dark:text-white tracking-[0.2em] uppercase">
                        PORTAL DE CONTRATACIONES
                    </h2>
                </div>

                <div className="flex-shrink-0">
                    <HeaderActions />
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar Premium SEACE */}
            <aside
                className={`
                    fixed lg:static inset-y-0 left-0 z-[100]
                    text-white flex flex-col
                    transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) shadow-2xl lg:shadow-xl
                    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    ${collapsed ? 'w-[90px]' : 'w-[280px]'}
                    border-r-0 lg:border-r border-white/5
                    backdrop-blur-md
                    bg-[#0A192F] bg-dotted-pattern
                `}
            >
                {/* Collapse Button Area (Desktop) */}
                <div className="flex items-center justify-between px-6 py-4 relative shrink-0">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className={`
                            hidden lg:flex items-center justify-center
                            w-9 h-9 rounded-full
                            bg-[#132337] border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.4)]
                            text-white/80 hover:text-white
                            hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-500 hover:border-blue-400/50 
                            hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:scale-110
                            transition-all duration-300 ease-out
                            absolute -right-[18px] top-1/2 -translate-y-1/2 z-[110]
                            group
                        `}
                    >
                        <i className={`fas ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-[11px] transition-transform duration-300 group-hover:${collapsed ? 'translate-x-0.5' : '-translate-x-0.5'}`}></i>
                    </button>
                    
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Menú Scrollable */}
                <div className={`flex-1 px-3 space-y-1 pb-4 scrollbar-hide ${collapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
                    <MenuGroup title="Inteligencia SEACE" collapsed={collapsed}>
                        <MenuItem href="/seace/dashboard" icon="fa-chart-pie" label="Dashboard" active={isActive('/seace/dashboard')} collapsed={collapsed} delay={getDelay(1)} color="indigo" />
                        <MenuItem href="/seace/busqueda" icon="fa-search" label="Búsqueda" active={isActive('/seace/busqueda')} collapsed={collapsed} delay={getDelay(2)} color="amber" />
                        <MenuItem href="/seace/notificaciones" icon="fa-database" label="Notificaciones" active={isActive('/seace/notificaciones')} collapsed={collapsed} delay={getDelay(3)} color="blue" />
                        <MenuItem href="/seace/reportes" icon="fa-chart-bar" label="Reportes" active={isActive('/seace/reportes')} collapsed={collapsed} delay={getDelay(4)} color="emerald" />
                        <MenuItem href="/seace/gestion-manual" icon="fa-clipboard-list" label="Gestión Manual" active={isActive('/seace/gestion-manual')} collapsed={collapsed} delay={getDelay(5)} color="rose" />
                    </MenuGroup>
                </div>

                {/* Footer / User Profile & Volver */}
                <div className={`p-4 mt-auto border-t border-white/5 space-y-3 ${collapsed ? 'px-2' : ''}`}>
                    {/* User Profile */}
                    <div className={`
                        flex items-center gap-3 p-3 rounded-2xl bg-[#132337] border border-white/10
                        ${collapsed ? 'justify-center p-2' : ''}
                    `}>
                        <div className="relative flex-shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-[#FF4B63] flex items-center justify-center shadow-lg">
                                <span className="font-bold text-white text-lg">B</span>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#132337] rounded-full"></div>
                        </div>
                        {!collapsed && (
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-sm font-bold text-white truncate">Brayan Jhans</span>
                                <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest mt-0.5">Director</span>
                            </div>
                        )}
                    </div>
                    {/* Back Button */}
                    <button
                        onClick={() => router.push('/modules')}
                        className={`
                            relative overflow-hidden group w-full rounded-2xl transition-all duration-300 border border-white/10
                            ${collapsed
                                ? 'h-12 bg-[#132337] text-white flex items-center justify-center'
                                : 'px-4 py-3.5 bg-[#132337] hover:bg-[#1A2C42] flex items-center gap-3 text-white'}
                        `}
                    >
                        <i className="fas fa-arrow-left text-sm"></i>
                        {!collapsed && <span className="font-bold text-sm tracking-wide">Volver</span>}
                    </button>
                </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6 scroll-smooth bg-white dark:bg-gray-950 relative">
                    <div className="mx-auto max-w-[1600px] h-full animate-in fade-in duration-700 slide-in-from-bottom-2">
                        {children}
                    </div>
                </main>
            </div>
            <ChatbotWidget />
        </div>
    );
}

function MenuGroup({ title, children, collapsed, className = "" }: any) {
    if (collapsed) return <div className={`space-y-1 mb-2 ${className}`}>{children}</div>;
    return (
        <div className={`space-y-1 mb-2 ${className}`}>
            <div className="px-4 py-2 flex items-center gap-2 opacity-80">
                <div className="h-[2px] w-3 bg-blue-400 rounded-full shadow-[0_0_5px_rgba(96,165,250,0.8)]"></div>
                <h4 className="text-[11px] font-extrabold text-blue-100 uppercase tracking-widest drop-shadow-sm">{title}</h4>
            </div>
            {children}
        </div>
    );
}

function MenuItem({ href, icon, label, active, collapsed, delay, color = "blue" }: any) {
    const bgGradients: any = {
        indigo: 'from-indigo-600 to-indigo-500 shadow-indigo-900/40',
        blue: 'from-blue-600 to-blue-500 shadow-blue-900/40',
        amber: 'from-amber-500 to-orange-500 shadow-orange-900/40',
        emerald: 'from-emerald-600 to-teal-500 shadow-emerald-900/40',
        rose: 'from-rose-600 to-pink-500 shadow-rose-900/40',
    };

    const hoverColors: any = {
        indigo: 'hover:bg-gradient-to-r hover:from-indigo-600 hover:to-indigo-500 hover:shadow-indigo-900/40',
        blue: 'hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-500 hover:shadow-blue-900/40',
        amber: 'hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-500 hover:shadow-orange-900/40',
        emerald: 'hover:bg-gradient-to-r hover:from-emerald-600 hover:to-teal-500 hover:shadow-emerald-900/40',
        rose: 'hover:bg-gradient-to-r hover:from-rose-600 hover:to-pink-500 hover:shadow-rose-900/40',
    };

    const tooltipColors: any = {
        indigo: 'text-indigo-400',
        blue: 'text-blue-400',
        amber: 'text-amber-400',
        emerald: 'text-emerald-400',
        rose: 'text-rose-400',
    };

    const tooltipBorders: any = {
        indigo: 'border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.2)]',
        blue: 'border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.2)]',
        amber: 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]',
        emerald: 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]',
        rose: 'border-rose-500/40 shadow-[0_0_20px_rgba(244,63,110,0.2)]',
    };

    return (
        <Link href={href}>
            <div
                style={{ animationDelay: delay }}
                className={`
                    relative cursor-pointer transition-all duration-300 group flex items-center
                    ${active
                        ? `bg-gradient-to-r text-white scale-[1.02] ${collapsed ? '' : 'translate-x-1'} ${bgGradients[color]}`
                        : `text-white/80 hover:shadow-lg ${collapsed ? '' : 'hover:translate-x-1'} ${hoverColors[color]}`
                    }
                    ${collapsed ? 'justify-center w-12 h-12 mx-auto !rounded-[1.25rem]' : 'mx-3 px-4 py-3 rounded-[1.25rem]'}
                    animate-in slide-in-from-left-2 fade-in fill-mode-backwards
                `}
            >
                <i className={`fas ${icon} text-[1.1rem] transition-all duration-300 group-hover:scale-110 group-active:scale-95 ${collapsed ? '' : 'mr-4 w-6 text-center'} ${active ? 'text-white drop-shadow-md' : 'group-hover:text-white'}`}></i>
                {!collapsed && (
                    <span className={`font-bold tracking-wide flex-1 transition-all duration-300 drop-shadow-sm ${active ? 'text-[15px] text-white' : 'text-[14.5px] group-hover:text-white'}`}>{label}</span>
                )}
                {active && !collapsed && (
                    <div className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center ml-2 border border-black/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm"></div>
                    </div>
                )}
                
                {/* Tooltip Flotante Mejorado */}
                {collapsed && (
                    <div className={`
                        absolute left-[calc(100%+16px)] 
                        opacity-0 invisible translate-x-2 
                        group-hover:opacity-100 group-hover:visible group-hover:translate-x-0 
                        transition-all duration-300 ease-out z-[9999] whitespace-nowrap 
                        bg-[#0A192F]/95 backdrop-blur-sm border ${tooltipBorders[color]} 
                        rounded-xl px-4 py-2 flex items-center
                    `}>
                        <span className={`text-[13px] font-extrabold tracking-wide drop-shadow-md ${tooltipColors[color]}`}>{label}</span>
                        <div className={`absolute -left-[5px] top-1/2 -translate-y-1/2 w-[10px] h-[10px] bg-[#0A192F] border-l border-b ${tooltipBorders[color].split(' ')[0]} rotate-45 rounded-sm`}></div>
                    </div>
                )}
            </div>
        </Link>
    );
}