import React from "react";
import Link from "next/link";
import { Eye, Search } from "lucide-react";
import type { Licitacion } from "@/types/licitacion";

interface Props {
    licitaciones: Licitacion[];
    searchTerm?: string;
    basePath?: string;
}

export const LicitacionTable: React.FC<Props> = ({
    licitaciones,
    searchTerm,
    basePath = "/seace/busqueda",
}) => {
    // FORMATTERS
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

    const getHighlightedText = (text: string | null | undefined, highlight: string | undefined): React.ReactNode => {
        if (!text) return "";
        if (!highlight || highlight.length < 2) return text;
        try {
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

    return (
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200 shadow-sm dark:border-white/10 dark:bg-[#111c44]">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 border-separate border-spacing-0">
                <thead className="bg-[#4F46E5] text-white uppercase font-extrabold text-[11px] tracking-wider sticky top-0 dark:bg-indigo-600 relative">
                    <tr>
                        <th className="px-2.5 py-2.5 whitespace-nowrap text-center rounded-tl-xl border-b-2 border-[#4338ca] dark:border-indigo-700 text-[10px]">N°</th>
                        <th className="px-2.5 py-2.5 min-w-[120px] max-w-[160px] whitespace-normal border-b-2 border-[#4338ca] dark:border-indigo-700 text-[10px]">Entidad</th>
                        <th className="px-2.5 py-2.5 min-w-[110px] max-w-[150px] whitespace-normal border-b-2 border-[#4338ca] dark:border-indigo-700 text-[10px]">Nomenclatura</th>
                        <th className="px-2.5 py-2.5 min-w-[160px] border-b-2 border-[#4338ca] dark:border-indigo-700 text-[10px]">Descripción</th>
                        <th className="px-2.5 py-2.5 min-w-[100px] whitespace-nowrap text-right border-b-2 border-[#4338ca] dark:border-indigo-700 text-[10px]">Monto Est.</th>
                        <th className="px-2.5 py-2.5 min-w-[100px] whitespace-nowrap text-right border-b-2 border-[#4338ca] dark:border-indigo-700 text-[10px]">Monto Adj.</th>
                        <th className="px-2.5 py-2.5 min-w-[150px] max-w-[200px] whitespace-normal border-b-2 border-[#4338ca] dark:border-indigo-700 text-[10px]">Consorcio y Consorciado</th>
                        <th className="px-2.5 py-2.5 min-w-[90px] border-b-2 border-[#4338ca] dark:border-indigo-700 text-[10px]">Fecha</th>
                        <th className="px-2.5 py-2.5 min-w-[90px] border-b-2 border-[#4338ca] dark:border-indigo-700 text-[10px]">Aseguradora</th>
                        <th className="px-2.5 py-2.5 text-center sticky right-0 bg-[#4F46E5] dark:bg-indigo-600 z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)] rounded-tr-xl border-b-2 border-[#4338ca] dark:border-indigo-700 text-[10px]">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-white/5 dark:bg-[#111c44]">
                    {licitaciones.map((lic, index) => (
                        <tr key={lic.id_convocatoria} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <td className="px-2.5 py-2.5 text-center font-medium text-slate-900 dark:text-white border-r border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                {index + 1}
                            </td>
                            
                            <td className="px-2.5 py-2.5 text-[11px] font-bold text-slate-800 uppercase leading-snug dark:text-slate-200">
                                {getHighlightedText(lic.comprador, searchTerm)}
                            </td>
                            
                            <td className="px-2.5 py-2.5 text-[11px] font-bold text-[#4F46E5] uppercase leading-tight dark:text-indigo-400">
                                {lic.nomenclatura ? getHighlightedText(lic.nomenclatura, searchTerm) : "SIN NOMENCLATURA"}
                            </td>
                            
                            <td className="px-2.5 py-2.5 text-[10px] text-slate-600 dark:text-slate-400">
                                <span className="line-clamp-3" title={lic.descripcion}>
                                    {getHighlightedText(lic.descripcion, searchTerm)}
                                </span>
                            </td>
                            
                            <td className="px-2.5 py-2.5 text-right">
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                    {formatCurrency(lic.monto_estimado, lic.moneda)}
                                </span>
                            </td>
                            
                            <td className="px-2.5 py-2.5 text-right">
                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                    {(lic.estado_proceso?.toUpperCase().includes("CONTRATADO") || lic.estado_proceso?.toUpperCase().includes("ADJUDICADO") || lic.monto_total_adjudicado) 
                                        ? formatCurrency(lic.monto_total_adjudicado || 0, lic.moneda) 
                                        : "N/A"
                                    }
                                </span>
                            </td>
                            
                            <td className="px-2.5 py-2.5">
                                <div className="flex flex-col gap-1 text-[10px]">
                                    <div className="font-bold text-slate-800 uppercase dark:text-slate-200">
                                        {lic.ganador_nombre || "N/A"}
                                    </div>
                                    {/* Mostrar Consorciados si hay */}
                                    {((lic.miembros_consorcio && lic.miembros_consorcio.length > 0) || lic.nombres_consorciados) && (
                                        <div className="mt-0.5 border-l-2 border-indigo-200 pl-2">
                                            <span className="font-bold text-indigo-600 font-xs">Miembros:</span>
                                            {lic.miembros_consorcio && lic.miembros_consorcio.length > 0 ? (
                                                lic.miembros_consorcio.map((m, i) => (
                                                    <div key={i} className="text-slate-500 truncate" title={m.nombre_miembro}>
                                                        - {m.nombre_miembro} {m.ruc_miembro ? `(${m.ruc_miembro})` : ''}
                                                    </div>
                                                ))
                                            ) : (
                                                lic.nombres_consorciados?.split('|').map((n, i) => (
                                                    <div key={i} className="text-slate-500 truncate" title={n}>
                                                        - {n}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </td>
                            
                            <td className="px-2.5 py-2.5 text-[10px]">
                                <div className="flex flex-col gap-1">
                                    <div>
                                        <span className="font-medium text-slate-500">Conv: </span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(lic.fecha_publicacion)}</span>
                                    </div>
                                    {lic.fecha_adjudicacion && (
                                        <div>
                                            <span className="font-medium text-emerald-600">Adj: </span>
                                            <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatDate(lic.fecha_adjudicacion)}</span>
                                        </div>
                                    )}
                                </div>
                            </td>
                            
                            <td className="px-2.5 py-2.5 text-[10px] uppercase">
                                {lic.entidades_financieras ? (
                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                        {getHighlightedText(lic.entidades_financieras, searchTerm)}
                                    </span>
                                ) : (
                                    <span className="text-slate-400 italic">N/A</span>
                                )}
                            </td>
                            
                            <td className="px-2.5 py-2.5 text-center sticky right-0 bg-white shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)] text-[10px] dark:bg-[#111c44] border-l border-slate-100 dark:border-white/5">
                                <Link
                                    href={`${basePath}/${lic.id_convocatoria}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4F46E5] hover:bg-[#4338ca] text-white rounded-lg font-bold transition-all shadow-sm"
                                >
                                    <Eye className="w-3 h-3" />
                                    <span>Detalles</span>
                                </Link>
                            </td>
                        </tr>
                    ))}
                    
                    {licitaciones.length === 0 && (
                        <tr>
                            <td colSpan={10} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <Search className="w-8 h-8 text-slate-300" />
                                    <span>No se encontraron resultados para mostrar en la tabla.</span>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
