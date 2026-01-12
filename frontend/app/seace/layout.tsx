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
        const userData = localStorage.getItem('user');
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
        <div className="block lg:flex w-full h-screen overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-500">
            {/* Overlay Móvil Glassmorphism */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 lg:hidden bg-black/20 backdrop-blur-sm transition-all duration-500 ease-in-out"
                    onClick={() => setMobileMenuOpen(false)}
                ></div>
            )}

            {/* Sidebar Premium SEACE */}
            <aside
                className={`
                    fixed lg:static inset-y-0 left-0 z-50
                    text-white flex flex-col
                    transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) shadow-2xl lg:shadow-xl
                    bg-gradient-to-b from-[#0F2C4A] via-[#133657] to-[#081829]
                    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    ${collapsed ? 'w-[90px]' : 'w-[280px]'}
                    lg:my-4 lg:ml-4 lg:rounded-3xl border-r-0 lg:border border-white/5
                    lg:relative
                `}
            >
                <div className="h-[90px] flex items-center justify-between px-6 relative">
                    <div className={`transition-all duration-500 flex items-center justify-center gap-3 ${collapsed ? 'opacity-0 w-0' : 'opacity-100 flex-1'}`}>
                        {/* Logo MQS */}
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm ring-1 ring-white/20 overflow-hidden flex-shrink-0">
                            <img src="/logo-mqs.png" alt="MQS" className="w-full h-full object-cover" />
                        </div>
                        {/* Texto Marca */}
                        <span className="font-bold text-2xl tracking-tight text-white font-sans drop-shadow-md whitespace-nowrap">
                            MQS <span className="text-blue-200">JCQ</span>
                        </span>
                        {/* Logo JCQ */}
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm ring-1 ring-white/20 overflow-hidden flex-shrink-0">
                            <img src="/logo-jcq.png" alt="JCQ" className="w-full h-full object-cover" />
                        </div>
                    </div>

                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Botón Toggle Flotante en el Borde */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={`
                        hidden lg:flex items-center justify-center
                        w-6 h-12 rounded-full
                        bg-[#0F2C4A] border border-white/20 shadow-[0_0_15px_rgba(0,0,0,0.3)]
                        text-blue-200 hover:text-white hover:bg-blue-600
                        transition-all duration-300 transform hover:scale-110 active:scale-95
                        absolute -right-3 top-1/2 -translate-y-1/2 z-[60]
                        cursor-pointer backdrop-blur-md
                    `}
                    title={collapsed ? "Expandir menú" : "Colapsar menú"}
                >
                    <i className={`fas ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-[10px]`}></i>
                </button>

                {/* Menú Scrollable */}
                <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-4 scrollbar-hide">
                    <MenuGroup title="Inteligencia SEACE" collapsed={collapsed}>
                        <MenuItem href="/seace/dashboard" icon="fa-chart-pie" label="Dashboard" active={isActive('/seace/dashboard')} collapsed={collapsed} delay={getDelay(1)} />
                        <MenuItem href="/seace/busqueda" icon="fa-search" label="Búsqueda" active={isActive('/seace/busqueda')} collapsed={collapsed} delay={getDelay(2)} />
                        <MenuItem href="/seace/notificaciones" icon="fa-database" label="Notificaciones" active={isActive('/seace/notificaciones')} collapsed={collapsed} delay={getDelay(3)} />
                        <MenuItem href="/seace/reportes" icon="fa-chart-bar" label="Reportes" active={isActive('/seace/reportes')} collapsed={collapsed} delay={getDelay(4)} />
                        <MenuItem href="/seace/gestion-manual" icon="fa-clipboard-list" label="Gestión Manual" active={isActive('/seace/gestion-manual')} collapsed={collapsed} delay={getDelay(5)} />
                    </MenuGroup>
                </div>

                {/* Footer */}
                <div className="p-4 mt-auto space-y-3">
                    {/* Back Button */}
                    <button
                        onClick={() => router.push('/modules')}
                        className={`
                            relative overflow-hidden group w-full rounded-2xl transition-all duration-300 border border-blue-500/20
                            ${collapsed
                                ? 'h-12 bg-blue-500/10 text-blue-400 hover:text-white flex items-center justify-center'
                                : 'px-4 py-3.5 bg-blue-500/10 hover:bg-blue-500 flex items-center gap-3 text-blue-100 hover:text-white'}
                        `}
                    >
                        <div className={`absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ${collapsed ? 'rounded-2xl' : ''}`}></div>
                        <i className="fas fa-arrow-left relative z-10 text-lg transition-transform group-hover:scale-110"></i>
                        {!collapsed && <span className="font-bold text-base relative z-10 tracking-wide">Volver</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Header Actions - Top Right (Visible en Móvil y Desktop) */}
                <div className="relative z-50">
                    <HeaderActions />
                </div>

                {/* Botón Menú Móvil (Floating Action Button - Fixed Bottom Left) */}
                <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="lg:hidden fixed bottom-6 left-6 z-50 w-14 h-14 flex items-center justify-center rounded-full bg-[#0F2C4A] text-white shadow-[0_4px_20px_rgba(15,44,74,0.4)] hover:scale-110 active:scale-95 transition-all backdrop-blur-sm border border-white/20"
                >
                    <i className="fas fa-bars text-xl"></i>
                </button>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-8 scroll-smooth bg-white dark:bg-gray-900">
                    <div className="h-full animate-in fade-in duration-700 slide-in-from-bottom-2">
                        {children}
                    </div>
                </div>
            </main>
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

function MenuItem({ href, icon, label, active, collapsed, delay }: any) {
    return (
        <Link href={href}>
            <div
                style={{ animationDelay: delay }}
                className={`
                    relative mx-2 px-4 py-3.5 rounded-2xl cursor-pointer transition-all duration-300 group flex items-center
                    ${active
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/40 translate-x-1 scale-[1.02]'
                        : 'text-white/80 hover:bg-white/10 hover:text-white hover:translate-x-1 hover:shadow-md hover:shadow-black/20'
                    }
                    ${collapsed ? 'justify-center px-0 py-3.5 mx-1 !rounded-xl' : ''}
                    animate-in slide-in-from-left-2 fade-in fill-mode-backwards
                `}
            >
                <i className={`fas ${icon} text-xl transition-transform duration-300 group-hover:scale-110 group-active:scale-95 ${collapsed ? '' : 'mr-4 w-6 text-center'} ${active ? 'text-white drop-shadow-md' : 'text-blue-100/70 group-hover:text-white group-hover:drop-shadow-sm'}`}></i>
                {!collapsed && (
                    <span className={`font-semibold tracking-wide flex-1 drop-shadow-sm ${active ? 'text-[15.5px]' : 'text-[15px]'}`}>{label}</span>
                )}
                {active && !collapsed && (
                    <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)] animate-pulse ml-2"></div>
                )}
            </div>
        </Link>
    );
}