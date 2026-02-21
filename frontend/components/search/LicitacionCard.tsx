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
    const formatDate = (dateString?: string) => {
        if (!dateString) return "N/A";
        // Fix: Use simple string split to avoid timezone conversion issues
        if (dateString.includes('T')) {
            // If it has time, we might still want to be careful, but these are usually YYYY-MM-DD
            const dateOnly = dateString.split('T')[0];
            const [year, month, day] = dateOnly.split('-');
            return `${day}/${month}/${year}`;
        }

        // Assume YYYY-MM-DD
        const [year, month, day] = dateString.split('-');
        if (year && month && day) {
            return `${day}/${month}/${year}`;
        }

        // Fallback for other formats
        return new Date(dateString).toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
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
    const statusUpper = licitacion.estado_proceso?.toUpperCase() || "SIN ESTADO";
    const isContratado = statusUpper.includes("CONTRATADO") || statusUpper.includes("ADJUDICADO");
    const isConvocado = statusUpper.includes("CONVOCADO");
    const isCancelado = statusUpper.includes("CANCELADO") || statusUpper.includes("DESIERTO") || statusUpper.includes("NULO");

    // FORCE EXTENDED VIEW IF CONTRATADO/ADJUDICADO OR HAS SIGNIFICANT DATA
    const hasData = !!licitacion.ganador_nombre || !!licitacion.entidades_financieras || (!!licitacion.tipo_garantia && licitacion.tipo_garantia !== "NO APLICA");
    const showExtendedDetails = isContratado || ((licitacion.monto_total_adjudicado || 0) > 0) || hasData;

    // BADGES
    const getStatusBadge = () => {
        let styles = "bg-slate-100 text-slate-700 border-slate-200";
        if (isConvocado) styles = "bg-[#FFF9C4] text-[#8D6E1F] border-[#FDE047]"; // Yellow
        else if (statusUpper === "ACTIVO") styles = "bg-blue-50 text-blue-700 border-blue-200"; // Blue for Active
        else if (isContratado) styles = "bg-slate-100 text-slate-600 border-slate-200"; // Light Gray
        else if (isCancelado) styles = "bg-red-50 text-red-700 border-red-200"; // Red

        return (
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${styles}`}>
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
        <div
            className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-xl dark:bg-[#111c44] dark:border-white/5 
                ${isSelected ? 'border-2 border-blue-600' : 'border border-slate-200 hover:border-indigo-300'}
            `}
        >
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
            <div className="relative p-5 pb-2">
                <div className="flex items-center justify-between gap-4">
                    <div className={`flex items-start gap-3 flex-1 ${selectable ? 'pr-8' : ''}`}>
                        <div className="w-10 h-10 rounded-xl bg-[#E0E7FF] flex items-center justify-center text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 shrink-0">
                            <FileText className="w-5 h-5" />
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
            <div className="relative px-5 pb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase leading-relaxed line-clamp-3 dark:text-slate-100">
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
                        <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">Comprador</p>
                        <p className="text-[11px] font-bold text-slate-800 uppercase leading-tight line-clamp-2 dark:text-slate-200">
                            {getHighlightedText(licitacion.comprador, searchTerm)}
                            {licitacion.entidad_ruc && (
                                <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
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
                        <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">Ubicación</p>
                        <p className="text-[11px] font-bold text-slate-800 uppercase dark:text-slate-200">
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
                        <p className="text-[10px] text-slate-500 font-medium uppercase mb-1">Categoría</p>
                        {renderCategoryBadge()}
                    </div>
                </div>

                {/* 4. Monto */}
                <div className="flex gap-3">
                    <div className="w-4 flex justify-center pt-0.5 shrink-0">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">
                            {showExtendedDetails ? "Monto Adjudicado" : "Monto Estimado"}
                        </p>
                        <p className={`text-base font-extrabold ${showExtendedDetails ? 'text-emerald-600' : 'text-[#4F46E5]'} dark:text-indigo-400`}>
                            {formatCurrency(showExtendedDetails && licitacion.monto_total_adjudicado ? licitacion.monto_total_adjudicado : licitacion.monto_estimado, licitacion.moneda)}
                        </p>
                        {showExtendedDetails && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                                Estimado: {formatCurrency(licitacion.monto_estimado, licitacion.moneda)}
                            </p>
                        )}
                    </div>
                </div>

                {/* 5. Fechas */}
                <div className="flex gap-3">
                    <div className="w-4 flex justify-center pt-0.5 shrink-0">
                        <Calendar className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        {/* LOGIC: If Contract exists, show Adjudication (Main) AND Publication (Sub). Else, only Publication. */}
                        {licitacion.id_contrato && licitacion.fecha_adjudicacion ? (
                            <>
                                {/* PRIMARY: Adjudication Date */}
                                <div className="mb-1">
                                    <p className="text-[10px] text-emerald-600 font-bold uppercase mb-0.5">
                                        Fecha de Adjudicación
                                    </p>
                                    <p className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                        {formatDate(licitacion.fecha_adjudicacion)}
                                    </p>
                                </div>
                                {/* SECONDARY: Publication Date */}
                                <div>
                                    <p className="text-[9px] text-slate-400 font-medium uppercase">
                                        Fecha de Publicación: {formatDate(licitacion.fecha_publicacion)}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* ONLY Publication Date */}
                                <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">
                                    Fecha de Publicación
                                </p>
                                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                    {formatDate(licitacion.fecha_publicacion)}
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* 6. Identificadores */}
                <div className="flex gap-3">
                    <div className="w-4 flex justify-center pt-0.5 shrink-0">
                        <StickyNote className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">Identificadores</p>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-bold text-[#4F46E5] dark:text-indigo-400">
                                ID Contrato: {licitacion.id_contrato || "N/A"}
                            </span>
                            <span className={`text-[11px] ${!licitacion.id_contrato ? 'text-[#4F46E5] font-bold' : 'text-slate-600'}`}>
                                ID Convocatoria: {licitacion.id_convocatoria}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 8. Tipo de Garantia (EXTENDED) - MOVED TO FIRST POSITION */}
                {showExtendedDetails && (
                    <div className="flex gap-3">
                        <div className="w-4 flex justify-center pt-0.5 shrink-0">
                            {/* SHIELD Check Icon  */}
                            <ShieldCheck className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">Tipo de Garantía</p>
                            {renderGuaranteeBadges() || <p className="text-[10px] text-slate-400 italic">No especificada</p>}
                        </div>
                    </div>
                )}

                {/* 7. Ganador (EXTENDED - Always show structure if extended, N/A if missing) */}
                {showExtendedDetails && (
                    <div className="flex gap-3">
                        <div className="w-4 flex justify-center pt-0.5 shrink-0">
                            {/* USER ICON as requested */}
                            <User className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">Ganador</p>
                            <p className="text-[11px] font-bold text-slate-800 uppercase leading-tight line-clamp-2 dark:text-slate-200">
                                {licitacion.ganador_nombre || "NO INFORMADO"}
                            </p>
                            <p className="text-[10px] text-slate-500">
                                RUC Ganador: {licitacion.ganador_ruc || "N/A"}
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
                                            // Render from Objects (Preferred - shows clean names)
                                            licitacion.miembros_consorcio.map((miembro, idx) => (
                                                <span key={idx} className="text-[9px] text-slate-500 leading-tight font-medium uppercase truncate">
                                                    • {miembro.nombre_miembro}
                                                </span>
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

                {/* 10. Financiera (EXTENDED) */}
                {showExtendedDetails && (
                    <div className="flex gap-3">
                        <div className="w-4 flex justify-center pt-0.5 shrink-0">
                            <Landmark className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">Entidades Financieras</p>
                            {licitacion.entidades_financieras ? renderBankBadge() : <p className="text-[10px] text-slate-400 italic">No especificada</p>}
                        </div>
                    </div>
                )}

            </div>



            {/* FOOTER BUTTON - Full Width Block */}
            <div className="mt-4">
                {!showManualActions ? (
                    <Link
                        href={`${basePath}/${licitacion.id_convocatoria}`}
                        // Updated button color to match reference image (more vivid blue/purple)
                        className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] py-3.5 text-xs font-bold text-white hover:bg-[#4338ca] transition-colors rounded-b-xl"
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
    );
};
