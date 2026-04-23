import React from "react";
import Link from "next/link";
import {
    FileText,
    Building2,
    MapPin,
    Tag,
    DollarSign,
    Calendar,
    ShieldCheck,
    Eye,
    Landmark,
    Award,
    CheckCircle2,
    StickyNote,
    User,
    Users
} from "lucide-react";
import type { Licitacion } from "@/types/licitacion";

interface Props {
    licitacion: Licitacion;
    showManualActions?: boolean;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    basePath?: string;
    selectable?: boolean;
    isSelected?: boolean;
    onToggleSelect?: (id: string) => void;
    searchTerm?: string; // For highlighting
}

export const LicitacionCard: React.FC<Props> = ({
    licitacion,
    showManualActions = false,
    onEdit,
    onDelete,
    basePath = "/seace/busqueda",
    selectable = false,
    isSelected = false,
    onToggleSelect,
    searchTerm
}) => {
    // FORMATTERS
    const MESES_ES = [
        '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return "N/A";

        // Normalize: strip time portion if present (e.g. 2025-02-17T00:00:00)
        const cleanDate = dateString.includes('T') ? dateString.split('T')[0] : dateString;

        // Parse YYYY-MM-DD  →  "17 de Febrero de 2025"
        const parts = cleanDate.split('-');
        if (parts.length === 3) {
            const year  = parts[0];
            const month = parseInt(parts[1], 10);
            const day   = parseInt(parts[2], 10);
            if (!isNaN(month) && !isNaN(day) && MESES_ES[month]) {
                return `${day} de ${MESES_ES[month]} de ${year}`;
            }
        }

        // Fallback – already a text date or unknown format
        return dateString;
    };

    const formatCurrency = (amount?: number, currency: string = "PEN") => {
        if (amount === undefined || amount === null) return "S/ N/A";
        return new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency: currency || "PEN",
        }).format(amount);
    };

    // --- Highlight Logic ---
    // Safely highlights text without breaking layout match
    const getHighlightedText = (text: string | null | undefined, highlight: string | undefined): React.ReactNode => {
        if (!text) return "";
        if (!highlight || highlight.length < 2) return text;

        try {
            // Escape special regex chars
            const safeHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const parts = text.split(new RegExp(`(${safeHighlight})`, 'gi'));

            return (
                <span>
                    {parts.map((part, i) =>
                        part.toLowerCase() === highlight.toLowerCase() ?
                            <span key={i} className="bg-yellow-200 text-slate-900 px-0.5 rounded-sm dark:bg-yellow-500/30 dark:text-yellow-100 font-bold">{part}</span> : part
                    )}
                </span>
            );
        } catch (e) {
            return text;
        }
    };

    // --- Hidden Match Detection ---
    // returns { type: 'Consorcio' | 'Ganador', text: string } if match found in hidden fields
    const getHiddenMatch = () => {
        if (!searchTerm || searchTerm.length < 3) return null;

        const term = searchTerm.toLowerCase();
        // Ignore if match is already visible
        const visibleContent = ((licitacion.nomenclatura || "") + (licitacion.descripcion || "") + (licitacion.comprador || "")).toLowerCase();
        if (visibleContent.includes(term)) return null;

        // Check Consortiums first (most common hidden cause)
        if (licitacion.miembros_consorcio) {
            for (const m of licitacion.miembros_consorcio) {
                if (m.nombre_miembro && m.nombre_miembro.toLowerCase().includes(term)) {
                    return { type: 'Consorcio', text: m.nombre_miembro };
                }
                if (m.ruc_miembro && m.ruc_miembro.includes(term)) {
                    return { type: 'RUC Consorcio', text: `${m.ruc_miembro} (${m.nombre_miembro})` };
                }
            }
        }

        // Check Winners (if not extended view where they are visible)
        // Actually, check them anyway to be safe, highlighters in body handle visible ones
        if (licitacion.ganador_nombre && licitacion.ganador_nombre.toLowerCase().includes(term)) {
            return { type: 'Ganador', text: licitacion.ganador_nombre };
        }
        if (licitacion.ganador_ruc && licitacion.ganador_ruc.includes(term)) {
            return { type: 'RUC Ganador', text: licitacion.ganador_ruc };
        }

        return null;
    };

    const hiddenMatch = getHiddenMatch();

    // LOGIC
    const getStatusTheme = (status: string) => {
        const s = status?.toUpperCase() || "";
        if (s.includes('CONTRATADO')) return { 
            border: 'bg-emerald-500', 
            gradient: 'from-emerald-50/50 dark:from-emerald-500/10',
            badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
        };
        if (s.includes('ADJUDICADO')) return { 
            border: 'bg-blue-500', 
            gradient: 'from-blue-50/50 dark:from-blue-500/10',
            badge: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
        };
        if (s.includes('CONSENTIDO')) return { 
            border: 'bg-orange-500', 
            gradient: 'from-orange-50/50 dark:from-orange-500/10',
            badge: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30'
        };
        if (s.includes('CONVOCADO')) return { 
            border: 'bg-amber-500', 
            gradient: 'from-amber-50/50 dark:from-amber-400/10',
            badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
        };
        if (s.includes('APELADO')) return { 
            border: 'bg-indigo-500', 
            gradient: 'from-indigo-50/50 dark:from-indigo-500/10',
            badge: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30'
        };
        if (s.includes('CANCELADO') || s.includes('DESIERTO') || s.includes('NULIDAD') || s.includes('NULO')) return { 
            border: 'bg-rose-500', 
            gradient: 'from-rose-50/50 dark:from-rose-500/10',
            badge: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
        };
        return { 
            border: 'bg-slate-400', 
            gradient: 'from-slate-50/50 dark:from-slate-400/10',
            badge: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600'
        };
    };

    const statusTheme = getStatusTheme(licitacion.estado_proceso);
    const statusUpper = licitacion.estado_proceso?.toUpperCase() || "SIN ESTADO";
    const isContratado = statusUpper.includes("CONTRATADO") || statusUpper.includes("ADJUDICADO") || statusUpper.includes("CONSENTIDO");
    const isConvocado = statusUpper.includes("CONVOCADO");
    const isCancelado = statusUpper.includes("CANCELADO") || statusUpper.includes("DESIERTO") || statusUpper.includes("NULO");

    // FORCE EXTENDED VIEW IF CONTRATADO/ADJUDICADO OR HAS SIGNIFICANT DATA
    const hasData = !!licitacion.ganador_nombre || !!licitacion.entidades_financieras || (!!licitacion.tipo_garantia && licitacion.tipo_garantia !== "NO APLICA");
    const showExtendedDetails = isContratado || ((licitacion.monto_total_adjudicado || 0) > 0) || hasData;

    // BADGES
    const getStatusBadge = () => {
        const isSpecial = isConvocado || statusUpper.includes("CONSENTIDO") || statusUpper.includes("CONTRATADO");
        
        return (
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border transition-all duration-500 ${statusTheme.badge} ${isSpecial ? 'shimmer-badge shadow-sm' : ''}`}>
                {licitacion.estado_proceso || "SIN ESTADO"}
            </span>
        );
    };

    const renderCategoryBadge = () => {
        const cat = licitacion.categoria || "SIN CATEGORÍA";
        let styles = "bg-purple-100 text-purple-700";
        if (cat === "OBRAS") styles = "bg-orange-100 text-orange-700";
        if (cat === "SERVICIOS") styles = "bg-blue-100 text-blue-700";

        return (
            <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${styles}`}>
                    {cat}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium truncate max-w-[150px]" title={licitacion.tipo_procedimiento || "Sin Procedimiento"}>
                    {licitacion.tipo_procedimiento || "Sin Procedimiento"}
                </span>
            </div>
        );
    };

    const renderGuaranteeBadges = () => {
        // Only show if data exists OR if in extended view (can show placeholder if desired, but image shows specific data)
        if (!licitacion.tipo_garantia || licitacion.tipo_garantia === 'SIN_GARANTIA') return null;
        const guarantees = licitacion.tipo_garantia.split(',');
        return (
            <div className="flex flex-wrap gap-1 mt-1">
                {guarantees.map((g, i) => (
                    <span key={i} className="flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold">
                        <Building2 className="w-3 h-3" />
                        {getHighlightedText(g.trim().replace(/_/g, " "), searchTerm)}
                    </span>
                ))}
            </div>
        );
    };

    const renderBankBadge = () => {
        if (!licitacion.entidades_financieras) return null;
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold uppercase">
                {getHighlightedText(licitacion.entidades_financieras, searchTerm)}
            </span>
        );
    };

    return (
        <div className="perspective-container h-full">
            <div
                className={`group tilt-element relative flex flex-col h-full overflow-hidden rounded-[2.5rem] bg-white border border-slate-200 shadow-xl transition-all duration-500 hover:shadow-2xl hover:border-slate-300 dark:bg-[#0A192F] dark:border-white/10
                    ${isSelected ? 'ring-4 ring-indigo-500/30 border-indigo-400/50' : ''}
                `}
            >
            {/* Status Accent Border - Dynamic Theme */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 z-10 transition-colors duration-500 ${statusTheme.border}`}></div>
            {/* Hidden Match Badge - Shows why this card appeared if term is hidden */}
            {hiddenMatch && (
                <div className="mb-3 -mt-2 -mx-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 flex items-center gap-2 animate-pulse dark:bg-indigo-900/20 dark:border-indigo-500/30">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-800 dark:text-indigo-300">
                        <Users className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                        Coincidencia en {hiddenMatch.type}:
                        <span className="ml-1 font-bold">{getHighlightedText(hiddenMatch.text, searchTerm)}</span>
                    </span>
                </div>
            )}

            {/* Selection Checkbox - Absolute Top Right */}
            {selectable && (
                <div className="absolute top-4 right-4 z-20">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onToggleSelect?.(licitacion.id_convocatoria);
                        }}
                        className={`w-6 h-6 rounded flex items-center justify-center transition-colors shadow-sm border
                            ${isSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white border-slate-300 text-transparent hover:border-blue-400'
                            }
                        `}
                    >
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                </div>
            )}

            {/* Header / ID / Status */}
            <div className={`relative p-7 pb-4 transition-all duration-500`}>
                <div className="flex items-center justify-between gap-4">
                    <div className={`flex items-start gap-4 flex-1 ${selectable ? 'pr-10' : ''}`}>
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-sm dark:text-white line-clamp-2 leading-tight">
                                {licitacion.nomenclatura ? getHighlightedText(licitacion.nomenclatura, searchTerm) : "SIN NOMENCLATURA"}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">
                                {getHighlightedText(licitacion.ocid || "N/A", searchTerm)}
                            </p>
                        </div>
                    </div>
                    {/* Status Badge - Only show inline if NOT selectable */}
                    {!selectable && getStatusBadge()}
                </div>

                {/* Status Badge - Show below header if selectable to clear the checkbox */}
                {selectable && (
                    <div className="mt-3 flex justify-end">
                        {getStatusBadge()}
                    </div>
                )}
            </div>

            {/* Description */}
            <div className="relative px-7 pb-4">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase leading-tight dark:text-slate-100 transition-colors duration-300">
                    {getHighlightedText(licitacion.descripcion, searchTerm)}
                </h3>
            </div>

            {/* VERTICAL LIST - SINGLE COLUMN */}
            <div className="relative px-5 py-2 space-y-4 flex-1">

                {/* 1. Comprador */}
                <div className="flex gap-3">
                    <div className="w-4 flex justify-center pt-0.5 shrink-0">
                        <Building2 className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Comprador</p>
                        <p className="text-xs font-bold text-slate-800 uppercase leading-tight line-clamp-2 dark:text-slate-100 transition-colors">
                            {getHighlightedText(licitacion.comprador, searchTerm)}
                            {licitacion.entidad_ruc && (
                                <span className="ml-1.5 text-[9px] bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded-md border border-slate-100 font-mono dark:bg-slate-800 dark:border-slate-700">
                                    RUC: {getHighlightedText(licitacion.entidad_ruc, searchTerm)}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {/* 2. Ubicacion */}
                <div className="flex gap-3">
                    <div className="w-4 flex justify-center pt-0.5 shrink-0">
                        <MapPin className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Ubicación</p>
                        <p className="text-xs font-semibold text-slate-700 uppercase dark:text-slate-300">
                            {licitacion.departamento || "N/A"} - {licitacion.provincia || "N/A"} - {licitacion.distrito || "N/A"}
                        </p>
                    </div>
                </div>

                {/* 3. Categoria */}
                <div className="flex gap-3">
                    <div className="w-4 flex justify-center pt-0.5 shrink-0">
                        <Tag className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Categoría</p>
                        {renderCategoryBadge()}
                    </div>
                </div>

                {/* 4. Monto */}
                <div className="flex gap-4">
                    <div className="w-5 flex justify-center pt-1 shrink-0">
                        <DollarSign className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">
                            {showExtendedDetails ? "Monto Adjudicado" : "Monto Estimado"}
                        </p>
                        <div className="relative group/amount">
                            <p className="text-2xl font-black tracking-tighter text-gradient-metallic leading-none py-1">
                                {formatCurrency(showExtendedDetails && licitacion.monto_total_adjudicado ? licitacion.monto_total_adjudicado : licitacion.monto_estimado, licitacion.moneda)}
                            </p>
                            {showExtendedDetails && (
                                <p className="mt-2 text-[11px] font-black text-slate-500 dark:text-slate-400">
                                    <span className="opacity-50">MONTO ESTIMADO:</span> {formatCurrency(licitacion.monto_estimado, licitacion.moneda)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 5. Fechas */}
                <div className="flex gap-3">
                    <div className="w-4 flex justify-center pt-0.5 shrink-0">
                        <Calendar className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        {licitacion.id_contrato && licitacion.fecha_adjudicacion ? (
                            <div className="inline-flex flex-col px-4 py-2 rounded-2xl bg-emerald-50/30 shadow-inner border border-white/40 dark:bg-emerald-500/5 dark:border-white/5">
                                <p className="text-[8px] text-emerald-600 font-bold uppercase tracking-widest mb-0.5">
                                    Fecha de Adjudicación
                                </p>
                                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                    {formatDate(licitacion.fecha_adjudicacion)}
                                </p>
                            </div>
                        ) : (
                            <div className="inline-flex flex-col px-4 py-2 rounded-2xl bg-slate-50/50 shadow-inner border border-white/40 dark:bg-white/5 dark:border-white/5">
                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">
                                    Fecha de Publicación
                                </p>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                    {formatDate(licitacion.fecha_publicacion)}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 6. Identificadores */}
                <div className="flex gap-3">
                    <div className="w-4 flex justify-center pt-0.5 shrink-0">
                        <StickyNote className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Identificadores</p>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md inline-block w-fit">
                                ID Contrato: {licitacion.id_contrato || "N/A"}
                            </span>
                            <span className={`text-[10px] px-2 ${!licitacion.id_contrato ? 'text-indigo-600 font-black bg-indigo-50 dark:bg-indigo-500/10 w-fit rounded-md' : 'text-slate-500 font-bold'}`}>
                                ID Convocatoria: {licitacion.id_convocatoria}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 8. Datos del Contrato (reemplaza Tipo de Garantía) */}
                <div className="flex gap-3">
                    <div className="w-4 flex justify-center pt-0.5 shrink-0">
                        <ShieldCheck className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Datos del Contrato</p>
                        {(() => {
                            const primerMiembro = licitacion.miembros_consorcio?.find(m => m.fecha_firma_contrato || m.fecha_prevista_fin);
                            if (!primerMiembro) {
                                return <p className="text-[9px] text-slate-300 italic font-medium">No especificada</p>;
                            }
                            return (
                                <div className="flex flex-col gap-1.5">
                                    {primerMiembro.fecha_firma_contrato && (
                                        <div>
                                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Firma</p>
                                            <p className="text-[10px] font-black text-slate-700 dark:text-slate-200">
                                                {formatDate(primerMiembro.fecha_firma_contrato)}
                                            </p>
                                        </div>
                                    )}
                                    {primerMiembro.fecha_prevista_fin && (
                                        <div>
                                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Fin Previsto</p>
                                            <p className="text-[10px] font-black text-slate-700 dark:text-slate-200">
                                                {formatDate(primerMiembro.fecha_prevista_fin)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* 7. Ganador (EXTENDED - Always show structure if extended, N/A if missing) */}
                {showExtendedDetails && (
                    <div className="flex gap-3">
                        <div className="w-4 flex justify-center pt-0.5 shrink-0">
                            {/* USER ICON as requested */}
                            <User className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-800 uppercase leading-tight line-clamp-2 dark:text-slate-100">
                                {licitacion.ganador_nombre || "NO INFORMADO"}
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold tracking-wider mt-1">
                                RUC: {licitacion.ganador_ruc || "N/A"}
                            </p>

                            {/* CONSORCIO VISIBLE (Updated Logic) */}
                            {((licitacion.miembros_consorcio && licitacion.miembros_consorcio.length > 0) || licitacion.nombres_consorciados) && (
                                <div className="mt-2 pl-2 border-l-2 border-indigo-100">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Users className="w-3 h-3 text-indigo-500" />
                                        <span className="text-[10px] font-bold text-indigo-600 uppercase">
                                            Consorciados ({licitacion.miembros_consorcio?.length || licitacion.nombres_consorciados?.split('|').length})
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        {licitacion.miembros_consorcio && licitacion.miembros_consorcio.length > 0 ? (
                                            // Render from Objects (Preferred - shows clean names + porcentaje)
                                            licitacion.miembros_consorcio.map((miembro, idx) => (
                                                <div key={idx} className="flex items-start justify-between gap-1">
                                                    <span className="text-[9px] text-slate-500 leading-tight font-medium uppercase truncate flex-1">
                                                        • {miembro.nombre_miembro}
                                                    </span>
                                                    {Number(miembro.porcentaje_participacion) > 0 && (
                                                        <span className="text-[9px] font-bold text-indigo-600 shrink-0 bg-indigo-50 px-1 rounded ml-1">
                                                            {Number(miembro.porcentaje_participacion).toFixed(1)}%
                                                        </span>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            // Fallback to text string
                                            licitacion.nombres_consorciados?.split('|').map((nombre, idx) => (
                                                <span key={idx} className="text-[9px] text-slate-500 leading-tight font-medium uppercase truncate">
                                                    • {nombre}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 9. Adjudicaciones count (EXTENDED) */}
                {showExtendedDetails && (
                    <div className="flex gap-3">
                        <div className="w-4 flex justify-center pt-0.5 shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">Adjudicaciones</p>
                            <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                {licitacion.total_adjudicaciones || 0} item(s)
                                {licitacion.tipo_garantia && <span className="text-[10px] text-emerald-600">✓ Con Garantía</span>}
                            </p>
                        </div>
                    </div>
                )}

                {/* 10. Financiera */}
                <div className="flex gap-3">
                    <div className="w-4 flex justify-center pt-0.5 shrink-0">
                        <Landmark className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">Entidades Financieras</p>
                        {licitacion.entidades_financieras ? renderBankBadge() : <p className="text-[10px] text-slate-400 italic">No especificada</p>}
                    </div>
                </div>

            </div>



            <div className="p-6 pt-2">
                {!showManualActions ? (
                    <Link
                        href={`${basePath}/${licitacion.id_convocatoria}`}
                        className="w-full flex items-center justify-center gap-3 bg-[#0A192F] dark:bg-white text-white dark:text-[#0A192F] py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-xl shadow-indigo-900/10 dark:shadow-white/5"
                    >
                        <Eye className="w-4 h-4" />
                        Ver Detalles
                    </Link>
                ) : (
                    <div className="p-4 border-t border-slate-100 flex gap-2">
                        <Link
                            href={`${basePath}/${licitacion.id_convocatoria}`}
                            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-50 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            Ver
                        </Link>
                        <button
                            onClick={() => onEdit?.(licitacion.id_convocatoria)}
                            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Editar
                        </button>
                        <button
                            onClick={() => onDelete?.(licitacion.id_convocatoria)}
                            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-red-100 bg-white py-2.5 text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                            Eliminar
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
    );
};
