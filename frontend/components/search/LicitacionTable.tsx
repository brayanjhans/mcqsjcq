"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Eye, Search, FileDown, Loader2 } from "lucide-react";
import type { Licitacion } from "@/types/licitacion";
import { LOGO_MQS_B64, LOGO_JCQ_B64 } from "@/lib/utils/pdfAssets";

interface Props {
    licitaciones: Licitacion[];
    searchTerm?: string;
    basePath?: string;
    onFetchAll?: () => Promise<Licitacion[]>;
    totalItems?: number;
    ruc?: string;
    entityName?: string;
}

export const LicitacionTable: React.FC<Props> = ({
    licitaciones,
    searchTerm,
    basePath = "/seace/busqueda",
    onFetchAll,
    totalItems,
    ruc,
    entityName,
}) => {
    const [exporting, setExporting] = useState(false);

    // FORMATTERS
    const MESES_ES = [
        '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return "N/A";

        // Normalize: strip time portion if present
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

        // Fallback – already text or unknown format
        return dateString;
    };

    const formatCurrency = (amount?: number, currency: string = "PEN") => {
        if (amount === undefined || amount === null) return "S/ N/A";
        return new Intl.NumberFormat("es-PE", { style: "currency", currency: currency || "PEN" }).format(amount);
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
                        part.toLowerCase() === highlight.toLowerCase()
                            ? <span key={i} className="bg-yellow-200 text-slate-900 px-0.5 rounded-sm dark:bg-yellow-500/30 dark:text-yellow-100 font-bold">{part}</span>
                            : part
                    )}
                </span>
            );
        } catch (e) {
            return text;
        }
    };

    // --- BUILD PDF from data array ---
    const buildPDF = async (data: Licitacion[]) => {
        const { default: jsPDF } = await import("jspdf");
        const autoTable = (await import("jspdf-autotable")).default;

        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

        const primaryColor: [number, number, number] = [30, 58, 138];
        const headerText: [number, number, number] = [255, 255, 255];
        const altRow: [number, number, number] = [245, 247, 255];
        const borderColor: [number, number, number] = [220, 220, 240];

        const pageW = doc.internal.pageSize.getWidth();
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageW, 18, "F");

        try {
            doc.addImage(LOGO_MQS_B64, 'PNG', 6, 2, 24, 14);
            doc.addImage(LOGO_JCQ_B64, 'PNG', pageW - 30, 2, 24, 14);
        } catch (e) {
            console.warn("Could not load logos into PDF", e);
        }

        let titleText = entityName || (searchTerm ? searchTerm.toUpperCase() : "BÚSQUEDA DE PROCEDIMIENTOS");
        
        // Ensure RUC is always labeled if present
        if (ruc) {
            if (entityName) {
                titleText = `${entityName} - RUC: ${ruc}`;
            } else if (ruc !== searchTerm) {
                titleText = `${titleText} - RUC: ${ruc}`;
            } else {
                titleText = `RUC: ${ruc}`;
            }
        }
        doc.setTextColor(...headerText);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(titleText, pageW / 2, 8, { align: "center" });

        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(
            `Generado: ${new Date().toLocaleString("es-PE")} | Total: ${data.length} registro(s)`,
            pageW / 2, 14, { align: "center" }
        );

        // ── Columnas con nombres completos ──
        const head = [["N°", "Entidad", "Nomenclatura", "Descripción", "Monto Estimado", "Monto Adjudicado", "Consorcio y Consorciado", "Datos del Contrato", "Fechas", "Aseguradora"]];

        const body = data.map((lic, idx) => {
            let ganador = lic.ganador_nombre || "";
            if (lic.miembros_consorcio && lic.miembros_consorcio.length > 0) {
                const miembros = lic.miembros_consorcio
                    .map((m: any) => `  - ${m.nombre_miembro}${m.ruc_miembro ? ` (${m.ruc_miembro})` : ""}${Number(m.porcentaje_participacion) > 0 ? ` (${Number(m.porcentaje_participacion).toFixed(1)}%)` : ""}`)
                    .join("\n");
                ganador += (ganador ? "\nMiembros:\n" : "Miembros:\n") + miembros;
            } else if (lic.nombres_consorciados) {
                const miembros = lic.nombres_consorciados.split("|")
                    .map((n: string) => `  - ${n.trim()}`)
                    .join("\n");
                ganador += (ganador ? "\nMiembros:\n" : "Miembros:\n") + miembros;
            }

            const montoAdj = (lic.estado_proceso?.toUpperCase().includes("CONTRATADO") ||
                lic.estado_proceso?.toUpperCase().includes("ADJUDICADO") ||
                lic.monto_total_adjudicado)
                ? formatCurrency(lic.monto_total_adjudicado || 0, lic.moneda)
                : "N/A";

            const primerMiembro = lic.miembros_consorcio?.find(m => m.fecha_firma_contrato || m.fecha_prevista_fin);
            let datosContrato = "N/A";
            if (primerMiembro) {
                const lines = [];
                if (primerMiembro.fecha_firma_contrato) lines.push(`Fecha de firma de contrato\n\n${formatDate(primerMiembro.fecha_firma_contrato)}`);
                if (primerMiembro.fecha_prevista_fin) lines.push(`Fecha prevista de fin de contrato\n\n${formatDate(primerMiembro.fecha_prevista_fin)}`);
                if (lines.length > 0) datosContrato = lines.join("\n\n");
            }

            return [
                idx + 1,
                lic.comprador || "",
                lic.nomenclatura || "S/N",
                lic.descripcion || "",
                formatCurrency(lic.monto_estimado, lic.moneda),
                montoAdj,
                ganador,
                datosContrato,
                `Conv: ${formatDate(lic.fecha_publicacion)}\nAdj: ${formatDate(lic.fecha_adjudicacion)}`,
                lic.entidades_financieras || "N/A",
            ];
        });

        autoTable(doc, {
            startY: 22,
            head,
            body,
            styles: {
                fontSize: 6.5,
                cellPadding: 2,
                overflow: "linebreak",
                valign: "top",
                lineColor: borderColor,
                lineWidth: 0.2,
                textColor: [30, 30, 50],
            },
            headStyles: {
                fillColor: primaryColor,
                textColor: headerText,
                fontStyle: "bold",
                fontSize: 7,
                halign: "center",
                valign: "middle",
            },
            alternateRowStyles: { fillColor: altRow },
            columnStyles: {
                0: { halign: "center", cellWidth: 7 },
                1: { cellWidth: 32, fontStyle: "bold" },
                2: { cellWidth: 23, fontStyle: "bold", textColor: [30, 58, 138] },
                3: { cellWidth: 32 },
                4: { halign: "right", cellWidth: 19 },
                5: { halign: "right", cellWidth: 19, textColor: [5, 150, 105] },
                6: { cellWidth: "auto" },
                7: { cellWidth: 28 },
                8: { halign: "left", cellWidth: 25 },
                9: { cellWidth: 16 },
            },
            margin: { left: 6, right: 6 },
            tableLineColor: borderColor,
            tableLineWidth: 0.2,
        });

        // Números de página
        const pageCount = (doc.internal as any).getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(6);
            doc.setTextColor(150);
            doc.text(`Página ${i} de ${pageCount}`, pageW - 8, doc.internal.pageSize.getHeight() - 4, { align: "right" });
        }

        const cleanSearch = searchTerm ? searchTerm.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30) : "procedimientos";
        const filename = ruc 
            ? `reporte_${cleanSearch}_${ruc}.pdf`
            : `reporte_${cleanSearch}.pdf`;

        doc.save(filename);
    };

    // --- EXPORT HANDLER ---
    const handleExportPDF = async () => {
        setExporting(true);
        try {
            // Si hay función para traer todos los datos, úsala; si no, usa los de la página actual
            const allData = onFetchAll ? await onFetchAll() : licitaciones;
            await buildPDF(allData);
        } catch (err) {
            console.error("Error al exportar PDF:", err);
            // Fallback: exportar solo los de la página actual
            await buildPDF(licitaciones);
        }
    };

    return (
                <div className="flex flex-col gap-4 animate-in fade-in duration-700">
            {/* Professional Export & Info Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
                        <Search className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex flex-col">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Resultados en tabla</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Mostrando <span className="font-black text-slate-900 dark:text-white tabular-nums">{licitaciones.length}</span>
                            {totalItems && totalItems > licitaciones.length
                                ? <> de <span className="font-black text-slate-900 dark:text-white tabular-nums">{totalItems.toLocaleString()}</span> encontrados</>
                                : <> registros en total</>
                            }
                        </p>
                    </div>
                </div>
                
                <button
                    onClick={handleExportPDF}
                    disabled={licitaciones.length === 0 || exporting}
                    className="group relative inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-rose-500/20 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none overflow-hidden"
                >
                    <div className="absolute inset-0 w-1/2 h-full skew-x-[-20deg] bg-white/10 -translate-x-full group-hover:translate-x-[250%] transition-transform duration-1000"></div>
                    {exporting
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
                        : <><FileDown className="w-4 h-4" /> Exportar PDF {totalItems && totalItems > licitaciones.length ? `(${totalItems})` : ""}</>
                    }
                </button>
            </div>

            {/* Table Container with Glass Effect */}
            <div className="w-full overflow-x-auto rounded-[2rem] border border-slate-200/60 dark:border-white/10 shadow-2xl bg-white dark:bg-[#0A192F] relative group/table">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 border-separate border-spacing-0">
                    <thead className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#172554] text-white uppercase font-black text-[10px] tracking-[0.15em] sticky top-0 z-20">
                        <tr>
                            <th className="px-5 py-6 text-center border-b border-white/10 first:rounded-tl-[2rem]">N°</th>
                            <th className="px-5 py-6 min-w-[150px] border-b border-white/10">Entidad</th>
                            <th className="px-5 py-6 min-w-[140px] border-b border-white/10">Nomenclatura</th>
                            <th className="px-5 py-6 min-w-[200px] border-b border-white/10">Descripción</th>
                            <th className="px-5 py-6 min-w-[120px] text-right border-b border-white/10">Monto Est.</th>
                            <th className="px-5 py-6 min-w-[120px] text-right border-b border-white/10">Monto Adj.</th>
                            <th className="px-5 py-6 min-w-[200px] border-b border-white/10">Adjudicatario</th>
                            <th className="px-5 py-6 min-w-[180px] border-b border-white/10">Cronograma</th>
                            <th className="px-5 py-6 min-w-[120px] border-b border-white/10">Fechas</th>
                            <th className="px-5 py-6 min-w-[120px] border-b border-white/10">Aseguradora</th>
                            <th className="px-5 py-6 text-center sticky right-0 bg-[#172554] border-b border-white/10 shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.3)] last:rounded-tr-[2rem]">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-transparent">
                        {licitaciones.map((lic, index) => (
                            <tr 
                                key={lic.id_convocatoria} 
                                className="group/row hover:bg-blue-50/40 dark:hover:bg-white/[0.03] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <td className="px-5 py-6 text-center font-black text-slate-400 dark:text-slate-500 tabular-nums border-r border-slate-100/50 dark:border-white/5 group-hover/row:text-blue-700 transition-colors">
                                    {String(index + 1).padStart(2, '0')}
                                </td>
                                <td className="px-5 py-6">
                                    <div className="text-[11px] font-black text-slate-800 dark:text-white uppercase leading-tight tracking-tight group-hover/row:translate-x-1 transition-transform">
                                        {getHighlightedText(lic.comprador, searchTerm)}
                                    </div>
                                </td>
                                <td className="px-5 py-6">
                                    <div className="inline-flex px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-[10px] font-black text-blue-800 dark:text-blue-400 uppercase tracking-tighter">
                                        {lic.nomenclatura ? getHighlightedText(lic.nomenclatura, searchTerm) : "SIN NOM."}
                                    </div>
                                </td>
                                <td className="px-5 py-6">
                                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed" title={lic.descripcion}>
                                        {getHighlightedText(lic.descripcion, searchTerm)}
                                    </span>
                                </td>
                                <td className="px-5 py-6 text-right">
                                    <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 tabular-nums">
                                        {formatCurrency(lic.monto_estimado, lic.moneda)}
                                    </span>
                                </td>
                                <td className="px-5 py-6 text-right">
                                    <span className={`text-[11px] font-black tabular-nums ${
                                        (lic.estado_proceso?.toUpperCase().includes("CONTRATADO") || lic.estado_proceso?.toUpperCase().includes("ADJUDICADO") || lic.monto_total_adjudicado)
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-slate-400 dark:text-slate-600'
                                    }`}>
                                        {(lic.estado_proceso?.toUpperCase().includes("CONTRATADO") || lic.estado_proceso?.toUpperCase().includes("ADJUDICADO") || lic.monto_total_adjudicado)
                                            ? formatCurrency(lic.monto_total_adjudicado || 0, lic.moneda)
                                            : "N/A"
                                        }
                                    </span>
                                </td>
                                <td className="px-5 py-6">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="text-[10px] font-black text-slate-800 dark:text-white uppercase leading-tight">
                                            {lic.ganador_nombre || <span className="text-slate-400 italic font-normal">No adjudicado</span>}
                                        </div>
                                        {((lic.miembros_consorcio && lic.miembros_consorcio.length > 0) || lic.nombres_consorciados) && (
                                            <div className="flex flex-wrap gap-1">
                                                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-600/5 px-1.5 rounded">Consorcio</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-5 py-6">
                                    {(() => {
                                        const primerMiembro = lic.miembros_consorcio?.find(m => m.fecha_firma_contrato || m.fecha_prevista_fin);
                                        if (!primerMiembro) return <span className="text-slate-400 italic text-[10px]">Sin datos</span>;
                                        return (
                                            <div className="flex flex-col gap-2">
                                                {primerMiembro.fecha_firma_contrato && (
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Firma</span>
                                                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{formatDate(primerMiembro.fecha_firma_contrato)}</span>
                                                    </div>
                                                )}
                                                {primerMiembro.fecha_prevista_fin && (
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Fin</span>
                                                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{formatDate(primerMiembro.fecha_prevista_fin)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </td>
                                <td className="px-5 py-6">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{formatDate(lic.fecha_publicacion)}</span>
                                        </div>
                                        {lic.fecha_adjudicacion && (
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{formatDate(lic.fecha_adjudicacion)}</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-5 py-6">
                                    <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                                        {lic.entidades_financieras ? getHighlightedText(lic.entidades_financieras, searchTerm) : <span className="text-slate-300 font-normal">N/A</span>}
                                    </div>
                                </td>
                                <td className="px-5 py-6 text-center sticky right-0 bg-white dark:bg-[#0A192F] shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.05)] border-l border-slate-100 dark:border-white/5 transition-colors group-hover/row:bg-blue-50/50 dark:group-hover/row:bg-white/[0.05]">
                                    <Link
                                        href={`${basePath}/${lic.id_convocatoria}`}
                                        className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#1e3a8a] to-[#172554] hover:from-[#1e40af] hover:to-[#1e3a8a] text-white rounded-xl transition-all duration-300 hover:rotate-12 shadow-lg hover:shadow-blue-900/40"
                                        title="Ver detalles"
                                    >


                                        <Eye className="w-5 h-5" />
                                    </Link>
                                </td>
                            </tr>
                        ))}

                        {licitaciones.length === 0 && (
                            <tr>
                                <td colSpan={11} className="px-5 py-32 text-center bg-slate-50/50 dark:bg-white/[0.01] rounded-b-[2rem]">
                                    <div className="flex flex-col items-center justify-center gap-4 max-w-md mx-auto">
                                        <div className="w-20 h-20 rounded-full bg-white dark:bg-white/5 shadow-xl flex items-center justify-center">
                                            <Search className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Sin resultados</p>
                                            <p className="text-sm text-slate-400">No hemos encontrado licitaciones que coincidan con tu búsqueda actual.</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
