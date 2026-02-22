"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import {
    Bell,
    CheckCheck,
    Trash2,
    Check,
    MapPin,
    DollarSign,
    Box,
    Briefcase,
    ArrowRight
} from "lucide-react";
import { type Notificacion, type EstadoLicitacion } from "@/types/notificacion";
import { useNotifications } from "@/hooks/use-notifications"; // Import hook
import { abbreviateProcedureType } from "@/lib/utils/procedure-abbreviations";

import { useSearchParams } from "next/navigation";

function NotificacionesPageContent() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');

    const getInitialFilter = () => {
        if (tabParam === 'all') return 'TODOS';
        if (tabParam === 'unread') return 'NO_LEIDOS';
        if (tabParam === 'read') return 'LEIDOS';
        return 'NO_LEIDOS'; // Default
    };

    const [filter, setFilter] = useState<'TODOS' | 'NO_LEIDOS' | 'LEIDOS'>(getInitialFilter());

    // Update filter if URL changes
    React.useEffect(() => {
        setFilter(getInitialFilter());
        setSelectedIds([]); // Clear selections when changing tabs
    }, [tabParam, filter]);

    // Selection State
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Use the real hook
    const {
        notifications: realNotifications,
        markAsRead: apiMarkAsRead,
        markAllAsRead: apiMarkAllAsRead,
        deleteNotification: apiDeleteNotification
    } = useNotifications(5); // Refresh every 5s

    // Transform API notification to UI format if needed, or use directly
    // The UI uses: id, titulo, mensaje, fecha, estado ('NO_LEIDO'|'LEIDO'), metadata fields
    const items = realNotifications.filter((n: any) => {
        if (filter === 'TODOS') return true;
        if (filter === 'NO_LEIDOS') return !n.is_read;
        if (filter === 'LEIDOS') return n.is_read;
        return true;
    }).map((n: any) => ({
        ...n,
        // Map hook 'is_read' to local 'estado' string just for compatibility with existing UI logic below
        estado: n.is_read ? 'LEIDO' : 'NO_LEIDO',
        fecha: n.created_at, // Map created_at to fecha for UI
        // Extract metadata
        categoria: n.metadata?.categoria || 'GENERAL',
        ubicacion: n.metadata?.ubicacion || 'PERU',
        monto: n.metadata?.monto || 0,
        estadoAnterior: n.metadata?.estadoAnterior || null,
        estadoNuevo: n.metadata?.estadoNuevo || null,
        licitacionId: n.metadata?.licitacionId || '#',
        orcid: n.metadata?.orcid || ''
    }));

    const markAllAsRead = () => {
        apiMarkAllAsRead();
    };

    const markAsRead = (id: number) => {
        apiMarkAsRead(id);
    };

    const deleteNotification = (id: number) => {
        apiDeleteNotification(id);
        setSelectedIds(prev => prev.filter(selId => selId !== id)); // Remove from selection if deleted individually
    };

    const deleteSelected = async () => {
        if (selectedIds.length === 0) return;
        // Fast sequential deletion using existing hook
        for (const id of selectedIds) {
            apiDeleteNotification(id);
        }
        setSelectedIds([]);
    };

    const toggleSelection = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedIds.length === items.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(items.map((n: any) => n.id));
        }
    };

    const formatCurrency = (val?: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(val || 0);

    const formatDate = (dateStr: string | null | undefined) => {
        // Handle invalid/missing dates
        if (!dateStr) return 'Fecha no disponible';

        try {
            const date = new Date(dateStr);
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return 'Fecha inválida';
            }
            return new Intl.DateTimeFormat('es-PE', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(date);
        } catch (error) {
            return 'Fecha inválida';
        }
    };

    const getStatusBadge = (status?: EstadoLicitacion) => {
        if (!status) return null;
        let styles = "bg-slate-100 text-slate-500 border-slate-200";
        if (status === 'CONTRATADO') styles = "bg-emerald-50 text-emerald-600 border-emerald-200";
        if (status === 'NULO') styles = "bg-red-50 text-red-600 border-red-200";

        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles} uppercase`}>
                {status}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8 dark:bg-[#0b122b]">
            <div className="mx-auto max-w-7xl space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notificaciones</h1>
                        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Historial de cambios en procesos</p>
                    </div>
                    <div className="flex gap-2">
                        {selectedIds.length > 0 && (
                            <button
                                onClick={deleteSelected}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Eliminar seleccionados ({selectedIds.length})
                            </button>
                        )}
                        <button
                            onClick={markAllAsRead}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2"
                        >
                            <CheckCheck className="w-4 h-4" />
                            Marcar todos leídos
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFilter('TODOS')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filter === 'TODOS' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilter('NO_LEIDOS')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filter === 'NO_LEIDOS' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'}`}
                    >
                        No leídos
                    </button>
                    <button
                        onClick={() => setFilter('LEIDOS')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filter === 'LEIDOS' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'}`}
                    >
                        Leídos
                    </button>
                </div>

                {/* List Content */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden dark:bg-[#111c44] dark:border-white/5">

                    {/* Table Header */}
                    <div className="hidden md:grid grid-cols-[auto_1fr] md:grid-cols-12 gap-4 p-4 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider dark:border-white/5 items-center">
                        <div className="col-span-5 flex items-center gap-3">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                checked={items.length > 0 && selectedIds.length === items.length}
                                onChange={toggleAll}
                            />
                            <span>Proceso</span>
                        </div>
                        <div className="col-span-2">Detalles</div>
                        <div className="col-span-3 text-center">Cambio de Estado</div>
                        <div className="col-span-1 text-center">Fecha</div>
                        <div className="col-span-1 text-right">Acciones</div>
                    </div>

                    {/* Items */}
                    {items.length > 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {items.map((notif) => (
                                <div key={notif.id} className={`p-4 md:grid md:grid-cols-12 md:gap-4 items-center group transition-colors hover:bg-slate-50/50 ${notif.estado === 'NO_LEIDO' ? 'bg-blue-50/10 dark:bg-blue-900/10' : ''}`}>

                                    {/* Licitacion Info */}
                                    <div className="col-span-5 flex items-start gap-3 mb-4 md:mb-0">
                                        <div className="pt-1 shrink-0 flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                checked={selectedIds.includes(notif.id)}
                                                onChange={() => toggleSelection(notif.id)}
                                            />
                                            {notif.estado === 'NO_LEIDO' ? (
                                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 mt-1"></div>
                                            ) : (
                                                <div className="w-2.5 h-2.5 rounded-full border border-slate-300 mt-1"></div>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-snug flex items-start gap-2">
                                                {(() => {
                                                    // Parse Badge Logic Inline - SAFE VERSION
                                                    const rawTitle = notif.title || notif.titulo || "";
                                                    const tagMatch = rawTitle.match(/^(\S+)\s(\[[^\]]+\])\s(.*)/);
                                                    let icon = "", badge = "", cleanTitle = rawTitle;

                                                    if (tagMatch) {
                                                        icon = tagMatch[1];
                                                        badge = tagMatch[2].replace('[', '').replace(']', '');
                                                        cleanTitle = tagMatch[3];

                                                        const badgeColor = badge === 'PRINCIPAL' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                                            badge === 'SIMPLIFICADA' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                                                badge === 'SUBASTA' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                                                                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';

                                                        return (
                                                            <div className="flex flex-col gap-1">
                                                                <span className={`self-start text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${badgeColor} inline-flex items-center gap-1`}>
                                                                    {icon} {badge}
                                                                </span>
                                                                <span>{cleanTitle}</span>
                                                            </div>
                                                        );
                                                    }

                                                    // Standard Title
                                                    return <span>{notif.estadoNuevo ? `Cambio de Estado: ${notif.estadoNuevo}` : rawTitle}</span>;
                                                })()}
                                            </h3>

                                            {/* Procedure Type & Message Parsing */}
                                            {(() => {
                                                const rawMsg = notif.mensaje || notif.message || notif.title || "";
                                                // Check if message has the new format (Type \n\n Desc)
                                                // We look for a double newline pattern I added in backend
                                                const parts = rawMsg.split("\n\n");

                                                let procType = "";
                                                let desc = rawMsg;

                                                if (parts.length >= 2) {
                                                    // Heuristic: Allow longer types up to 120 chars for "Adjudicación Simplificada - Ley..." cases
                                                    if (parts[0].length < 120 && !parts[0].includes("...")) {
                                                        procType = parts[0];
                                                        desc = parts.slice(1).join("\n\n");
                                                    }
                                                }

                                                return (
                                                    <div className="mt-1 space-y-1">
                                                        {procType && (
                                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 w-fit px-1.5 rounded border border-slate-200 dark:border-slate-700" title={procType}>
                                                                {abbreviateProcedureType(procType)}
                                                            </div>
                                                        )}
                                                        <p className="text-xs text-slate-500 line-clamp-2 dark:text-slate-400 whitespace-pre-wrap">
                                                            {desc}
                                                        </p>
                                                    </div>
                                                );
                                            })()}

                                            {notif.orcid && (
                                                <div className="mt-1">
                                                    <Link href={`/seace/busqueda/${notif.licitacionId}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline">
                                                        Ver Orcid: {notif.orcid} <i className="fas fa-chevron-right text-[9px]"></i>
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Detalles Mini Grid */}
                                    <div className="col-span-2 space-y-2 mb-4 md:mb-0 pl-6 border-l md:border-l-0 border-slate-100 md:pl-0 dark:border-white/5">
                                        <div className="flex items-center gap-2">
                                            {notif.categoria === 'OBRAS' ? <Briefcase className="w-3.5 h-3.5 text-orange-500" /> : <Box className="w-3.5 h-3.5 text-orange-500" />}
                                            <span className="text-[10px] font-bold text-slate-600 uppercase dark:text-slate-300">{notif.categoria}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3.5 h-3.5 text-blue-500" />
                                            <span className="text-[10px] font-bold text-slate-600 uppercase dark:text-slate-300">{notif.ubicacion}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                                            <span className="text-[10px] font-bold text-emerald-600">{formatCurrency(notif.monto)}</span>
                                        </div>
                                    </div>

                                    {/* Cambio de Estado */}
                                    <div className="col-span-3 flex items-center justify-center gap-4 mb-4 md:mb-0 text-[10px] font-bold uppercase tracking-wide">
                                        <span className="text-slate-400">{notif.estadoAnterior || '-'}</span>
                                        <ArrowRight className="w-3 h-3 text-slate-300" />
                                        <span className={
                                            notif.estadoNuevo === 'CONTRATADO' || notif.estadoNuevo === 'ADJUDICADO' ? 'text-emerald-500' :
                                                notif.estadoNuevo === 'NULO' || notif.estadoNuevo === 'DESIERTO' ? 'text-red-500' :
                                                    'text-slate-600 dark:text-slate-300'
                                        }>
                                            {notif.estadoNuevo || '-'}
                                        </span>
                                    </div>

                                    {/* Fecha */}
                                    <div className="col-span-1 text-center mb-4 md:mb-0">
                                        <p className="text-[10px] font-semibold text-slate-500 whitespace-pre-line leading-tight">
                                            {formatDate(notif.fecha).replace(" ", "\n")}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-1 flex items-center justify-end gap-2">
                                        {notif.estado === 'NO_LEIDO' && (
                                            <button
                                                onClick={() => markAsRead(notif.id)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Marcar como leído"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteNotification(notif.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                </div>
                            ))}
                        </div>
                    ) : (
                        // Empty State Match
                        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 dark:bg-slate-800">
                                <Bell className="w-6 h-6 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1 dark:text-white">Sin Notificaciones</h3>
                            <p className="text-sm text-slate-500 max-w-sm mx-auto dark:text-slate-400">
                                Te avisaremos cuando haya cambios importantes en tus procesos seguidos o relevantes.
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

// Wrap in Suspense to handle useSearchParams
export default function NotificacionesPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-[#0b122b] flex items-center justify-center"><p className="text-slate-500">Cargando...</p></div>}>
            <NotificacionesPageContent />
        </Suspense>
    );
}
