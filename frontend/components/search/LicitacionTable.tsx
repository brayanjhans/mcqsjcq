"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Eye, Search, FileDown, Loader2 } from "lucide-react";
import type { Licitacion } from "@/types/licitacion";

interface Props {
    licitaciones: Licitacion[];
    searchTerm?: string;
    basePath?: string;
    onFetchAll?: () => Promise<Licitacion[]>;
    totalItems?: number;
}

export const LicitacionTable: React.FC<Props> = ({
    licitaciones,
    searchTerm,
    basePath = "/seace/busqueda",
    onFetchAll,
    totalItems,
}) => {
    const [exporting, setExporting] = useState(false);

    // FORMATTERS
    const formatDate = (dateString?: string) => {
        if (!dateString) return "N/A";
        if (dateString.includes('T')) {
            const dateOnly = dateString.split('T')[0];
            const [year, month, day] = dateOnly.split('-');
            return `${day}/${month}/${year}`;
        }
        const [year, month, day] = dateString.split('-');
        if (year && month && day) return `${day}/${month}/${year}`;
        return new Date(dateString).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
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

        const titleText = searchTerm ? searchTerm.toUpperCase() : "BÚSQUEDA DE PROCEDIMIENTOS";
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
        const head = [["N°", "Entidad", "Nomenclatura", "Descripción", "Monto Estimado", "Monto Adjudicado", "Consorcio y Consorciado", "Fecha Convocatoria", "Fecha Adjudicación", "Aseguradora"]];

        const body = data.map((lic, idx) => {
            let ganador = lic.ganador_nombre || "";
            if (lic.miembros_consorcio && lic.miembros_consorcio.length > 0) {
                const miembros = lic.miembros_consorcio
                    .map((m: any) => `  - ${m.nombre_miembro}${m.ruc_miembro ? ` (${m.ruc_miembro})` : ""}`)
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

            return [
                idx + 1,
                lic.comprador || "",
                lic.nomenclatura || "S/N",
                lic.descripcion || "",
                formatCurrency(lic.monto_estimado, lic.moneda),
                montoAdj,
                ganador,
                formatDate(lic.fecha_publicacion),
                formatDate(lic.fecha_adjudicacion),
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
                1: { cellWidth: 35, fontStyle: "bold" },
                2: { cellWidth: 26, fontStyle: "bold", textColor: [30, 58, 138] },
                3: { cellWidth: 36 },
                4: { halign: "right", cellWidth: 22 },
                5: { halign: "right", cellWidth: 22, textColor: [5, 150, 105] },
                6: { cellWidth: "auto" },
                7: { halign: "center", cellWidth: 19 },
                8: { halign: "center", cellWidth: 19 },
                9: { cellWidth: 22 },
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

        const filename = searchTerm
            ? `reporte_${searchTerm.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)}.pdf`
            : "reporte_procedimientos.pdf";

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
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            {/* Export Bar */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mostrando <span className="font-bold text-slate-700 dark:text-slate-200">{licitaciones.length}</span>
                    {totalItems && totalItems > licitaciones.length
                        ? <> de <span className="font-bold text-slate-700 dark:text-slate-200">{totalItems}</span> resultado(s)</>
                        : <> resultado(s)</>
                    }
                    {searchTerm && <> para <span className="font-bold text-indigo-600 dark:text-indigo-400">"{searchTerm}"</span></>}
                </p>
                <button
                    onClick={handleExportPDF}
                    disabled={licitaciones.length === 0 || exporting}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                    {exporting
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generando PDF...</>
                        : <><FileDown className="w-3.5 h-3.5" /> Exportar PDF {totalItems && totalItems > licitaciones.length ? `(${totalItems} registros)` : ""}</>
                    }
                </button>
            </div>

            {/* Table */}
            <div className="w-full overflow-x-auto rounded-xl border border-slate-200 shadow-sm dark:border-white/10 dark:bg-[#111c44]">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 border-separate border-spacing-0">
                    <thead className="bg-[#1e3a8a] text-white uppercase font-extrabold text-[11px] tracking-wider sticky top-0 dark:bg-indigo-600 relative">
                        <tr>
                            <th className="px-2.5 py-2.5 whitespace-nowrap text-center rounded-tl-xl border-b-2 border-[#1e3a8a] dark:border-indigo-700 text-[10px]">N°</th>
                            <th className="px-2.5 py-2.5 min-w-[120px] max-w-[160px] whitespace-normal border-b-2 border-[#1e3a8a] dark:border-indigo-700 text-[10px]">Entidad</th>
                            <th className="px-2.5 py-2.5 min-w-[110px] max-w-[150px] whitespace-normal border-b-2 border-[#1e3a8a] dark:border-indigo-700 text-[10px]">Nomenclatura</th>
                            <th className="px-2.5 py-2.5 min-w-[160px] border-b-2 border-[#1e3a8a] dark:border-indigo-700 text-[10px]">Descripción</th>
                            <th className="px-2.5 py-2.5 min-w-[100px] whitespace-nowrap text-right border-b-2 border-[#1e3a8a] dark:border-indigo-700 text-[10px]">Monto Est.</th>
                            <th className="px-2.5 py-2.5 min-w-[100px] whitespace-nowrap text-right border-b-2 border-[#1e3a8a] dark:border-indigo-700 text-[10px]">Monto Adj.</th>
                            <th className="px-2.5 py-2.5 min-w-[150px] max-w-[200px] whitespace-normal border-b-2 border-[#1e3a8a] dark:border-indigo-700 text-[10px]">Consorcio y Consorciado</th>
                            <th className="px-2.5 py-2.5 min-w-[90px] border-b-2 border-[#1e3a8a] dark:border-indigo-700 text-[10px]">Fecha</th>
                            <th className="px-2.5 py-2.5 min-w-[90px] border-b-2 border-[#1e3a8a] dark:border-indigo-700 text-[10px]">Aseguradora</th>
                            <th className="px-2.5 py-2.5 text-center sticky right-0 bg-[#1e3a8a] dark:bg-indigo-600 z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)] rounded-tr-xl border-b-2 border-[#1e3a8a] dark:border-indigo-700 text-[10px]">Acciones</th>
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
                                <td className="px-2.5 py-2.5 text-[11px] font-bold text-[#1e3a8a] uppercase leading-tight dark:text-indigo-400">
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
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-lg font-bold transition-all shadow-sm"
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
        </div>
    );
};
