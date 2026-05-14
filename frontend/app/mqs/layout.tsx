'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { HeaderActions } from '@/components/layout/header-actions';
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';
import { useAuthProtection } from '@/hooks/use-auth-protection';
import { ChevronLeft, ChevronRight, ArrowLeft, Menu } from 'lucide-react';

function getAvatarColor(name: string): string {
    const colors = [
        'from-violet-500 to-purple-600',
        'from-blue-500 to-indigo-600',
        'from-emerald-500 to-teal-600',
        'from-rose-500 to-pink-600',
        'from-amber-500 to-orange-600',
        'from-cyan-500 to-blue-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

export default function MQSLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading } = useAuthProtection();
    const router = useRouter();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        const userData = sessionStorage.getItem('user_display');
        if (userData) setUser(JSON.parse(userData));

        const isDark = localStorage.getItem('theme') === 'dark' ||
            (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        setDarkMode(isDark);
        if (isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [router]);

    useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

    if (loading || !isAuthenticated) return null;

    const isActive = (path: string) => pathname === path;
    const isAdmin = user?.role === 'admin';
    const getDelay = (index: number) => `${index * 50}ms`;

    const userName = user?.nombre || 'Usuario';
    const userInitial = userName.charAt(0).toUpperCase();
    const userCargo = user?.cargo || user?.perfil || 'Sistema MQS';
    const avatarGradient = getAvatarColor(userName);

    return (
        <div className="flex w-full h-screen overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-500">
            {/* Overlay móvil */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-[60] lg:hidden bg-black/40 backdrop-blur-sm transition-all duration-500"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* ═══════════════════════════════════════
                SIDEBAR PREMIUM MQS
            ═══════════════════════════════════════ */}
            <aside
                className={`
                    fixed lg:static inset-y-0 left-0 z-[70]
                    text-white flex flex-col
                    transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                    shadow-2xl lg:shadow-xl
                    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    ${collapsed ? 'w-[84px]' : 'w-[272px]'}
                    lg:my-4 lg:ml-4 lg:rounded-3xl
                    border border-white/5
                    relative
                `}
                style={{
                    background: 'linear-gradient(160deg, #0D1F38 0%, #0F2C4A 40%, #091520 100%)',
                }}
            >
                {/* Dot pattern — wrapper con overflow-hidden propio para no afectar el toggle */}
                <div
                    className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden"
                    style={{
                        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
                        backgroundSize: '22px 22px',
                    }}
                />
                {/* Left inner glow */}
                <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-blue-400/25 to-transparent pointer-events-none" />

                {/* ── Header / Logo ── */}
                <div className="h-[82px] flex items-center justify-between px-5 relative flex-shrink-0">
                    <div className={`transition-all duration-500 flex items-center gap-3 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 flex-1'}`}>
                        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/20 overflow-hidden flex-shrink-0">
                            <img src="/logo-mqs.png" alt="MQS" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white whitespace-nowrap drop-shadow-md">
                            MQS <span className="text-blue-300">JCQ</span>
                        </span>
                        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/20 overflow-hidden flex-shrink-0">
                            <img src="/logo-jcq.png" alt="JCQ" className="w-full h-full object-cover" />
                        </div>
                    </div>
                    {collapsed && (
                        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/20 overflow-hidden mx-auto">
                            <img src="/logo-mqs.png" alt="MQS" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex-shrink-0"
                    >
                        <i className="fas fa-times text-sm" />
                    </button>
                </div>

                {/* ── Collapse toggle (desktop) ── */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden lg:flex items-center justify-center w-6 h-10 rounded-full
                        bg-[#0F2C4A] border border-white/20 shadow-[0_0_15px_rgba(0,0,0,0.4)]
                        text-blue-200 hover:text-white hover:bg-blue-600
                        transition-all duration-300 hover:scale-110 active:scale-95
                        absolute -right-3 top-1/2 -translate-y-1/2 z-[80]
                        backdrop-blur-md"
                    title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
                >
                    {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                </button>

                {/* ── Menu ── */}
                <div className="flex-1 overflow-y-auto px-3 space-y-0.5 pb-4 scrollbar-hide relative">
                    <MenuGroup title="Principal" collapsed={collapsed}>
                        <MenuItem href="/mqs/obras"     icon="fa-folder-open"          label="Obras Secrex"  color="blue"    animClass="icon-hover-spin"  active={isActive('/mqs/obras')}     collapsed={collapsed} delay={getDelay(1)} />
                        <MenuItem href="/mqs/formatos"  icon="fa-file-pdf"             label="Formatos"      color="violet"  animClass="icon-hover-nudge" active={isActive('/mqs/formatos')}  collapsed={collapsed} delay={getDelay(2)} />
                    </MenuGroup>

                    <MenuGroup title="Operaciones" collapsed={collapsed} className="mt-2">
                        <MenuItem href="/mqs/renovaciones" icon="fa-clock"             label="Renovaciones"  color="amber"   animClass="icon-hover-spin"  active={isActive('/mqs/renovaciones')}  collapsed={collapsed} delay={getDelay(3)} />
                        <MenuItem href="/mqs/fianzas"      icon="fa-money-check-dollar" label="Fianzas Perú" color="emerald" animClass="icon-hover-grow" active={isActive('/mqs/fianzas')}      collapsed={collapsed} delay={getDelay(4)} />
                        <MenuItem href="/mqs/entregas"     icon="fa-truck-fast"        label="Entregas"      color="cyan"    animClass="icon-hover-zoom"  active={isActive('/mqs/entregas')}     collapsed={collapsed} delay={getDelay(5)} />
                        <MenuItem href="/mqs/correos"      icon="fa-envelope"          label="Correos"       color="rose"    animClass="icon-hover-swing" active={isActive('/mqs/correos')}      collapsed={collapsed} delay={getDelay(6)} />
                    </MenuGroup>

                    {isAdmin && (
                        <MenuGroup title="Finanzas" collapsed={collapsed} className="mt-2">
                            <MenuItem href="/mqs/admin/cheques"      icon="fa-money-bill-wave"      label="Cheques"       color="emerald" animClass="icon-hover-grow"  active={isActive('/mqs/admin/cheques')}      collapsed={collapsed} delay={getDelay(7)} />
                            <MenuItem href="/mqs/admin/primas"       icon="fa-hand-holding-dollar"  label="Primas"        color="amber"   animClass="icon-hover-zoom"  active={isActive('/mqs/admin/primas')}       collapsed={collapsed} delay={getDelay(8)} />
                            <MenuItem href="/mqs/admin/facturas"     icon="fa-file-invoice-dollar"  label="Facturas"      color="violet"  animClass="icon-hover-nudge" active={isActive('/mqs/admin/facturas')}     collapsed={collapsed} delay={getDelay(9)} />
                            <MenuItem href="/mqs/admin/flujo-caja"   icon="fa-chart-line"           label="Flujo de Caja" color="blue"    animClass="icon-hover-spin"  active={isActive('/mqs/admin/flujo-caja')}   collapsed={collapsed} delay={getDelay(10)} />
                            <MenuItem href="/mqs/admin/informes"     icon="fa-chart-pie"            label="Informes"      color="rose"    animClass="icon-hover-spin"  active={isActive('/mqs/admin/informes')}     collapsed={collapsed} delay={getDelay(11)} />
                            <MenuItem href="/mqs/admin/correo-admin" icon="fa-envelope-open-text"   label="Correo Admin"  color="cyan"    animClass="icon-hover-swing" active={isActive('/mqs/admin/correo-admin')} collapsed={collapsed} delay={getDelay(12)} />
                        </MenuGroup>
                    )}
                </div>

                {/* ── Footer: Avatar + Volver ── */}
                <div className={`flex-shrink-0 p-3 space-y-2 border-t border-white/5 ${collapsed ? 'px-2' : ''}`}>
                    {!collapsed ? (
                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/5 border border-white/[0.08] hover:bg-white/8 transition-all duration-300">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center font-black text-white text-sm shadow-lg flex-shrink-0 relative`}>
                                {userInitial}
                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0F2C4A] rounded-full">
                                    <span className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75" />
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13.5px] font-black text-white truncate leading-tight">{userName}</p>
                                <p className="text-[11px] font-bold text-blue-200 truncate leading-tight">{userCargo}</p>
                            </div>
                        </div>
                    ) : (
                        <div className={`w-10 h-10 mx-auto rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center font-black text-white text-sm shadow-lg relative`}>
                            {userInitial}
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0F2C4A] rounded-full" />
                        </div>
                    )}

                    <button
                        onClick={() => router.push('/modules')}
                        className={`
                            relative overflow-hidden group w-full rounded-2xl transition-all duration-300
                            border border-blue-500/25 hover:border-blue-400/50
                            ${collapsed
                                ? 'h-11 flex items-center justify-center bg-blue-500/10 hover:bg-blue-500/20'
                                : 'px-4 py-3 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600 hover:to-indigo-600 flex items-center gap-3 text-blue-100 hover:text-white'
                            }
                        `}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ${collapsed ? 'rounded-2xl' : ''}`} />
                        <ArrowLeft className="w-4 h-4 relative z-10 transition-transform group-hover:-translate-x-1 duration-300" />
                        {!collapsed && <span className="font-bold text-sm relative z-10 tracking-wide">Volver</span>}
                        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_20px_rgba(99,102,241,0.4)]" />
                    </button>
                </div>
            </aside>

            {/* ═══════════════════════════════════════
                MAIN CONTENT
            ═══════════════════════════════════════ */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
                <div className="relative z-10 flex items-center">
                    {!mobileMenuOpen && (
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="lg:hidden flex-shrink-0 ml-3 mt-3 mb-1 w-10 h-10 flex items-center justify-center rounded-full bg-[#0F2C4A] text-white shadow-md hover:scale-110 active:scale-95 transition-all border border-white/20"
                            aria-label="Abrir menú"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    )}
                    <div className="flex-1">
                        <HeaderActions />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6 scroll-smooth bg-white dark:bg-gray-900">
                    <div className="h-full animate-in fade-in duration-700 slide-in-from-bottom-2">
                        {children}
                    </div>
                </div>
            </main>
            <ChatbotWidget />
        </div>
    );
}

// ─────────────────────────────────────────────
// COLOR MAP
// ─────────────────────────────────────────────
const COLOR_MAP: Record<string, any> = {
    blue:    { activeBg: 'bg-blue-500/20',    activeBorder: 'border-l-[3px] border-blue-400',    activeText: 'text-blue-100',    activeShadow: 'shadow-[0_4px_20px_rgba(59,130,246,0.25)]',    hoverBg: 'hover:bg-blue-500/10',    iconColor: 'text-blue-400',    dot: 'bg-blue-400'    },
    violet:  { activeBg: 'bg-violet-500/20',  activeBorder: 'border-l-[3px] border-violet-400',  activeText: 'text-violet-100',  activeShadow: 'shadow-[0_4px_20px_rgba(139,92,246,0.25)]',  hoverBg: 'hover:bg-violet-500/10',  iconColor: 'text-violet-400',  dot: 'bg-violet-400'  },
    amber:   { activeBg: 'bg-amber-500/15',   activeBorder: 'border-l-[3px] border-amber-400',   activeText: 'text-amber-100',   activeShadow: 'shadow-[0_4px_20px_rgba(245,158,11,0.2)]',   hoverBg: 'hover:bg-amber-500/10',   iconColor: 'text-amber-400',   dot: 'bg-amber-400'   },
    emerald: { activeBg: 'bg-emerald-500/15', activeBorder: 'border-l-[3px] border-emerald-400', activeText: 'text-emerald-100', activeShadow: 'shadow-[0_4px_20px_rgba(16,185,129,0.2)]',  hoverBg: 'hover:bg-emerald-500/10', iconColor: 'text-emerald-400', dot: 'bg-emerald-400' },
    rose:    { activeBg: 'bg-rose-500/15',    activeBorder: 'border-l-[3px] border-rose-400',    activeText: 'text-rose-100',    activeShadow: 'shadow-[0_4px_20px_rgba(244,63,94,0.2)]',    hoverBg: 'hover:bg-rose-500/10',    iconColor: 'text-rose-400',    dot: 'bg-rose-400'    },
    cyan:    { activeBg: 'bg-cyan-500/15',    activeBorder: 'border-l-[3px] border-cyan-400',    activeText: 'text-cyan-100',    activeShadow: 'shadow-[0_4px_20px_rgba(6,182,212,0.2)]',    hoverBg: 'hover:bg-cyan-500/10',    iconColor: 'text-cyan-400',    dot: 'bg-cyan-400'    },
};

// ─────────────────────────────────────────────
const ICON_ACTIVE_COLOR: Record<string, string> = {
    blue:    '#93c5fd',
    violet:  '#c4b5fd',
    amber:   '#fcd34d',
    emerald: '#6ee7b7',
    rose:    '#fda4af',
    cyan:    '#67e8f9',
};

function MenuGroup({ title, children, collapsed, className = '' }: any) {
    if (collapsed) return <div className={`space-y-1 mb-2 ${className}`}>{children}</div>;
    return (
        <div className={`space-y-0.5 mb-3 ${className}`}>
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />
                <h4 className="text-[10.5px] font-black text-blue-100 uppercase tracking-[0.2em] whitespace-nowrap">{title}</h4>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />
            </div>
            {children}
        </div>
    );
}

function MenuItem({ href, icon, label, active, collapsed, delay, color = 'blue', animClass = '' }: any) {
    const c = COLOR_MAP[color] || COLOR_MAP.blue;
    const iconColor = active
        ? (ICON_ACTIVE_COLOR[color] || '#93c5fd')
        : (ICON_ACTIVE_COLOR[color] || '#93c5fd'); // Siempre mantener el color vivo

    return (
        <Link href={href} className="block relative group/item">
            {collapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5
                    bg-[#0D1F38] border border-white/10 text-white text-xs font-bold rounded-xl
                    opacity-0 group-hover/item:opacity-100 pointer-events-none
                    transition-all duration-200 whitespace-nowrap z-[90] shadow-xl">
                    {label}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#0D1F38]" />
                </div>
            )}
            <div
                style={{ animationDelay: delay }}
                className={`
                    relative mx-1.5 rounded-xl cursor-pointer
                    transition-all duration-300 flex items-center
                    animate-in slide-in-from-left-2 fade-in fill-mode-backwards
                    ${collapsed ? 'justify-center py-3 px-0' : 'px-3.5 py-2.5 gap-3'}
                    ${active
                        ? `${c.activeBg} ${c.activeBorder} ${c.activeShadow} ${c.activeText}`
                        : `${c.hoverBg} hover:text-white/90 border-l-[3px] border-transparent`
                    }
                `}
            >
                <i
                    className={`fas ${icon} ${animClass} flex-shrink-0 transition-transform duration-300 ${collapsed ? '' : 'mr-0.5'}`}
                    style={{
                        color: iconColor,
                        fontSize: collapsed ? '18px' : '14px',
                        display: 'inline-block',
                        width: collapsed ? '20px' : '18px',
                        textAlign: 'center',
                    }}
                />
                {!collapsed && (
                    <span className={`font-bold text-[14px] flex-1 tracking-wide ${active ? 'text-white drop-shadow-md' : 'text-white/95'}`}>
                        {label}
                    </span>
                )}
                {active && !collapsed && (
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ICON_ACTIVE_COLOR[color] || '#93c5fd', boxShadow: `0 0 6px 2px ${ICON_ACTIVE_COLOR[color]}` }}
                    />
                )}
            </div>
        </Link>
    );
}