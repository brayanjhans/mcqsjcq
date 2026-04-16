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
    Trash2,
    ChevronDown,
    ChevronUp,
    Clock,
    Phone,
    Mail,
    TrendingUp,
    BarChart3,
    Package
} from "lucide-react";
import { createPortal } from "react-dom";
import type { Licitacion, Adjudicacion, EjecucionFinanciera, GarantiasResponse, HistorialAnual } from "@/types/licitacion";
import { licitacionService } from "@/lib/services/licitacionService";
import { integracionService } from "@/lib/services/integracionService";
import { generateLicitacionPDF } from "@/lib/utils/generateLicitacionPDF";
import { EstadoInfobras } from "./EstadoInfobras";

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
    const visible = expanded ? sorted : sorted.slice(0, 10);

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
            {historial.length > 4 && (
                <button
                    onClick={() => setExpanded(e => !e)}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg border border-slate-200 dark:border-white/10 transition-colors"
                >
                    {expanded
                        ? <>↑ Mostrar solo los últimos 4 años</>
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
    const [ejecuciones, setEjecuciones] = useState<EjecucionFinanciera[]>([]);
    const [garantiasData, setGarantiasData] = useState<GarantiasResponse | null>(null);
    const [loadingIntegracion, setLoadingIntegracion] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [visibleCUICount, setVisibleCUICount] = useState(1);

    // Portal states
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
    const [portalContainerLeft, setPortalContainerLeft] = useState<HTMLElement | null>(null);

    useEffect(() => {
        // Find the portal targets in the global header
        setPortalContainer(document.getElementById('portal-header-actions'));
        setPortalContainerLeft(document.getElementById('portal-header-left'));
    }, []);

    // Oferta Edit states
    const [editingOfertaId, setEditingOfertaId] = useState<string | null>(null);
    const [savingOferta, setSavingOferta] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [ofertaFileInput, setOfertaFileInput] = useState<File | null>(null);

    // Oferta Delete states
    const [deletingOfertaId, setDeletingOfertaId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fianza Upload states
    const [editingFianzaId, setEditingFianzaId] = useState<string | null>(null);
    const [editingFianzaField, setEditingFianzaField] = useState<string | null>(null);
    const [editingFianzaLabel, setEditingFianzaLabel] = useState<string>("");
    const [fianzaFileInput, setFianzaFileInput] = useState<File | null>(null);
    const [savingFianza, setSavingFianza] = useState(false);
    const [fianzaUploadProgress, setFianzaUploadProgress] = useState<number>(0);
    const [deletingFianzaKey, setDeletingFianzaKey] = useState<{ id: string, field: string, label: string } | null>(null);
    const [isDeletingFianza, setIsDeletingFianza] = useState(false);

    const [isMounted, setIsMounted] = useState(false);
    const [isCronogramaOpen, setIsCronogramaOpen] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleOfertaSave = async (id_adjudicacion: string) => {
        if (!ofertaFileInput) return;
        setSavingOferta(true);
        setUploadProgress(0);
        try {
            const uploadRes = await licitacionService.uploadOfertaFile(
                id_adjudicacion,
                ofertaFileInput,
                (pct) => setUploadProgress(pct)
            );
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
            setUploadProgress(0);
        } catch (err: any) {
            console.error("Error saving oferta:", err);
            const status = err?.response?.status;
            const msg = err?.response?.data?.detail || err?.message || "Error desconocido";
            alert(`Error al guardar la oferta (${status ?? 'red'}): ${msg}`);
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

    const handleFianzaSave = async () => {
        if (!fianzaFileInput || !editingFianzaId || !editingFianzaField) return;
        setSavingFianza(true);
        setFianzaUploadProgress(0);
        try {
            const res = await licitacionService.uploadFianzaFile(editingFianzaId, editingFianzaField, fianzaFileInput);
            setLicitacion(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    adjudicaciones: prev.adjudicaciones?.map(a =>
                        a.id_adjudicacion === editingFianzaId ? { ...a, [editingFianzaField!]: res.url } : a
                    )
                };
            });
            setEditingFianzaId(null);
            setEditingFianzaField(null);
            setFianzaFileInput(null);
            setFianzaUploadProgress(0);
        } catch (err: any) {
            console.error("Error saving fianza:", err);
            const msg = err?.response?.data?.detail || err?.message || "Error desconocido";
            alert(`Error al guardar ${editingFianzaLabel}: ${msg}`);
        } finally {
            setSavingFianza(false);
        }
    };

    const handleFianzaDelete = async () => {
        if (!deletingFianzaKey) return;
        setIsDeletingFianza(true);
        try {
            await licitacionService.updateFianza(deletingFianzaKey.id, deletingFianzaKey.field, "");
            setLicitacion(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    adjudicaciones: prev.adjudicaciones?.map(a =>
                        a.id_adjudicacion === deletingFianzaKey!.id ? { ...a, [deletingFianzaKey!.field]: "" } : a
                    )
                };
            });
            setDeletingFianzaKey(null);
        } catch (err) {
            console.error("Error al eliminar fianza:", err);
            alert("Hubo un error al eliminar el documento.");
        } finally {
            setIsDeletingFianza(false);
        }
    };

    const handleExportPDF = async () => {
        if (!licitacion || exporting) return;
        setExporting(true);
        try {
            let infobrasData = null;
            
            // Use the first CUI for PDF export or just the first in the list
            const cuilist = licitacion.cui?.split(',').map(c => c.trim()).filter(c => c) || [];
            const effectiveCui = cuilist.length > 0 ? cuilist[0] : null;
            
            if (effectiveCui) {
                try {
                    const infoRes = await integracionService.getInfobras(effectiveCui);
                    if (infoRes && infoRes.status === 'success') {
                        infobrasData = infoRes.data;
                    }
                } catch (err) {
                    console.error("Error fetching Infobras for PDF:", err);
                }
            }

            const primaryEjecucion = ejecuciones.length > 0 ? ejecuciones[0] : null;
            generateLicitacionPDF(licitacion, primaryEjecucion, garantiasData, infobrasData);
        } catch (err) {
            console.error('Error exporting PDF:', err);
            // Fallback: generate with what we have
            const primaryEjecucion = ejecuciones.length > 0 ? ejecuciones[0] : null;
            generateLicitacionPDF(licitacion, primaryEjecucion, garantiasData, null);
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
                // Split CUIs if multiple exist
                const cuiList = licitacion.cui?.split(',').map(c => c.trim()).filter(c => c) || [];
                
                const promises: Promise<any>[] = [];
                
                // Fetch MEF execution for each CUI
                if (cuiList.length > 0) {
                    cuiList.forEach(c => {
                        promises.push(integracionService.getEjecucionCui(c));
                    });
                } else {
                    // Fallback to id_convocatoria if no CUI
                    promises.push(integracionService.getEjecucion(licitacion.id_convocatoria));
                }

                // Also fetch guarantees (only once per contract)
                promises.push(integracionService.getGarantias(licitacion.id_convocatoria));

                const results = await Promise.allSettled(promises);
                
                const newEjecuciones: EjecucionFinanciera[] = [];
                let newGarantias: GarantiasResponse | null = null;

                results.forEach((res, index) => {
                    if (res.status === "fulfilled") {
                        if (index < (cuiList.length || 1)) {
                            newEjecuciones.push(res.value);
                        } else {
                            newGarantias = res.value;
                        }
                    }
                });

                setEjecuciones(newEjecuciones);
                if (newGarantias) setGarantiasData(newGarantias);
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

                {/* Top bar: Back Link */}
                <div className="flex items-center justify-between">
                    {portalContainerLeft ? createPortal(
                        <button
                            onClick={() => router.back()}
                            className="inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors font-semibold cursor-pointer bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-2 sm:px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="hidden sm:inline">Volver a resultados</span>
                            <span className="sm:hidden">Volver</span>
                        </button>,
                        portalContainerLeft
                    ) : (
                        <button
                            onClick={() => router.back()}
                            className="inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-blue-600 hover:text-blue-800 transition-colors font-semibold cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">Volver a resultados</span>
                            <span className="sm:hidden">Volver</span>
                        </button>
                    )}

                    {/* The Export button is ported to the global header if available, otherwise rendered here */}
                    {portalContainer ? createPortal(
                        <button
                            onClick={handleExportPDF}
                            disabled={exporting}
                            className="flex h-10 px-4 rounded-full bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 items-center justify-center gap-2 transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ml-2"
                        >
                            {exporting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <PdfIcon className="w-5 h-5" />
                            )}
                            <span className="hidden md:inline">
                                {exporting ? 'Generando...' : 'Exportar'}
                            </span>
                        </button>,
                        portalContainer
                    ) : (
                        <button
                            onClick={handleExportPDF}
                            disabled={exporting}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 text-sm font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {exporting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <PdfIcon className="w-5 h-5" />
                            )}
                            {exporting ? 'Generando PDF...' : 'Exportar PDF'}
                        </button>
                    )}
                </div>


                {/* 1. CENTRAL UNIFIED CARD (With Side Timeline) */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#111c44] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* ACCENT BAR */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                    <div className="grid grid-cols-1 lg:grid-cols-3">
                        
                        {/* LEFT SECTION: 2 Columns for Process Details */}
                        <div className="lg:col-span-2 flex flex-col">
                            {/* TOP: Identification & Financials */}
                            <div className="p-5 md:p-6 lg:p-8">
                                <div className="flex items-center gap-4 mb-3 justify-start">
                                    <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-lg flex-shrink-0">
                                        <FileText className="w-5 h-5" />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-3 mb-1">
                                            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight tracking-tight whitespace-nowrap">
                                                PROCESO {licitacion.id_convocatoria}
                                            </h1>
                                            <div className="flex gap-2 flex-row flex-nowrap items-center max-w-full overflow-x-auto scrollbar-hide pb-1 xl:pb-0">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border shadow-sm transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 cursor-default ${
                                                    licitacion.estado_proceso === "CONVOCA"
                                                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700"
                                                        : licitacion.estado_proceso?.includes("CONTRATADO") || licitacion.estado_proceso?.includes("ADJUDICADO")
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700"
                                                            : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        licitacion.estado_proceso === "CONVOCA" ? "bg-amber-500"
                                                        : licitacion.estado_proceso?.includes("CONTRATADO") || licitacion.estado_proceso?.includes("ADJUDICADO") ? "bg-emerald-500"
                                                        : "bg-slate-400"
                                                    }`} />
                                                    {licitacion.estado_proceso || "PENDIENTE"}
                                                </span>
                                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-[10px] font-black uppercase border border-purple-200 shadow-sm dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 cursor-default">
                                                    {licitacion.categoria || "BIENES"}
                                                </span>
                                                {(() => {
                                                    const idContrato = licitacion.id_contrato || (licitacion.adjudicaciones?.find(a => a.id_contrato)?.id_contrato);
                                                    if (!idContrato) return null;
                                                    return (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 cursor-default">
                                                            <FileText className="w-3 h-3 text-slate-500" />
                                                            CONTRATO: {idContrato}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-mono tracking-wider">
                                            {licitacion.ocid || "OCID no disponible"}
                                        </p>
                                    </div>
                                </div>

                                {licitacion.descripcion && (
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed uppercase tracking-wide pr-8 mt-4 mb-6">
                                        {licitacion.descripcion}
                                    </p>
                                )}

                                {/* FINANCIAL BAR - Using full width of 2 columns to perfectly align */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                    <div className="group bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-500/30 cursor-default shadow-sm">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800 transition-all duration-300 group-hover:scale-110 group-hover:ring-4 group-hover:ring-indigo-100 dark:group-hover:ring-indigo-900">
                                            <TrendingUp className="w-5 h-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Monto Estimado</p>
                                            <p className="text-xl font-black text-slate-800 dark:text-white leading-none">
                                                {formatCurrency(licitacion.monto_estimado, licitacion.moneda)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="group bg-emerald-50/30 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/20 flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-500/30 cursor-default shadow-sm">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800 transition-all duration-300 group-hover:scale-110 group-hover:ring-4 group-hover:ring-emerald-100 dark:group-hover:ring-emerald-900">
                                            <DollarSign className="w-5 h-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest mb-0.5">Monto Adjudicado</p>
                                            <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 leading-none">
                                                {formatCurrency(licitacion.monto_total_adjudicado, licitacion.moneda)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* BOTTOM: Entidad & Detalles Tecnicos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 border-t border-slate-100 dark:border-white/5 flex-1 align-top">
                                {/* ENTIDAD */}
                                <div className="p-5 md:p-6 lg:p-8 border-b md:border-b-0 border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shadow-sm">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Entidad Convocante</h3>
                                    </div>
                                    <p className="text-[15px] font-black text-slate-800 dark:text-slate-100 uppercase leading-snug mb-4">
                                        {licitacion.comprador}
                                    </p>
                                    <div className="flex items-start gap-2 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-default group hover:border-blue-200 dark:hover:border-blue-900/50">
                                        <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5 transition-transform duration-300 group-hover:scale-110" />
                                        <span className="text-xs text-slate-600 dark:text-slate-400 uppercase font-bold leading-relaxed transition-colors group-hover:text-slate-800 dark:group-hover:text-slate-200">
                                            {licitacion.ubicacion_completa || `${licitacion.departamento || ''} - ${licitacion.provincia || ''}`}
                                        </span>
                                    </div>
                                </div>

                                {/* DETALLES TECNICOS */}
                                <div className="p-5 md:p-6 lg:p-8 bg-slate-50/20 md:border-l border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shadow-sm">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Detalles Técnicos</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-default hover:border-violet-200 dark:hover:border-violet-500/30">
                                            <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1.5">Nomenclatura</p>
                                            <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{licitacion.nomenclatura}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-default hover:border-indigo-200 dark:hover:border-indigo-500/30">
                                                <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1">Tipo Proceso</p>
                                                <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase leading-tight">{licitacion.tipo_procedimiento || "N/A"}</p>
                                            </div>
                                            <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-default hover:border-indigo-200 dark:hover:border-indigo-500/30">
                                                <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1">Moneda</p>
                                                <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">{licitacion.moneda || "PEN"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT SECTION: TIMELINE (Takes 1 column) */}
                        <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-white/5 bg-[#fafafa] dark:bg-[#111c44] flex flex-col">
                            <div className="p-5 md:p-6 border-b border-slate-100 dark:border-white/5 sticky top-0 z-10 bg-[#fafafa] dark:bg-[#111c44]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shadow-sm">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-[12px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.2em] leading-tight">Listado de Acciones</h3>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Historial del Proceso</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex-1 p-5 md:p-6 pb-2">
                                {(() => {
                                    const formatDateInSpanish = (dateString: string) => {
                                        if (!dateString || typeof dateString !== 'string') return "—";
                                        const parts = dateString.split(" ");
                                        if (parts.length === 0) return dateString;
                                        const dateParts = parts[0].split("/");
                                        if (dateParts.length !== 3) return parts[0];
                                        const [day, month, year] = dateParts;
                                        const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                                        const monthIndex = parseInt(month, 10) - 1;
                                        if (monthIndex >= 0 && monthIndex < 12) {
                                            return `${parseInt(day, 10)} de ${months[monthIndex]} de ${year}`;
                                        }
                                        return parts[0];
                                    };

                                    if (!licitacion.acciones_json) {
                                        return (
                                            <div className="text-center py-12 flex flex-col items-center justify-center">
                                                <div className="relative mb-4">
                                                    <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping" />
                                                    <div className="w-12 h-12 bg-slate-50 dark:bg-[#152355] rounded-full flex items-center justify-center relative z-10 border border-slate-200 dark:border-white/10 shadow-sm">
                                                        <Clock className="w-5 h-5 text-indigo-400 dark:text-indigo-500 animate-pulse" />
                                                    </div>
                                                </div>
                                                <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-tight animate-pulse">Información<br/>en Proceso</p>
                                            </div>
                                        );
                                    }

                                    try {
                                        const itemsData = JSON.parse(licitacion.acciones_json);
                                        if (!Array.isArray(itemsData) || itemsData.length === 0) throw new Error("Empty data");

                                        return (
                                            <div className="space-y-0">
                                                {itemsData.map((item: any, idx: number) => (
                                                    <div key={idx} className="relative">
                                                        {item.acciones && item.acciones.map((acc: any, aidx: number) => {
                                                            const situacionKey = Object.keys(acc).find(k => k.toLowerCase().includes('situaci')) || '';
                                                            const situacion = acc[situacionKey] || acc['Situación'] || acc['Situacion'] || "Registro";
                                                            const fechaKey = Object.keys(acc).find(k => k.toLowerCase().includes('fecha')) || '';
                                                            const fechaVal = acc[fechaKey] || "—";
                                                            
                                                            const isSuccess = situacion.toLowerCase().includes('adjudic') || situacion.toLowerCase().includes('publicac') || situacion.toLowerCase().includes('consent');
                                                            const isAlert = situacion.toLowerCase().includes('suspend') || situacion.toLowerCase().includes('cancel') || situacion.toLowerCase().includes('nulid');
                                                            const isInfo = situacion.toLowerCase().includes('post') || situacion.toLowerCase().includes('retro');

                                                            return (
                                                                <div key={aidx} className="relative pl-4 pb-2 border-l-2 border-slate-200 dark:border-slate-700 last:border-l-transparent last:pb-0 group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors duration-300 mt-1">
                                                                    <span className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full ring-4 ring-[#fafafa] dark:ring-[#111c44] transition-colors shadow-sm ${
                                                                        isSuccess ? 'bg-emerald-500' : isAlert ? 'bg-red-500' : isInfo ? 'bg-amber-500' : 'bg-indigo-400'
                                                                    }`} />
                                                                    <div className="flex flex-col items-start gap-1.5 w-full pb-2.5 border-b border-dashed border-slate-200 dark:border-white/10 group-last:border-b-0 group-last:pb-0">
                                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shadow-sm border ${
                                                                             isSuccess ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300' :
                                                                             isAlert ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300' :
                                                                             isInfo ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300' :
                                                                             'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300'
                                                                        }`}>
                                                                            {situacion}
                                                                        </span>
                                                                        <span className="text-[9px] font-black text-slate-400 tracking-wide">{formatDateInSpanish(fechaVal)}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    } catch (e) {
                                        return (
                                            <div className="text-center py-6 bg-red-50 dark:bg-red-900/10 rounded-xl">
                                                <p className="text-xs font-bold text-red-500 dark:text-red-400">Error en acciones.</p>
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                        </div>

                    </div>
                </div>


                {/* ========== EJECUCIÓN FINANCIERA CARD (NEW) ========== */}
                {/* ========== EJECUCIÓN FINANCIERA CARD (MULTI-CUI) ========== */}
                {adjudicaciones.length > 0 && (
                    <div className="space-y-6 mt-6">
                        {loadingIntegracion && ejecuciones.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md flex flex-col items-center justify-center gap-3 dark:border-white/10 dark:bg-[#111c44]">
                                <Activity className="w-8 h-8 text-blue-500 animate-spin" />
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Consultando datos financieros en el MEF...</span>
                            </div>
                        ) : ejecuciones.length > 0 ? (
                            <>
                                {ejecuciones.slice(0, visibleCUICount).map((ejec, idx) => (
                                    <div id={`cui-card-${idx}`} key={ejec.cui || idx} className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-md dark:border-white/10 dark:bg-[#111c44] animate-in fade-in slide-in-from-bottom-5 duration-500 border-t-4 border-t-cyan-500">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <Activity className="w-5 h-5 text-blue-500" />
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase">CONSULTA AMIGABLE (MEF) {ejecuciones.length > 1 && `${idx + 1}/${ejecuciones.length}`}</h3>
                                            </div>
                                            {/* Status Badge */}
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${ejec.encontrado && (ejec.match_type === 'cui_ssi' || ejec.match_type === 'cui_exact' || ejec.match_type === 'snip_exact' || ejec.source === 'ssi_api')
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
                                                : ejec.encontrado
                                                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                                                    : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                                                }`}>
                                                <span className={`w-2 h-2 rounded-full ${ejec.encontrado && (ejec.match_type === 'cui_ssi' || ejec.match_type === 'cui_exact' || ejec.match_type === 'snip_exact' || ejec.source === 'ssi_api')
                                                    ? 'bg-emerald-500'
                                                    : ejec.encontrado
                                                        ? 'bg-amber-500'
                                                        : 'bg-red-500'
                                                    }`} />
                                                {ejec.encontrado
                                                    ? `CUI ${ejec.cui} · ${ejec.year_found ?? ejec.year ?? '—'}`
                                                    : `CUI ${ejec.cui} · Sin datos`}
                                            </span>
                                        </div>

                                        {ejec.encontrado ? (
                                            <div className="space-y-6">
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
                                                                <td className="py-4 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400">{formatCurrency(ejec.pia)}</td>
                                                                <td className="py-4 px-4 text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(ejec.pim)}</td>
                                                                <td className="py-4 px-4 text-xs font-medium text-slate-600 dark:text-slate-400">{formatCurrency(ejec.certificado)}</td>
                                                                <td className="py-4 px-4 text-xs font-medium text-slate-600 dark:text-slate-400">{formatCurrency(ejec.compromiso_anual)}</td>
                                                                <td className="py-4 px-4 text-sm font-bold text-blue-600">{formatCurrency(ejec.devengado)}</td>
                                                                <td className="py-4 px-4 text-sm font-bold text-emerald-600">{formatCurrency(ejec.girado)}</td>
                                                                <td className="py-4 px-4 text-right">
                                                                    <span className={`text-sm font-black ${ejec.porcentaje_girado >= 80 ? 'text-emerald-600' : ejec.porcentaje_girado >= 40 ? 'text-amber-600' : 'text-slate-600'}`}>
                                                                        {ejec.porcentaje_girado}%
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="relative pt-1">
                                                    <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mb-2">
                                                        <span>Avance de Ejecución (Sobre PIM)</span>
                                                    </div>
                                                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-slate-100 dark:bg-slate-800 shadow-inner">
                                                        <div
                                                            style={{ width: `${Math.min(ejec.porcentaje_girado, 100)}%` }}
                                                            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-1000 ${ejec.porcentaje_girado >= 80 ? 'bg-emerald-500' : ejec.porcentaje_girado >= 40 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                                        ></div>
                                                    </div>
                                                </div>

                                                {/* Historial */}
                                                {ejec.historial && ejec.historial.length > 0 && (
                                                    <div className="mt-2 pt-4 border-t border-slate-100 dark:border-white/5">
                                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-3 tracking-wider">Historial de Ejecución por Año · CUI {ejec.cui}</p>
                                                        <div className="overflow-x-auto">
                                                            <HistorialChart historial={ejec.historial} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl dark:bg-amber-900/10 dark:border-amber-900/30">
                                                <span className="text-amber-600 dark:text-amber-400 text-xs font-bold">⚠ Ejecución pendiente</span>
                                                <span className="text-amber-500 dark:text-amber-500/70 text-[10px]">— No se encontraron datos para el CUI {ejec.cui}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Toggle Button for Multi-CUI */}
                                {ejecuciones.length > 1 && (
                                    <div className="mt-4 flex flex-col items-center gap-3">
                                        {/* Label */}
                                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                            Selecciona una obra para ver su ejecución
                                        </p>
                                        {/* Numbered CUI Buttons */}
                                        <div className="flex flex-wrap justify-center gap-2.5">
                                            {ejecuciones.map((ejec, i) => {
                                                const isVisible = i < visibleCUICount;
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            setVisibleCUICount(i + 1);
                                                            setTimeout(() => {
                                                                const el = document.getElementById(`cui-card-${i}`);
                                                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                            }, 80);
                                                        }}
                                                        className={`group relative flex flex-col items-center justify-center gap-0.5 px-5 py-3 rounded-2xl font-black transition-all duration-200 border-2 active:scale-95 min-w-[80px] ${
                                                            isVisible
                                                                ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-400/40 dark:shadow-blue-900/60 scale-105'
                                                                : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:scale-105'
                                                        }`}
                                                        title={ejec.cui ? `CUI ${ejec.cui}` : `Obra ${i + 1}`}
                                                    >
                                                        <span className={`text-[10px] font-bold tracking-widest uppercase ${
                                                            isVisible ? 'text-blue-100' : 'text-slate-300 dark:text-slate-600 group-hover:text-blue-300'
                                                        }`}>CUI</span>
                                                        <span className="text-xl leading-none">{i + 1}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {/* Subtitle */}
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                            Mostrando <span className="font-bold text-blue-500">{visibleCUICount}</span> de <span className="font-bold">{ejecuciones.length}</span> obras
                                        </p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-6 shadow-inner dark:border-slate-700 dark:bg-[#0b122b]/50 text-center">
                                <Activity className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Ejecución Financiera</p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">No se encontró información financiera para los CUIs de este proyecto.</p>
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
                                                    ) : ejecuciones.length > 0 ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            {ejecuciones.map((ejec, idx) => ejec.encontrado && (
                                                                <span key={idx} className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                                    {ejecuciones.length > 1 ? `CUI ${ejec.cui}: ` : ''}{formatCurrency(ejec.girado)}
                                                                </span>
                                                            ))}
                                                            {!ejecuciones.some(e => e.encontrado) && (
                                                                <span className="text-[10px] text-slate-400 italic">Pendiente</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic">Pendiente</span>
                                                    )}
                                                </td>
                                                {/* NEW: % Avance */}
                                                <td className="py-4 px-4 text-center">
                                                    {loadingIntegracion ? (
                                                        <Loader2 className="w-4 h-4 text-slate-300 animate-spin mx-auto" />
                                                    ) : ejecuciones.length > 0 && ejecuciones.some(e => e.encontrado) ? (
                                                        <div className="flex flex-col items-center gap-2 mt-1">
                                                            {ejecuciones.map((ejec, idx) => ejec.encontrado && (
                                                                <div key={idx} className="flex flex-col items-center gap-1">
                                                                    <div className="flex items-center gap-1.5">
                                                                        {ejecuciones.length > 1 && <span className="text-[8px] font-black text-slate-400">{ejec.cui}</span>}
                                                                        <span className={`text-[10px] font-black ${ejec.porcentaje_girado >= 80 ? 'text-emerald-600' : ejec.porcentaje_girado >= 40 ? 'text-amber-600' : 'text-slate-600'}`}>
                                                                            {ejec.porcentaje_girado}%
                                                                        </span>
                                                                    </div>
                                                                    <div className="w-14 bg-slate-100 dark:bg-slate-700 rounded-full h-1 overflow-hidden shadow-sm">
                                                                        <div
                                                                            className={`h-full rounded-full transition-all ${ejec.porcentaje_girado >= 80 ? 'bg-emerald-500' : ejec.porcentaje_girado >= 40 ? 'bg-amber-500' : 'bg-slate-400'}`}
                                                                            style={{ width: `${Math.min(ejec.porcentaje_girado, 100)}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
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
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Datos de Contacto</th>
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
                                                        <span className="text-xs font-black text-slate-800 dark:text-white uppercase line-clamp-2">{adj.ganador_nombre}</span>
                                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold font-mono mt-0.5">RUC: {adj.ganador_ruc}</span>
                                                        <span className="text-[10px] text-indigo-500 font-bold mt-1.5 flex items-center gap-1">
                                                            <Tag className="w-3 h-3" />
                                                            {formatCurrency(adj.monto_adjudicado, licitacion.moneda)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td colSpan={2} className="p-0 align-top">
                                                    {adj.consorcios && adj.consorcios.length > 0 ? (
                                                        <div className="flex flex-col">
                                                            {adj.consorcios.map((miembro, idx) => (
                                                                <div key={idx} className={`grid grid-cols-2 w-full transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5 ${idx !== adj.consorcios!.length - 1 ? 'border-b border-slate-100 dark:border-white/5' : ''}`}>
                                                                    {/* Panel Izquierdo: Integrante */}
                                                                    <div className="py-5 px-6 flex flex-col items-center justify-center">
                                                                        <span className="text-[11px] font-black text-slate-800 dark:text-white uppercase leading-tight mb-1.5 text-center">
                                                                            {miembro.nombre_miembro}
                                                                        </span>
                                                                        <div className="flex items-center justify-center gap-2.5">
                                                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold font-mono">
                                                                                RUC: {miembro.ruc_miembro}
                                                                            </span>
                                                                            {miembro.porcentaje_participacion && (
                                                                                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[8px] font-black border border-indigo-100/50 dark:border-indigo-500/20">
                                                                                    {Number(miembro.porcentaje_participacion)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    {/* Panel Derecho: Datos de Contacto */}
                                                                    <div className="py-5 px-6 flex flex-col items-center justify-center gap-2">
                                                                        {miembro.telefono_miembro ? (
                                                                            <a href={`tel:${miembro.telefono_miembro}`} className="flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors group/tel">
                                                                                <Phone className="w-3.5 h-3.5 text-slate-400 group-hover/tel:text-indigo-500" />
                                                                                {miembro.telefono_miembro}
                                                                            </a>
                                                                        ) : null}
                                                                        {miembro.email_miembro ? (
                                                                            <a href={`mailto:${miembro.email_miembro}`} className="flex items-center gap-2 text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors group/mail lowercase">
                                                                                <Mail className="w-3.5 h-3.5 text-slate-400 group-hover/mail:text-indigo-500" />
                                                                                {miembro.email_miembro}
                                                                            </a>
                                                                        ) : null}
                                                                        {!miembro.telefono_miembro && !miembro.email_miembro && (
                                                                            <span className="text-[9px] text-slate-300 italic">—</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="py-14 px-4 text-center">
                                                            <div className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-400/70 border border-slate-100 dark:border-white/5 rounded-full px-4 py-1.5 uppercase tracking-widest bg-slate-50/30 dark:bg-transparent">
                                                                <Users className="w-3 h-3" />
                                                                No es consorcio
                                                            </div>
                                                        </div>
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

                                                                <div className="p-8 space-y-6 bg-slate-50/30 dark:bg-transparent">
                                                                    {/* File Upload Section */}
                                                                    <div className="space-y-4">
                                                                        <div className="flex items-center justify-between">
                                                                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                                                                                Archivo PDF
                                                                            </label>
                                                                            {adj.url_pdf_oferta && (
                                                                                <a href={adj.url_pdf_oferta} target="_blank" rel="noopener noreferrer"
                                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold transition-colors border border-indigo-100 dark:border-indigo-500/20 max-w-[200px]">
                                                                                    <FileText className="w-3.5 h-3.5 flex-none" />
                                                                                    <span className="truncate">Documento Actual</span>
                                                                                </a>
                                                                            )}
                                                                        </div>

                                                                        {/* Drop Zone */}
                                                                        <div className={`relative group flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-[2rem] transition-all duration-500 cursor-pointer overflow-hidden ${savingOferta ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/10 cursor-not-allowed' : ofertaFileInput ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 shadow-[0_8px_30px_rgba(99,102,241,0.15)] ring-4 ring-indigo-50 dark:ring-indigo-500/5' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:shadow-[0_8px_30px_rgba(99,102,241,0.1)] hover:bg-white dark:hover:bg-[#111c44]/50'}`}>
                                                                            {!savingOferta && (
                                                                                <input type="file" accept=".pdf,application/pdf" onChange={(e) => { if (e.target.files && e.target.files.length > 0) setOfertaFileInput(e.target.files[0]); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                                                            )}
                                                                            {savingOferta ? (
                                                                                <div className="flex flex-col items-center text-center px-6 space-y-3 z-0">
                                                                                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                                                                                    <div className="flex flex-col items-center gap-1 w-full max-w-[240px]">
                                                                                        <span className="text-[13px] font-extrabold text-indigo-600 dark:text-indigo-400">
                                                                                            Subiendo archivo... {uploadProgress}%
                                                                                        </span>
                                                                                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                                            <div
                                                                                                className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-300"
                                                                                                style={{ width: `${uploadProgress}%` }}
                                                                                            />
                                                                                        </div>
                                                                                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                                                                            {ofertaFileInput ? `${(ofertaFileInput.size / (1024 * 1024)).toFixed(1)} MB` : ''} · No cierres esta ventana
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            ) : ofertaFileInput ? (
                                                                                <div className="flex flex-col items-center text-center px-6 space-y-3 z-0 group-hover:scale-105 transition-transform">
                                                                                    <div className="w-14 h-14 rounded-full bg-white dark:bg-[#0b1437] flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-lg border border-indigo-100 dark:border-indigo-500/30">
                                                                                        <FileText className="w-7 h-7" />
                                                                                    </div>
                                                                                    <div className="flex flex-col items-center">
                                                                                        <span className="text-[14px] font-extrabold text-indigo-700 dark:text-indigo-300 truncate max-w-[260px]">{ofertaFileInput.name}</span>
                                                                                        <span className="text-[11px] font-bold text-indigo-500/70 mt-1 bg-indigo-100/50 dark:bg-indigo-500/20 px-3 py-0.5 rounded-full">
                                                                                            {(ofertaFileInput.size / (1024 * 1024)).toFixed(1)} MB · Haz clic para cambiar
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex flex-col items-center text-center px-6 space-y-4 z-0">
                                                                                    <div className="w-16 h-16 rounded-[1.5rem] bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 transition-all duration-500 shadow-sm border border-slate-200 dark:border-slate-700 group-hover:scale-110 group-hover:-translate-y-1">
                                                                                        <Upload className="w-7 h-7" />
                                                                                    </div>
                                                                                    <div className="flex flex-col items-center">
                                                                                        <span className="text-[15px] font-extrabold text-slate-700 dark:text-slate-200">Arrastra tu PDF aquí</span>
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
                                                                            disabled={savingOferta || !ofertaFileInput}
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

                {/* FIANZAS Y PAGARÉ Section (Always visible as requested) */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-md dark:border-white/10 dark:bg-[#111c44] animate-in fade-in slide-in-from-bottom-5 duration-500 delay-300 mt-6 border-t-4 border-t-emerald-500">
                    <div className="flex items-center gap-3 mb-6">
                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase">FIANZAS Y PAGARÉ</h3>
                    </div>

                    {adjudicaciones.length > 0 ? (
                        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Adjudicación / Ganador</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Fiel Cumplimiento</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Adelanto Materiales</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Adelanto Directo</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Doc Completo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {adjudicaciones.map((adj) => {
                                            const fianzaFields = [
                                                { key: "fiel_cumplimiento", label: "Fiel Cumplimiento" },
                                                { key: "adelanto_materiales", label: "Adelanto Materiales" },
                                                { key: "adelanto_directo", label: "Adelanto Directo" },
                                                { key: "doc_completo", label: "Doc Completo" },
                                            ] as const;

                                            return (
                                                <tr key={adj.id_adjudicacion} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                    <td className="py-4 px-4 align-top text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-xs font-bold text-slate-800 dark:text-white uppercase line-clamp-2">{adj.ganador_nombre}</span>
                                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold font-mono mt-0.5">RUC: {adj.ganador_ruc}</span>
                                                            <span className="text-[10px] text-indigo-500 font-bold mt-1.5 flex items-center gap-1">
                                                                <Tag className="w-3 h-3" />
                                                                {formatCurrency(adj.monto_adjudicado, licitacion.moneda)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    {fianzaFields.map(({ key, label }) => {
                                                        const url = (adj as any)[key] as string | undefined;
                                                        return (
                                                            <td key={key} className="py-4 px-4 align-middle text-center w-[130px]">
                                                                <div className="inline-flex flex-col items-center justify-center gap-1">
                                                                    {url ? (
                                                                        <div className="relative group/fianzacell inline-flex flex-col items-center justify-center gap-1">
                                                                            {/* Floating delete button on hover */}
                                                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover/fianzacell:opacity-100 transition-opacity duration-300 bg-white dark:bg-slate-800 py-1 px-1.5 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 z-10">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setDeletingFianzaKey({ id: adj.id_adjudicacion, field: key, label })}
                                                                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 rounded transition-colors cursor-pointer"
                                                                                    title={`Eliminar ${label}`}
                                                                                >
                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            </div>
                                                                            <a href={url} target="_blank" rel="noopener noreferrer" className="group inline-flex flex-col items-center justify-center gap-1 transition-all hover:scale-105">
                                                                                <PdfIcon className="w-8 h-8 transition-transform group-hover:-translate-y-1" />
                                                                                <span className="bg-slate-900 text-white text-[9px] py-1 px-2 rounded font-bold whitespace-nowrap shadow-sm">Descargar PDF</span>
                                                                            </a>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="relative inline-flex flex-col items-center justify-center gap-2 group/upload p-3">
                                                                            <div className="absolute top-1 bottom-1 left-2 right-2 bg-slate-300 rounded-2xl blur-[14px] opacity-70 animate-pulse transition-opacity duration-500"></div>
                                                                            <div className="relative z-10 flex flex-col items-center gap-2">
                                                                                <PdfIcon className="w-8 h-8 filter grayscale opacity-60 transition-transform group-hover/upload:-translate-y-1" />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setEditingFianzaId(adj.id_adjudicacion);
                                                                                        setEditingFianzaField(key);
                                                                                        setEditingFianzaLabel(label);
                                                                                        setFianzaFileInput(null);
                                                                                    }}
                                                                                    className="bg-white hover:bg-slate-50 text-[#828f9f] hover:text-slate-600 text-[9px] py-1.5 px-3.5 rounded-md font-extrabold whitespace-nowrap shadow-xl border-[1.5px] border-slate-300 hover:border-slate-400 transition-all cursor-pointer flex items-center justify-center uppercase ring-2 ring-white"
                                                                                >
                                                                                    CARGAR
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 shadow-inner dark:border-slate-700 dark:bg-[#0b122b]/50 text-center">
                            <ShieldCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400">Sin Datos Registrados</h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Todavía no hay Fianzas ni Pagarés vinculados a este proceso.</p>
                        </div>
                    )}
                </div>

                {/* NUEVO: ESTADO INFOBRAS (AVANCE FISICO) - REPEAT FOR EACH CUI (Collapsible) */}
                {licitacion.cui?.split(',').map(c => c.trim()).filter(c => c).length > 0 && (
                    <div className={licitacion.cui?.split(',').length > 1 ? "mt-6" : ""}>
                        {licitacion.cui?.split(',').map(c => c.trim()).filter(c => c).slice(0, visibleCUICount).map((c, i) => (
                            <EstadoInfobras key={c + i} cui={c} />
                        ))}
                    </div>
                )}
                
                {!licitacion.cui && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-6 shadow-inner dark:border-slate-700 dark:bg-[#0b122b]/50 text-center mt-6">
                        <Activity className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Avance Físico (Infobras)</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">No se encontró un CUI válido para realizar la consulta en la Contraloría.</p>
                    </div>
                )}

                {/* Fianza Upload Modal */}
                {editingFianzaId && editingFianzaField && isMounted && createPortal(
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md sm:p-6 transition-all" onClick={() => { if (!savingFianza) { setEditingFianzaId(null); setEditingFianzaField(null); setFianzaFileInput(null); } }}>
                        <div className="w-full max-w-md bg-white dark:bg-[#0b1437] rounded-3xl shadow-2xl shadow-emerald-500/10 border border-slate-200 dark:border-emerald-500/20 overflow-hidden transform transition-all ring-1 ring-black/5 dark:ring-white/5" onClick={(e) => e.stopPropagation()}>
                            {/* Header */}
                            <div className="relative flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#0b1437] overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-green-500 opacity-70"></div>
                                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/20 dark:to-teal-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100/50 dark:border-emerald-500/30">
                                        <Upload className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-[17px] font-extrabold text-slate-800 dark:text-white leading-tight tracking-tight">
                                            Agregar {editingFianzaLabel}
                                        </h3>
                                        <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Sube un archivo PDF</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setEditingFianzaId(null); setEditingFianzaField(null); setFianzaFileInput(null); }}
                                    className="relative z-10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full p-2 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 hover:scale-105"
                                    title="Cerrar"
                                    disabled={savingFianza}
                                >
                                    <X className="w-5 h-5 stroke-[2.5]" />
                                </button>
                            </div>

                            <div className="p-8 space-y-6 bg-slate-50/30 dark:bg-transparent">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                                            Archivo PDF
                                        </label>
                                    </div>

                                    {/* Drop Zone */}
                                    <div className={`relative group flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-[2rem] transition-all duration-500 cursor-pointer overflow-hidden ${savingFianza ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10 cursor-not-allowed' : fianzaFileInput ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 shadow-[0_8px_30px_rgba(16,185,129,0.15)] ring-4 ring-emerald-50 dark:ring-emerald-500/5' : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)] hover:bg-white dark:hover:bg-[#111c44]/50'}`}>
                                        {!savingFianza && (
                                            <input type="file" accept=".pdf,application/pdf" onChange={(e) => { if (e.target.files && e.target.files.length > 0) setFianzaFileInput(e.target.files[0]); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                        )}
                                        {savingFianza ? (
                                            <div className="flex flex-col items-center text-center px-6 space-y-3 z-0">
                                                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                                                <div className="flex flex-col items-center gap-1 w-full max-w-[240px]">
                                                    <span className="text-[13px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                                        Subiendo archivo... {fianzaUploadProgress}%
                                                    </span>
                                                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300" style={{ width: `${fianzaUploadProgress}%` }} />
                                                    </div>
                                                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                                        {fianzaFileInput ? `${(fianzaFileInput.size / (1024 * 1024)).toFixed(1)} MB` : ''} · No cierres esta ventana
                                                    </span>
                                                </div>
                                            </div>
                                        ) : fianzaFileInput ? (
                                            <div className="flex flex-col items-center text-center px-6 space-y-3 z-0 group-hover:scale-105 transition-transform">
                                                <div className="w-14 h-14 rounded-full bg-white dark:bg-[#0b1437] flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg border border-emerald-100 dark:border-emerald-500/30">
                                                    <FileText className="w-7 h-7" />
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[14px] font-extrabold text-emerald-700 dark:text-emerald-300 truncate max-w-[260px]">{fianzaFileInput.name}</span>
                                                    <span className="text-[11px] font-bold text-emerald-500/70 mt-1 bg-emerald-100/50 dark:bg-emerald-500/20 px-3 py-0.5 rounded-full">
                                                        {(fianzaFileInput.size / (1024 * 1024)).toFixed(1)} MB · Haz clic para cambiar
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center text-center px-6 space-y-4 z-0">
                                                <div className="w-16 h-16 rounded-[1.5rem] bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/20 transition-all duration-500 shadow-sm border border-slate-200 dark:border-slate-700 group-hover:scale-110 group-hover:-translate-y-1">
                                                    <Upload className="w-7 h-7" />
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[15px] font-extrabold text-slate-700 dark:text-slate-200">Arrastra tu PDF aquí</span>
                                                    <span className="text-[12px] font-semibold text-slate-400 dark:text-slate-500 mt-1">
                                                        o <span className="text-emerald-500 cursor-pointer underline decoration-emerald-500 underline-offset-4 font-bold hover:text-emerald-600 transition-colors">explora tus archivos</span>
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-8 py-6 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-[#0b1437] flex items-center justify-end gap-3 rounded-b-3xl">
                                <button
                                    onClick={() => { setEditingFianzaId(null); setEditingFianzaField(null); setFianzaFileInput(null); }}
                                    className="px-4 py-3 text-[14px] font-extrabold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-[0.8rem] transition-all border border-transparent focus:ring-2 focus:ring-slate-200 outline-none"
                                    disabled={savingFianza}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleFianzaSave}
                                    disabled={savingFianza || !fianzaFileInput}
                                    className="flex items-center justify-center gap-2 px-6 py-3 min-w-[160px] bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-100 disabled:from-[#a3d9c8] disabled:to-[#a8dbc0] disabled:cursor-not-allowed disabled:shadow-none text-white rounded-[0.8rem] text-[14px] font-extrabold transition-all shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 outline-none"
                                >
                                    {savingFianza ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <Save className="w-[18px] h-[18px]" />}
                                    <span className="leading-tight text-center">{savingFianza ? 'Guardando...' : 'Confirmar\n& Guardar'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    , document.body)}

                {/* Fianza Delete Confirmation Modal */}
                {deletingFianzaKey && isMounted && createPortal(
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md sm:p-6 transition-all" onClick={() => !isDeletingFianza && setDeletingFianzaKey(null)}>
                        <div className="w-full max-w-sm bg-white dark:bg-[#0b1437] rounded-3xl shadow-2xl shadow-rose-500/10 border border-slate-200 dark:border-rose-500/20 overflow-hidden transform transition-all ring-1 ring-black/5" onClick={(e) => e.stopPropagation()}>
                            <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-rose-400"></div>
                            <div className="p-8 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-red-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100 dark:border-rose-500/20">
                                    <Trash2 className="w-8 h-8 text-red-500" />
                                </div>
                                <h3 className="text-xl font-extrabold text-slate-800 dark:text-white mb-2 leading-tight">¿Eliminar {deletingFianzaKey.label}?</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
                                    Estás a punto de borrar permanentemente este documento. Esta acción no se puede deshacer.
                                </p>
                                <div className="flex w-full gap-3">
                                    <button type="button" onClick={() => setDeletingFianzaKey(null)} disabled={isDeletingFianza} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors disabled:opacity-50">Cancelar</button>
                                    <button type="button" onClick={handleFianzaDelete} disabled={isDeletingFianza} className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-md shadow-red-500/20 disabled:bg-red-300 disabled:cursor-wait flex items-center justify-center gap-2">
                                        {isDeletingFianza ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Borrando...</span></>) : "Sí, eliminar"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    , document.body)}
            </div>
        </div>
    );
}
