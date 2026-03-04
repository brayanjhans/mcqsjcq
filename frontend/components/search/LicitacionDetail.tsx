"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Building2,
    FileText,
    ChevronLeft,
    DollarSign,
    Landmark,
    Calendar,
    MapPin,
    Tag,
    ShieldCheck,
    Users,
    Activity,
    ExternalLink,
    Loader2,
    Download,
    Pencil,
    Save,
    X,
    Link,
    Upload,
    Trash2
} from "lucide-react";
import { createPortal } from "react-dom";
import type { Licitacion, Adjudicacion, EjecucionFinanciera, GarantiasResponse, HistorialAnual } from "@/types/licitacion";
import { licitacionService } from "@/lib/services/licitacionService";
import { integracionService } from "@/lib/services/integracionService";
import { generateLicitacionPDF } from "@/lib/utils/generateLicitacionPDF";

const PdfIcon = ({ className }: { className?: string }) => (
    <img
        src="/pdf-icon.png"
        alt="PDF"
        className={className}
    />
);

interface Props {
    id: string;
    basePath?: string;
}

// ─── Historial Table (replaces chart) ──────────────────────────────────────
function HistorialChart({ historial }: { historial: HistorialAnual[] }) {
    const [expanded, setExpanded] = React.useState(false);
    const [expandedYears, setExpandedYears] = React.useState<number[]>([]);

    const toggleYear = (year: number) => {
        setExpandedYears(prev =>
            prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
        );
    };

    // Sort descending (most recent first), show 3 or all
    const sorted = [...historial].reverse();
    const visible = expanded ? sorted : sorted.slice(0, 3);

    const fmt = (n: number | undefined | null) => {
        const val = typeof n === 'number' && isFinite(n) ? n : 0;
        if (val === 0) return <span className="text-slate-400">S/ 0.00</span>;
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(val);
    };

    return (
        <div className="w-full">
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                <table className="w-full min-w-[700px] text-left">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                            <th className="py-2.5 px-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider">Año</th>
                            <th className="py-2.5 px-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider text-right">PIA</th>
                            <th className="py-2.5 px-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider text-right">PIM</th>
                            <th className="py-2.5 px-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider text-right">Certificación</th>
                            <th className="py-2.5 px-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider text-right">Comp. Anual</th>
                            <th className="py-2.5 px-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider text-right">Devengado</th>
                            <th className="py-2.5 px-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider text-right">Girado</th>
                            <th className="py-2.5 px-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider text-right">Avance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#111c44]">
                        {visible.map(h => {
                            const isYearExpanded = expandedYears.includes(h.year);
                            const hasMonths = h.meses && h.meses.length > 0;
                            return (
                                <React.Fragment key={h.year}>
                                    <tr
                                        onClick={() => hasMonths && toggleYear(h.year)}
                                        className={`${hasMonths ? 'cursor-pointer' : ''} hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors`}
                                    >
                                        <td className="py-3 px-4 text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                                            {hasMonths ? (
                                                <span className="text-slate-400 font-normal text-[9px]">{isYearExpanded ? '▼' : '▶'}</span>
                                            ) : (
                                                <span className="w-2.5"></span>
                                            )}
                                            {h.year}
                                        </td>
                                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 text-right font-mono">{fmt(h.pia)}</td>
                                        <td className="py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-200 text-right font-mono">{fmt(h.pim)}</td>
                                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 text-right font-mono">{fmt(h.certificado)}</td>
                                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 text-right font-mono">{fmt(h.compromiso_anual)}</td>
                                        <td className="py-3 px-4 text-xs font-bold text-blue-600 dark:text-blue-400 text-right font-mono">{fmt(h.devengado)}</td>
                                        <td className="py-3 px-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 text-right font-mono">{h.girado > 0 ? fmt(h.girado) : <span className="text-slate-400">—</span>}</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={`text-xs font-black ${h.avance_pct >= 80 ? 'text-emerald-600' :
                                                h.avance_pct >= 40 ? 'text-amber-600' :
                                                    h.avance_pct > 0 ? 'text-blue-600' : 'text-slate-400'
                                                }`}>
                                                {h.avance_pct > 0 ? `${h.avance_pct}%` : '—'}
                                            </span>
                                        </td>
                                    </tr>
                                    {isYearExpanded && hasMonths && (
                                        <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                                            <td colSpan={8} className="p-0">
                                                <div className="p-4 border-l-2 border-indigo-500 ml-4 mb-2 mt-2 mr-4 rounded-xl bg-white dark:bg-[#0b1437] shadow-sm">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-[10px] font-bold uppercase text-indigo-500 tracking-wider">Desglose Mensual {h.year}</h4>
                                                        <span className="text-[9px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20 rounded-full px-2 py-0.5">
                                                            ⚠ Solo meses con devengado ejecutado
                                                        </span>
                                                    </div>
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="border-b border-slate-200 dark:border-white/10">
                                                                <th className="py-2 px-3 text-[9px] font-bold uppercase text-slate-500 tracking-wider">Mes</th>
                                                                <th className="py-2 px-3 text-[9px] font-bold uppercase text-slate-500 tracking-wider text-right">PIA</th>
                                                                <th className="py-2 px-3 text-[9px] font-bold uppercase text-slate-500 tracking-wider text-right">PIM</th>
                                                                <th className="py-2 px-3 text-[9px] font-bold uppercase text-slate-500 tracking-wider text-right">Certificación</th>
                                                                <th className="py-2 px-3 text-[9px] font-bold uppercase text-slate-500 tracking-wider text-right">Comp. Anual</th>
                                                                <th className="py-2 px-3 text-[9px] font-bold uppercase text-slate-500 tracking-wider text-right">Devengado</th>
                                                                <th className="py-2 px-3 text-[9px] font-bold uppercase text-slate-500 tracking-wider text-right">Girado</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                            {h.meses!.map(m => (
                                                                <tr key={m.mes} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                                    <td className="py-2 px-3 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                                                                        {new Date(2000, m.mes - 1, 1).toLocaleString('es-PE', { month: 'long' }).toUpperCase()}
                                                                    </td>
                                                                    <td className="py-2 px-3 text-[10px] font-mono text-slate-500 text-right">{fmt(m.pia)}</td>
                                                                    <td className="py-2 px-3 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200 text-right">{fmt(m.pim)}</td>
                                                                    <td className="py-2 px-3 text-[10px] font-mono text-slate-500 text-right">{fmt(m.certificado)}</td>
                                                                    <td className="py-2 px-3 text-[10px] font-mono text-slate-500 text-right">{fmt(m.compromiso_anual)}</td>
                                                                    <td className="py-2 px-3 text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 text-right">{fmt(m.devengado)}</td>
                                                                    <td className="py-2 px-3 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right">{(m.girado ?? 0) > 0 ? fmt(m.girado) : <span className="text-slate-400">—</span>}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Expand / Collapse button */}
            {historial.length > 3 && (
                <button
                    onClick={() => setExpanded(e => !e)}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg border border-slate-200 dark:border-white/10 transition-colors"
                >
                    {expanded
                        ? <>↑ Mostrar solo los últimos 3 años</>
                        : <>↓ Ver historial completo ({historial.length} años)</>}
                </button>
            )}
        </div>
    );
}
// ───────────────────────────────────────────────────────────────────────────

export default function LicitacionDetail({ id, basePath = "/seace/busqueda" }: Props) {
    const router = useRouter();
    // States
    const [licitacion, setLicitacion] = useState<Licitacion | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Integration states
    const [ejecucion, setEjecucion] = useState<EjecucionFinanciera | null>(null);
    const [garantiasData, setGarantiasData] = useState<GarantiasResponse | null>(null);
    const [loadingIntegracion, setLoadingIntegracion] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Oferta Edit states
    const [editingOfertaId, setEditingOfertaId] = useState<string | null>(null);
    const [savingOferta, setSavingOferta] = useState(false);
    const [ofertaFileInput, setOfertaFileInput] = useState<File | null>(null);

    // Oferta Delete states
    const [deletingOfertaId, setDeletingOfertaId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleOfertaSave = async (id_adjudicacion: string) => {
        if (!ofertaFileInput) return;
        setSavingOferta(true);
        try {
            const uploadRes = await licitacionService.uploadOfertaFile(id_adjudicacion, ofertaFileInput);
            const finalUrl = uploadRes.url_pdf_oferta;

            setLicitacion(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    adjudicaciones: prev.adjudicaciones?.map(a =>
                        a.id_adjudicacion === id_adjudicacion ? { ...a, url_pdf_oferta: finalUrl } : a
                    )
                };
            });
            setEditingOfertaId(null);
            setOfertaFileInput(null);
        } catch (err) {
            console.error("Error saving oferta:", err);
            alert("Ocurrió un error al guardar la oferta. Por favor, intenta de nuevo.");
        } finally {
            setSavingOferta(false);
        }
    };

    const handleOfertaDelete = async (id_adjudicacion: string) => {
        setIsDeleting(true);
        try {
            await licitacionService.updateOferta(id_adjudicacion, "");
            setLicitacion(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    adjudicaciones: prev.adjudicaciones?.map(a =>
                        a.id_adjudicacion === id_adjudicacion ? { ...a, url_pdf_oferta: "" } : a
                    )
                };
            });
            setDeletingOfertaId(null);
        } catch (err) {
            console.error("Error al eliminar oferta:", err);
            alert("Hubo un error al eliminar el documento.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleExportPDF = async () => {
        if (!licitacion || exporting) return;
        setExporting(true);
        try {
            generateLicitacionPDF(licitacion, ejecucion, garantiasData);
        } catch (err) {
            console.error('Error exporting PDF:', err);
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await licitacionService.getById(id);
                if (data && !data.error) {
                    setLicitacion(data);
                } else {
                    setError("No se encontró la licitación.");
                }
            } catch (err: any) {
                console.error("Error fetching detail:", err);
                setError(`API Error: ${err.message || JSON.stringify(err)}`);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    // Fetch integration data after licitacion loads
    useEffect(() => {
        if (!licitacion || !licitacion.id_convocatoria) return;

        const fetchIntegraciones = async () => {
            setLoadingIntegracion(true);
            try {
                const [ejec, garant] = await Promise.allSettled([
                    integracionService.getEjecucion(licitacion.id_convocatoria),
                    integracionService.getGarantias(licitacion.id_convocatoria),
                ]);

                if (ejec.status === "fulfilled") setEjecucion(ejec.value);
                if (garant.status === "fulfilled") setGarantiasData(garant.value);
            } catch (err) {
                console.error("Error fetching integration data:", err);
            } finally {
                setLoadingIntegracion(false);
            }
        };

        fetchIntegraciones();
    }, [licitacion]);

    const formatCurrency = (amount?: number, currency: string = "PEN") => {
        return new Intl.NumberFormat("es-PE", { style: "currency", currency: currency }).format(amount || 0);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "N/A";
        if (dateString.includes('T')) {
            const dateOnly = dateString.split('T')[0];
            const [year, month, day] = dateOnly.split('-');
            return `${day}/${month}/${year}`;
        }
        const [year, month, day] = dateString.split('-');
        if (year && month && day) {
            return `${day}/${month}/${year}`;
        }
        return new Date(dateString).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
    };

    // Semaphore badge renderer
    const renderSemaforoBadge = (estado: string, diasRestantes?: number | null) => {
        const config: Record<string, { bg: string; text: string; label: string }> = {
            verde: { bg: "bg-emerald-100 border-emerald-200", text: "text-emerald-700", label: "VIGENTE" },
            ambar: { bg: "bg-amber-100 border-amber-200", text: "text-amber-700", label: `PRÓXIMA (${diasRestantes ?? '?'}d)` },
            rojo: { bg: "bg-red-100 border-red-200", text: "text-red-700", label: "VENCIDA" },
            gris: { bg: "bg-slate-100 border-slate-200", text: "text-slate-500", label: "SIN DATOS" },
        };
        const c = config[estado] || config.gris;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${c.bg} ${c.text}`}>
                <span className={`w-2 h-2 rounded-full ${estado === 'verde' ? 'bg-emerald-500' : estado === 'ambar' ? 'bg-amber-500' : estado === 'rojo' ? 'bg-red-500' : 'bg-slate-400'}`}></span>
                {c.label}
            </span>
        );
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b122b] flex items-center justify-center p-10">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium text-sm">Cargando detalles...</p>
            </div>
        </div>
    );

    if (error || !licitacion) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#0b122b]">
                <div className="text-center">
                    <button
                        onClick={() => router.push(basePath)}
                        className="text-indigo-600 font-bold hover:underline"
                    >
                        &larr; Volver a resultados
                    </button>
                </div>
            </div>
        );
    }

    const adjudicaciones = licitacion.adjudicaciones || [];

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-[#0b122b] transition-colors duration-300">
            <div className="mx-auto max-w-5xl space-y-6">

                {/* Top bar: Back Link + Export PDF */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors font-medium cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Volver a resultados
                    </button>
                    <button
                        onClick={handleExportPDF}
                        disabled={exporting}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {exporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        {exporting ? 'Generando PDF...' : 'Exportar PDF'}
                    </button>
                </div>


                {/* Main Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-md dark:border-white/10 dark:bg-[#111c44] animate-in fade-in slide-in-from-bottom-4 duration-500 border-t-4 border-t-blue-500">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center dark:bg-indigo-500/20 dark:text-indigo-300">
                                    <FileText className="w-5 h-5" />
                                </span>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                                        PROCESO {licitacion.id_convocatoria}
                                    </h1>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5 font-mono">
                                        {licitacion.ocid || "OCID no disponible"}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2 mb-4">
                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase border ${licitacion.estado_proceso === "CONVOCA" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                                    licitacion.estado_proceso?.includes("CONTRATADO") || licitacion.estado_proceso?.includes("ADJUDICADO") ? "bg-slate-100 text-slate-700 border-slate-200" :
                                        "bg-slate-50 text-slate-600 border-slate-200"
                                    }`}>
                                    {licitacion.estado_proceso || "PENDIENTE"}
                                </span>
                                <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-bold uppercase border border-purple-100">
                                    {licitacion.categoria || "BIENES"}
                                </span>
                            </div>

                            <p className="text-sm font-medium text-slate-600 leading-relaxed dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                                {licitacion.descripcion}
                            </p>
                        </div>

                        <div className="w-full md:w-auto p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Monto Estimado</p>
                            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                                {formatCurrency(licitacion.monto_estimado, licitacion.moneda)}
                            </p>
                            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between items-center gap-4 text-xs">
                                    <span className="text-slate-500 font-medium">Publicado:</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatDate(licitacion.fecha_publicacion)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-t border-slate-100 dark:border-white/5">

                        {/* Column 1: Entidad */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-900 font-bold dark:text-white mb-2">
                                <Building2 className="w-4 h-4 text-slate-400" />
                                <h3 className="text-sm uppercase tracking-wide">Entidad Convocante</h3>
                            </div>
                            <div className="pl-6">
                                <p className="text-sm font-bold text-slate-800 uppercase dark:text-slate-200 leading-snug">
                                    {licitacion.comprador}
                                </p>
                                <div className="flex items-start gap-1.5 mt-2 text-xs text-slate-500 font-medium">
                                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <span className="uppercase">{licitacion.ubicacion_completa || `${licitacion.departamento || ''} - ${licitacion.provincia || ''}`}</span>
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Detalles */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-900 font-bold dark:text-white mb-2">
                                <FileText className="w-4 h-4 text-slate-400" />
                                <h3 className="text-sm uppercase tracking-wide">Detalles Técnicos</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-3 pl-6">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Nomenclatura</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{licitacion.nomenclatura}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Tipo Proceso</p>
                                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{licitacion.tipo_procedimiento || "N/A"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Moneda</p>
                                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{licitacion.moneda || "PEN"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Column 3: Financiero */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-900 font-bold dark:text-white mb-2">
                                <DollarSign className="w-4 h-4 text-slate-400" />
                                <h3 className="text-sm uppercase tracking-wide">Resumen de Adjudicación</h3>
                            </div>
                            <div className="space-y-3 pl-6">
                                <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                    <span className="text-xs font-medium text-slate-500">Monto Adjudicado</span>
                                    <span className="text-sm font-bold text-emerald-600">{formatCurrency(licitacion.monto_total_adjudicado, licitacion.moneda)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-slate-50 dark:bg-white/5 p-2 rounded border border-slate-100 dark:border-white/5">
                                        <span className="text-[10px] block text-slate-400 uppercase font-bold">Items</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-white">{licitacion.total_adjudicaciones || 0}</span>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-white/5 p-2 rounded border border-slate-100 dark:border-white/5">
                                        <span className="text-[10px] block text-slate-400 uppercase font-bold">Sin Garantía</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-white">{licitacion.con_garantia_bancaria === 0 ? "Sí" : "No"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* ========== EJECUCIÓN FINANCIERA CARD (NEW) ========== */}
                {adjudicaciones.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-md dark:border-white/10 dark:bg-[#111c44] animate-in fade-in slide-in-from-bottom-5 duration-500 delay-75 border-t-4 border-t-cyan-500">
                        <div className="flex items-center gap-3 mb-6">
                            <Activity className="w-5 h-5 text-blue-500" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase">ESTADO DE EJECUCIÓN FINANCIERA</h3>
                            {loadingIntegracion && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                            {/* 5.1: Confidence badge */}
                            {!loadingIntegracion && ejecucion && (
                                <span className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${ejecucion.encontrado && (ejecucion.match_type === 'cui_ssi' || ejecucion.match_type === 'cui_exact' || ejecucion.match_type === 'snip_exact' || ejecucion.source === 'ssi_api')
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : ejecucion.encontrado
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-red-50 text-red-600 border-red-200'
                                    }`}>
                                    <span className={`w-2 h-2 rounded-full ${ejecucion.encontrado && (ejecucion.match_type === 'cui_ssi' || ejecucion.match_type === 'cui_exact' || ejecucion.match_type === 'snip_exact' || ejecucion.source === 'ssi_api')
                                        ? 'bg-emerald-500'
                                        : ejecucion.encontrado
                                            ? 'bg-amber-500'
                                            : 'bg-red-500'
                                        }`} />
                                    {ejecucion.encontrado && (ejecucion.match_type === 'cui_ssi' || ejecucion.match_type === 'cui_exact' || ejecucion.match_type === 'snip_exact' || ejecucion.source === 'ssi_api')
                                        ? `Datos exactos · CUI ${ejecucion.cui} · ${ejecucion.year_found ?? ejecucion.year ?? '—'}`
                                        : ejecucion.encontrado
                                            ? `Aprox. ${ejecucion.match_score != null ? Math.round(ejecucion.match_score * 100) + '%' : ''} · ${ejecucion.year_found ?? ejecucion.year ?? '—'}`
                                            : 'Sin datos MEF'}
                                </span>
                            )}
                        </div>

                        {loadingIntegracion ? (
                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                                <div>
                                    <span className="text-sm text-slate-500 font-medium block">Consultando API del MEF...</span>
                                    <span className="text-[10px] text-slate-400">La API del MEF puede tardar hasta 3 minutos en responder</span>
                                </div>
                            </div>
                        ) : ejecucion ? (
                            <div className="space-y-4">
                                {/* Financial progress bar */}
                                {/* Enhanced Financial Table */}
                                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 mb-6">
                                    <table className="w-full min-w-[700px] text-left">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                                <th className="py-3 px-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider">PIA</th>
                                                <th className="py-3 px-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider">PIM</th>
                                                <th className="py-3 px-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider">Certificación</th>
                                                <th className="py-3 px-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider">Comp. Anual</th>
                                                <th className="py-3 px-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider">Devengado</th>
                                                <th className="py-3 px-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider">Girado</th>
                                                <th className="py-3 px-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider text-right">Avance %</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-[#111c44]">
                                            <tr>
                                                <td className="py-4 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                    {formatCurrency(ejecucion.pia)}
                                                </td>
                                                <td className="py-4 px-4 text-xs font-bold text-slate-900 dark:text-white">
                                                    {formatCurrency(ejecucion.pim)}
                                                </td>
                                                <td className="py-4 px-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                                                    {formatCurrency(ejecucion.certificado)}
                                                </td>
                                                <td className="py-4 px-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                                                    {formatCurrency(ejecucion.compromiso_anual)}
                                                </td>
                                                <td className="py-4 px-4 text-sm font-bold text-blue-600">
                                                    {formatCurrency(ejecucion.devengado)}
                                                </td>
                                                <td className="py-4 px-4 text-sm font-bold text-emerald-600">
                                                    {formatCurrency(ejecucion.girado)}
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    {(() => {
                                                        const avance = ejecucion.pim > 0 ? (ejecucion.devengado / ejecucion.pim) * 100 : 0;
                                                        return (
                                                            <span className={`text-sm font-black ${avance >= 80 ? 'text-emerald-600' : avance >= 40 ? 'text-amber-600' : 'text-slate-600'}`}>
                                                                {avance.toFixed(1)}%
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Progress Bar */}
                                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mt-2">
                                    <span>Avance de Ejecución (Sobre PIM)</span>
                                </div>

                                {!ejecucion.encontrado && (
                                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                        <span className="text-amber-600 text-xs font-bold">⚠ Ejecución financiera pendiente</span>
                                        <span className="text-amber-500 text-[10px]">— Este contrato aún no registra pagos en el MEF</span>
                                    </div>
                                )}

                                {/* Historial anual de ejecución (B) */}
                                {ejecucion.historial && ejecucion.historial.length > 0 && (
                                    <div className="mt-2 pt-4 border-t border-slate-100 dark:border-white/5">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-3 tracking-wider">Historial de Ejecución por Año · CUI {ejecucion.cui}</p>
                                        <div className="overflow-x-auto">
                                            <HistorialChart historial={ejecucion.historial} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                <span className="text-amber-600 text-xs font-bold">⚠ Ejecución financiera pendiente</span>
                                <span className="text-amber-500 text-[10px]">— No se pudo consultar la API del MEF</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ========== ADJUDICACIONES TABLE (MODIFIED) ========== */}
                {adjudicaciones.length > 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-md dark:border-white/10 dark:bg-[#111c44] animate-in fade-in slide-in-from-bottom-5 duration-500 delay-100 border-t-4 border-t-emerald-500">
                        <div className="flex items-center gap-3 mb-6">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase">DETALLE DE ADJUDICACIONES Y GARANTÍAS</h3>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Ganador / Proveedor</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Monto Adjudicado</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Monto Girado (S/)</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">% Avance</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Garantía</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Emitido Por</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Fecha</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {adjudicaciones.map((adj) => (
                                            <tr key={adj.id_adjudicacion} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="py-4 px-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xs font-bold text-slate-800 dark:text-white uppercase">{adj.ganador_nombre}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">RUC: {adj.ganador_ruc}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                        {formatCurrency(adj.monto_adjudicado, licitacion.moneda)}
                                                    </span>
                                                </td>
                                                {/* NEW: Monto Girado */}
                                                <td className="py-4 px-4 text-center">
                                                    {loadingIntegracion ? (
                                                        <Loader2 className="w-4 h-4 text-slate-300 animate-spin mx-auto" />
                                                    ) : ejecucion?.encontrado ? (
                                                        <span className="text-xs font-bold text-emerald-600">{formatCurrency(ejecucion.girado)}</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic">Pendiente</span>
                                                    )}
                                                </td>
                                                {/* NEW: % Avance */}
                                                <td className="py-4 px-4 text-center">
                                                    {loadingIntegracion ? (
                                                        <Loader2 className="w-4 h-4 text-slate-300 animate-spin mx-auto" />
                                                    ) : ejecucion?.encontrado ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className={`text-xs font-bold ${ejecucion.porcentaje_girado >= 80 ? 'text-emerald-600' : ejecucion.porcentaje_girado >= 40 ? 'text-amber-600' : 'text-slate-600'}`}>
                                                                {ejecucion.porcentaje_girado}%
                                                            </span>
                                                            <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all ${ejecucion.porcentaje_girado >= 80 ? 'bg-emerald-500' : ejecucion.porcentaje_girado >= 40 ? 'bg-amber-500' : 'bg-slate-400'}`}
                                                                    style={{ width: `${Math.min(ejecucion.porcentaje_girado, 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic">—</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <div className="flex flex-col gap-1 items-center">
                                                        {((adj.tipo_garantia && adj.tipo_garantia !== "SIN_GARANTIA") ||
                                                            (licitacion.tipo_garantia && licitacion.tipo_garantia !== "SIN_GARANTIA")) ? (
                                                            <span className="inline-flex items-center w-fit rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 border border-emerald-100">
                                                                {(adj.tipo_garantia && adj.tipo_garantia !== "SIN_GARANTIA" ? adj.tipo_garantia : licitacion.tipo_garantia || "").replace(/_/g, " ")}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 italic">Sin Garantía</span>
                                                        )}
                                                    </div>
                                                </td>
                                                {/* NEW: Emitido Por */}
                                                <td className="py-4 px-4 text-center">
                                                    <div className="flex flex-col items-center justify-center h-full">
                                                        {(adj.entidad_financiera || licitacion.entidades_financieras) ? (
                                                            <div className="flex items-center gap-2 text-[12px] font-black tracking-wide text-slate-500 uppercase">
                                                                <Landmark className="w-4 h-4 text-slate-400" />
                                                                {adj.entidad_financiera || licitacion.entidades_financieras}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 italic">—</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-xs font-medium text-slate-600 dark:text-slate-400 text-center">
                                                    {formatDate(adj.fecha_adjudicacion)}
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                                                        {adj.estado_item || "VIGENTE"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/5 dark:bg-[#111c44] text-center">
                        <ShieldCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sin Adjudicaciones</h3>
                        <p className="text-xs text-slate-500 mt-1">Este proceso aún no reporta ganadores o items adjudicados.</p>
                    </div>
                )}


                {/* Documentación y Consorcios Section (MODIFIED: tooltip on Fianza button) */}
                {adjudicaciones.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-md dark:border-white/10 dark:bg-[#111c44] animate-in fade-in slide-in-from-bottom-5 duration-500 delay-200 mt-6 border-t-4 border-t-violet-500">
                        <div className="flex items-center gap-3 mb-6">
                            <FileText className="w-5 h-5 text-indigo-500" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase">DOCUMENTACIÓN CONTRACTUAL Y CONSORCIOS</h3>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Adjudicación / Ganador</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Integrantes del Consorcio</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Oferta</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Contrato</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Consorcio</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Fianza</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {adjudicaciones.map((adj) => (
                                            <tr key={adj.id_adjudicacion} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="py-4 px-4 align-top text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xs font-bold text-slate-800 dark:text-white uppercase line-clamp-2">{adj.ganador_nombre}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">RUC: {adj.ganador_ruc}</span>
                                                        <span className="text-[10px] text-indigo-500 font-bold mt-1.5 flex items-center gap-1">
                                                            <Tag className="w-3 h-3" />
                                                            {formatCurrency(adj.monto_adjudicado, licitacion.moneda)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 align-top text-center">
                                                    {adj.consorcios && adj.consorcios.length > 0 ? (
                                                        <div className="flex flex-col gap-2 items-center">
                                                            {adj.consorcios.map((miembro, idx) => (
                                                                <div key={idx} className="flex flex-col items-center text-center">
                                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase leading-snug">
                                                                        {miembro.nombre_miembro}
                                                                    </span>
                                                                    <span className="text-[9px] text-slate-400">
                                                                        RUC: {miembro.ruc_miembro} {miembro.porcentaje_participacion ? `(${Number(miembro.porcentaje_participacion)}%)` : ''}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic">No es consorcio</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 align-middle text-center w-[120px] relative">
                                                    <div className="relative inline-flex flex-col items-center justify-center gap-1 min-w-[80px] group/cell">
                                                        {adj.url_pdf_oferta ? (
                                                            <div className="relative inline-flex flex-col items-center justify-center gap-1">
                                                                {/* Floating Edit/Delete buttons visible only on hover */}
                                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover/cell:opacity-100 transition-opacity duration-300 bg-white dark:bg-slate-800 py-1 px-1.5 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 z-10">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setEditingOfertaId(adj.id_adjudicacion);
                                                                        }}
                                                                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded transition-colors cursor-pointer"
                                                                        title="Editar oferta"
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <div className="w-px h-3 bg-slate-300 dark:bg-slate-600"></div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setDeletingOfertaId(adj.id_adjudicacion);
                                                                        }}
                                                                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 rounded transition-colors cursor-pointer"
                                                                        title="Eliminar oferta"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>

                                                                <a
                                                                    href={adj.url_pdf_oferta}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="group inline-flex flex-col items-center justify-center gap-1 transition-all hover:scale-105"
                                                                >
                                                                    <PdfIcon className="w-8 h-8 transition-transform group-hover:-translate-y-1" />
                                                                    <span className="bg-slate-900 text-white text-[9px] py-1 px-2 rounded font-bold whitespace-nowrap shadow-sm">
                                                                        Descargar PDF
                                                                    </span>
                                                                </a>
                                                            </div>
                                                        ) : (
                                                            <div className="relative inline-flex flex-col items-center justify-center gap-2 opacity-100 group/upload p-3">
                                                                {/* Intense Notification Style - Static dimensions to prevent scrollbar overflow */}
                                                                <div className="absolute top-1 bottom-1 left-2 right-2 bg-slate-300 rounded-2xl blur-[14px] opacity-70 animate-pulse transition-opacity duration-500"></div>

                                                                <div className="relative z-10 flex flex-col items-center gap-2">
                                                                    <PdfIcon className="w-8 h-8 filter grayscale opacity-60 transition-transform group-hover/upload:-translate-y-1" />

                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingOfertaId(adj.id_adjudicacion);
                                                                        }}
                                                                        className="bg-white hover:bg-slate-50 text-[#828f9f] hover:text-slate-600 text-[9px] py-1.5 px-3.5 rounded-md font-extrabold whitespace-nowrap shadow-xl border-[1.5px] border-slate-300 hover:border-slate-400 transition-all cursor-pointer flex items-center justify-center uppercase ring-2 ring-white"
                                                                        title="Haz clic para cargar oferta"
                                                                    >
                                                                        CARGAR
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Portal Modal for Editing */}
                                                    {editingOfertaId === adj.id_adjudicacion && isMounted && createPortal(
                                                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md sm:p-6 transition-all" onClick={() => setEditingOfertaId(null)}>
                                                            <div
                                                                className="w-full max-w-md bg-white dark:bg-[#0b1437] rounded-3xl shadow-2xl shadow-indigo-500/10 border border-slate-200 dark:border-indigo-500/20 overflow-hidden transform transition-all ring-1 ring-black/5 dark:ring-white/5"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {/* Header */}
                                                                <div className="relative flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#0b1437] overflow-hidden">
                                                                    {/* Decorative gradient blur in header */}
                                                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 opacity-70"></div>
                                                                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>

                                                                    <div className="flex items-center gap-4 relative z-10">
                                                                        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-500/20 dark:to-blue-500/20 rounded-2xl text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-500/30">
                                                                            <Upload className="w-5 h-5" />
                                                                        </div>
                                                                        <div>
                                                                            <h3 className="text-[17px] font-extrabold text-slate-800 dark:text-white leading-tight tracking-tight">
                                                                                {adj.url_pdf_oferta ? "Editar Oferta" : "Agregar Oferta"}
                                                                            </h3>
                                                                            <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                                                                {adj.url_pdf_oferta ? "Actualiza el documento actual" : "Sube un archivo PDF"}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => setEditingOfertaId(null)}
                                                                        className="relative z-10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full p-2 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 hover:scale-105"
                                                                        title="Cerrar"
                                                                    >
                                                                        <X className="w-5 h-5 stroke-[2.5]" />
                                                                    </button>
                                                                </div>

                                                                <div className="p-8 space-y-7 bg-slate-50/30 dark:bg-transparent">
                                                                    {/* File Upload Section */}
                                                                    <div className="space-y-4">
                                                                        <div className="flex items-center justify-between">
                                                                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                                                                                Archivo PDF
                                                                            </label>

                                                                            {adj.url_pdf_oferta && (
                                                                                <a
                                                                                    href={adj.url_pdf_oferta}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold transition-colors border border-indigo-100 dark:border-indigo-500/20 max-w-[280px]"
                                                                                    title="Ver documento actual"
                                                                                >
                                                                                    <FileText className="w-3.5 h-3.5 flex-none" />
                                                                                    <span className="break-all leading-tight">
                                                                                        {(() => {
                                                                                            try {
                                                                                                const urlObj = new URL(adj.url_pdf_oferta);
                                                                                                const pathname = urlObj.pathname;
                                                                                                const parts = pathname.split('/');
                                                                                                let filename = parts[parts.length - 1];
                                                                                                filename = decodeURIComponent(filename);
                                                                                                return filename || "Documento Actual";
                                                                                            } catch (e) {
                                                                                                // Fallback parsing just in case it's a relative path instead of full URL
                                                                                                const parts = adj.url_pdf_oferta.split('/');
                                                                                                let filename = parts[parts.length - 1];
                                                                                                try { filename = decodeURIComponent(filename); } catch (ex) { }
                                                                                                return filename || "Documento Actual";
                                                                                            }
                                                                                        })()}
                                                                                    </span>
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                        <div className={`
                                                                            relative group flex flex-col items-center justify-center w-full h-48 
                                                                            border-2 border-dashed rounded-[2rem] transition-all duration-500 cursor-pointer overflow-hidden
                                                                            ${ofertaFileInput ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 shadow-[0_8px_30px_rgba(99,102,241,0.15)] ring-4 ring-indigo-50 dark:ring-indigo-500/5' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:shadow-[0_8px_30px_rgba(99,102,241,0.1)] hover:bg-white dark:hover:bg-[#111c44]/50'}
                                                                        `}>
                                                                            <input
                                                                                type="file"
                                                                                accept=".pdf"
                                                                                onChange={(e) => {
                                                                                    if (e.target.files && e.target.files.length > 0) {
                                                                                        setOfertaFileInput(e.target.files[0]);
                                                                                    }
                                                                                }}
                                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                                                title="Selecciona o arrastra el PDF aquí"
                                                                            />

                                                                            {ofertaFileInput ? (
                                                                                <div className="flex flex-col items-center text-center px-6 space-y-4 z-0 transform transition-transform duration-500 group-hover:scale-105">
                                                                                    <div className="relative flex items-center justify-center">
                                                                                        <div className="absolute inset-0 bg-indigo-400 rounded-full blur-md opacity-20"></div>
                                                                                        <div className="w-16 h-16 rounded-full bg-white dark:bg-[#0b1437] flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-lg border border-indigo-100 dark:border-indigo-500/30 relative z-10">
                                                                                            <FileText className="w-8 h-8" />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex flex-col items-center">
                                                                                        <span className="text-[15px] font-extrabold text-indigo-700 dark:text-indigo-300 truncate max-w-[280px]">
                                                                                            {ofertaFileInput.name}
                                                                                        </span>
                                                                                        <span className="text-[11px] font-bold text-indigo-500/70 dark:text-indigo-400/80 mt-1 uppercase tracking-wider bg-indigo-100/50 dark:bg-indigo-500/20 px-3 py-1 rounded-full">
                                                                                            Haz clic para cambiar
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex flex-col items-center text-center px-6 space-y-5 z-0">
                                                                                    <div className="w-16 h-16 rounded-[1.5rem] bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 transition-all duration-500 shadow-sm border border-slate-200 dark:border-slate-700 group-hover:scale-110 group-hover:-translate-y-1 group-hover:rotate-3 group-hover:shadow-indigo-500/20">
                                                                                        <Upload className="w-7 h-7" />
                                                                                    </div>
                                                                                    <div className="flex flex-col items-center">
                                                                                        <span className="text-[15px] font-extrabold text-slate-700 dark:text-slate-200">
                                                                                            Arrastra tu PDF aquí
                                                                                        </span>
                                                                                        <span className="text-[12px] font-semibold text-slate-400 dark:text-slate-500 mt-1">
                                                                                            o <span className="text-indigo-500 cursor-pointer underline decoration-indigo-500 underline-offset-4 font-bold hover:text-indigo-600 transition-colors">explora tus archivos</span>
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Footer */}
                                                                <div className="px-8 py-6 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-[#0b1437] flex items-center justify-between rounded-b-3xl">
                                                                    <div>
                                                                        {adj.url_pdf_oferta && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setDeletingOfertaId(adj.id_adjudicacion);
                                                                                    setEditingOfertaId(null);
                                                                                }}
                                                                                className="flex items-center justify-center gap-2 px-6 py-3 min-w-[130px] text-[13px] font-extrabold text-red-500 hover:text-white hover:bg-red-500 bg-red-50 hover:border-transparent border border-red-200 dark:bg-red-500/10 dark:border-red-500/30 rounded-[0.8rem] transition-all outline-none group/del"
                                                                                title="Eliminar esta oferta permanentemente"
                                                                            >
                                                                                <Trash2 className="w-[18px] h-[18px] group-hover/del:scale-110 group-hover/del:-rotate-12 transition-transform" />
                                                                                <span className="hidden sm:inline">Eliminar</span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingOfertaId(null);
                                                                                setOfertaFileInput(null);
                                                                            }}
                                                                            className="px-4 py-3 text-[14px] font-extrabold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-[0.8rem] transition-all border border-transparent focus:ring-2 focus:ring-slate-200 outline-none"
                                                                            disabled={savingOferta}
                                                                        >
                                                                            Cancelar
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleOfertaSave(adj.id_adjudicacion)}
                                                                            disabled={savingOferta || (!ofertaFileInput)}
                                                                            className="flex items-center justify-center gap-2 px-6 py-3 min-w-[160px] bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:opacity-100 disabled:from-[#aebbf1] disabled:to-[#b7bdf8] disabled:cursor-not-allowed disabled:shadow-none text-white rounded-[0.8rem] text-[14px] font-extrabold transition-all shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 outline-none"
                                                                        >
                                                                            {savingOferta ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <Save className="w-[18px] h-[18px]" />}
                                                                            <span className="leading-tight text-center">{savingOferta ? 'Guardando...' : 'Confirmar\n& Guardar'}</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        , document.body)}

                                                    {/* Portal Modal for Deleting Confirmation */}
                                                    {deletingOfertaId === adj.id_adjudicacion && isMounted && createPortal(
                                                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md sm:p-6 transition-all" onClick={() => !isDeleting && setDeletingOfertaId(null)}>
                                                            <div
                                                                className="w-full max-w-sm bg-white dark:bg-[#0b1437] rounded-3xl shadow-2xl shadow-rose-500/10 border border-slate-200 dark:border-rose-500/20 overflow-hidden transform transition-all ring-1 ring-black/5"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {/* Decorative Top Line */}
                                                                <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-rose-400"></div>

                                                                <div className="p-8 text-center flex flex-col items-center">
                                                                    <div className="w-16 h-16 bg-red-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100 dark:border-rose-500/20">
                                                                        <Trash2 className="w-8 h-8 text-red-500" />
                                                                    </div>
                                                                    <h3 className="text-xl font-extrabold text-slate-800 dark:text-white mb-2 leading-tight">
                                                                        ¿Eliminar Documento?
                                                                    </h3>
                                                                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
                                                                        Estás a punto de borrar permanentemente la oferta vinculada a este procedimiento. Esta acción no se puede deshacer.
                                                                    </p>

                                                                    <div className="flex w-full gap-3">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setDeletingOfertaId(null)}
                                                                            disabled={isDeleting}
                                                                            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors disabled:opacity-50"
                                                                        >
                                                                            Cancelar
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleOfertaDelete(adj.id_adjudicacion)}
                                                                            disabled={isDeleting}
                                                                            className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-md shadow-red-500/20 disabled:bg-red-300 disabled:cursor-wait flex items-center justify-center gap-2"
                                                                        >
                                                                            {isDeleting ? (
                                                                                <>
                                                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                                    <span>Borrando...</span>
                                                                                </>
                                                                            ) : (
                                                                                "Sí, eliminar"
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        , document.body)}
                                                </td>
                                                <td className="py-4 px-4 align-middle text-center w-[120px]">
                                                    {adj.url_pdf_contrato ? (
                                                        <a
                                                            href={adj.url_pdf_contrato}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="group inline-flex flex-col items-center justify-center gap-1"
                                                        >
                                                            <PdfIcon className="w-8 h-8 transition-transform group-hover:-translate-y-1" />
                                                            <span className="bg-slate-900 text-white text-[9px] py-1 px-2 rounded font-bold whitespace-nowrap shadow-sm">
                                                                Descargar PDF
                                                            </span>
                                                        </a>
                                                    ) : (
                                                        <div className="inline-flex flex-col items-center justify-center gap-1 opacity-50 cursor-not-allowed">
                                                            <PdfIcon className="w-8 h-8 filter grayscale" />
                                                            <span className="bg-slate-100 text-slate-400 text-[9px] py-1 px-2 rounded font-bold whitespace-nowrap shadow-sm border border-slate-200">
                                                                No disponible
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 align-middle text-center w-[120px]">
                                                    {adj.url_pdf_consorcio ? (
                                                        <a
                                                            href={adj.url_pdf_consorcio}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="group inline-flex flex-col items-center justify-center gap-1"
                                                        >
                                                            <PdfIcon className="w-8 h-8 transition-transform group-hover:-translate-y-1" />
                                                            <span className="bg-slate-900 text-white text-[9px] py-1 px-2 rounded font-bold whitespace-nowrap shadow-sm">
                                                                Descargar PDF
                                                            </span>
                                                        </a>
                                                    ) : (
                                                        <div className="inline-flex flex-col items-center justify-center gap-1 opacity-50 cursor-not-allowed">
                                                            <PdfIcon className="w-8 h-8 filter grayscale" />
                                                            <span className="bg-slate-100 text-slate-400 text-[9px] py-1 px-2 rounded font-bold whitespace-nowrap shadow-sm border border-slate-200">
                                                                No disponible
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                {/* FIANZA column with OCDS tooltip */}
                                                <td className="py-4 px-4 align-middle text-center w-[120px]">
                                                    {adj.url_pdf_cartafianza ? (
                                                        <div className="relative group/fianza inline-flex flex-col items-center justify-center gap-1">
                                                            <a
                                                                href={adj.url_pdf_cartafianza}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex flex-col items-center justify-center gap-1"
                                                            >
                                                                <PdfIcon className="w-8 h-8 transition-transform group-hover/fianza:-translate-y-1" />
                                                                <span className="bg-slate-900 text-white text-[9px] py-1 px-2 rounded font-bold whitespace-nowrap shadow-sm">
                                                                    Descargar PDF
                                                                </span>
                                                            </a>
                                                            {/* OCDS Tooltip on hover */}
                                                            {garantiasData && garantiasData.garantias.length > 0 && (
                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/fianza:block z-50">
                                                                    <div className="bg-slate-900 text-white text-[10px] py-2 px-3 rounded-lg shadow-xl whitespace-nowrap font-medium">
                                                                        <div className="flex items-center gap-1.5 mb-1">
                                                                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                                                            <span className="font-bold">Vencimiento oficial según OSCE:</span>
                                                                        </div>
                                                                        <div className="text-slate-300">
                                                                            {formatDate(garantiasData.garantias[0]?.fecha_vencimiento)}
                                                                        </div>
                                                                        {garantiasData.garantias[0]?.monto_garantizado && (
                                                                            <div className="text-slate-300 mt-0.5">
                                                                                Monto: {formatCurrency(garantiasData.garantias[0].monto_garantizado)}
                                                                            </div>
                                                                        )}
                                                                        <div className="mt-1">
                                                                            {renderSemaforoBadge(
                                                                                garantiasData.estado_semaforo,
                                                                                garantiasData.garantias[0]?.dias_restantes
                                                                            )}
                                                                        </div>
                                                                        {/* Arrow */}
                                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900"></div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex flex-col items-center justify-center gap-1 opacity-50 cursor-not-allowed">
                                                            <PdfIcon className="w-8 h-8 filter grayscale" />
                                                            <span className="bg-slate-100 text-slate-400 text-[9px] py-1 px-2 rounded font-bold whitespace-nowrap shadow-sm border border-slate-200">
                                                                No disponible
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
