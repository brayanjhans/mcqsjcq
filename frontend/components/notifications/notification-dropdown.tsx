'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications, Notification } from '@/hooks/use-notifications';
import { useNotificationWebSocket } from '@/hooks/use-notification-websocket';
import { abbreviateProcedureType } from '@/lib/utils/procedure-abbreviations';


interface NotificationDropdownProps {
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
}

export default function NotificationDropdown({ isOpen, onToggle, onClose }: NotificationDropdownProps) {
    // const [isOpen, setIsOpen] = useState(false); // Managed by parent
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Reduced polling to 3s for "fastest" feeling
    const {
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification
    } = useNotifications(3);

    useNotificationWebSocket();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                if (isOpen) onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const handleNotificationClick = async (notification: Notification) => {
        try {
            if (!notification.is_read) await markAsRead(notification.id);
            if (notification.link) {
                onClose();
                router.push(notification.link);
            }
        } catch (error) {
            console.error('Error handling notification click:', error);
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `Hace ${diffMins}m`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        return `Hace ${diffDays}d`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                className="relative p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700 rounded-full transition-all"
            >
                <i className={`fas fa-bell text-xl ${isOpen ? 'text-slate-800 dark:text-white' : ''}`}></i>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold shadow-sm ring-2 ring-white dark:ring-[#0b122b]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-[360px] bg-white dark:bg-slate-800 rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 dark:border-slate-700 z-50 overflow-hidden">

                    {/* Header Clean */}
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                        <h3 className="font-bold text-base text-gray-800 dark:text-white">Notificaciones</h3>
                        {unreadCount > 0 && (
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                {unreadCount} nueva{unreadCount !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {/* Content */}
                    <div className="max-h-[400px] overflow-y-auto overflow-x-hidden custom-scrollbar">
                        {loading && notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <p className="text-xs">Cargando...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="mx-auto w-12 h-12 bg-gray-50 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
                                    <i className="fas fa-check text-gray-400"></i>
                                </div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Estás al día</p>
                                <p className="text-xs text-gray-400 mt-1">No hay notificaciones nuevas</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 dark:divide-slate-700">
                                {notifications.map((n) => {
                                    // Robust Parsing for State Change
                                    const arrowMatch = n.message.match(/(\s->\s|\s→\s|\s=>\s)/);
                                    const isStateChange = !!arrowMatch;
                                    let oldState = "", newState = "";

                                    if (isStateChange && arrowMatch) {
                                        const cleanMsg = n.message.replace(/^(Estado cambiado:|Cambio de Estado:)/i, "").trim();
                                        const parts = cleanMsg.split(arrowMatch[0]);
                                        if (parts.length >= 2) {
                                            oldState = parts[0].trim();
                                            newState = parts[1].trim();
                                        }
                                    }

                                    // Parsing for Procedure Type Tag (e.g. [PRINCIPAL])
                                    const tagMatch = n.title.match(/^(\S+)\s(\[[^\]]+\])\s(.*)/);
                                    let icon = "", badge = "", cleanTitle = n.title;
                                    if (tagMatch) {
                                        icon = tagMatch[1];
                                        badge = tagMatch[2].replace('[', '').replace(']', '');
                                        cleanTitle = tagMatch[3];
                                    } else {
                                        // Fallback clean if no badge
                                        cleanTitle = n.title.replace(/^(Cambio de Estado:|Estado cambiado:)/i, "").trim();
                                    }

                                    // Badge Color Logic
                                    const getBadgeColor = (b: string) => {
                                        if (b === 'PRINCIPAL') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
                                        if (b === 'SIMPLIFICADA') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
                                        if (b === 'SUBASTA') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
                                        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
                                    };

                                    return (
                                        <div key={n.id} className="group relative p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-default">
                                            {/* Unread Dot */}
                                            {!n.is_read && (
                                                <div className="absolute left-3 top-5 w-2 h-2 rounded-full bg-blue-500 shadow-sm"></div>
                                            )}

                                            <div className={`pl-4 ${!n.is_read ? '' : 'opacity-70'}`}>
                                                {/* Header Row */}
                                                <div className="flex justify-between items-start mb-1.5 gap-2">
                                                    <div className="flex flex-col gap-1 w-full">
                                                        {badge && (
                                                            <span className={`self-start text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${getBadgeColor(badge)}`}>
                                                                {icon} {badge}
                                                            </span>
                                                        )}
                                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight" title={n.title}>
                                                            {cleanTitle || n.title}
                                                        </h4>
                                                    </div>

                                                    {!n.is_read && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                                                            className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 shrink-0 mt-1"
                                                        >
                                                            Marcar
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Body / State Visual */}
                                                <div className="mb-2">
                                                    {isStateChange && oldState && newState ? (
                                                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium mt-1 bg-gray-50 dark:bg-slate-800/50 p-1.5 rounded-md max-w-full">
                                                            <span className="text-gray-500 break-words">{oldState}</span>
                                                            <i className="fas fa-arrow-right text-[10px] text-gray-300 shrink-0"></i>
                                                            <span className={`${newState === 'NULO' || newState === 'DESIERTO' ? 'text-red-600' : 'text-emerald-600'} break-words`}>
                                                                {newState}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-1 space-y-1">
                                                            {(() => {
                                                                // Procedure Type Parsing
                                                                const rawMsg = n.message || "";
                                                                const parts = rawMsg.split("\n\n");
                                                                let procType = "", desc = rawMsg;

                                                                // Allow longer types (up to 120 chars) for complex legal names
                                                                if (parts.length >= 2 && parts[0].length < 120 && !parts[0].includes("...")) {
                                                                    procType = parts[0];
                                                                    desc = parts.slice(1).join("\n\n");
                                                                }

                                                                return (
                                                                    <>
                                                                        {procType && (
                                                                            <span className="inline-block text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-gray-100 dark:bg-slate-800 px-1.5 rounded border border-gray-200 dark:border-slate-700 mb-0.5" title={procType}>
                                                                                {abbreviateProcedureType(procType)}
                                                                            </span>
                                                                        )}
                                                                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3 whitespace-pre-wrap">
                                                                            {desc}
                                                                        </p>
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Footer Row */}
                                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-white/5">
                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                        {formatTimeAgo(n.created_at)}
                                                    </span>
                                                    {n.link && (
                                                        <button
                                                            onClick={() => { onClose(); router.push('/seace/notificaciones?tab=unread'); }}
                                                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                                        >
                                                            Ver detalles <i className="fas fa-chevron-right text-[9px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer Clean */}
                    <div className="p-3 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                        <button
                            onClick={() => { onClose(); router.push('/seace/notificaciones?tab=all'); }}
                            className="w-full text-center text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
                        >
                            Ver todas las notificaciones
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
