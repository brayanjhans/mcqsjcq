"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Eye, Search, FileDown, Loader2, FileText, Users } from "lucide-react";
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
    const [exportingExcel, setExportingExcel] = useState(false);

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
        } finally {
            setExporting(false);
        }
    };

    // --- BUILD EXCEL ---
    const buildExcel = async (data: Licitacion[]) => {
        const ExcelJS = (await import("exceljs")).default || await import("exceljs");
        
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'SEACE Inteligente';
        workbook.created = new Date();
        const worksheet = workbook.addWorksheet('Licitaciones', {
            views: [{ state: 'frozen', ySplit: 6 }] // Freeze después de cabeceras (fila 6)
        });

        // Styles
        const headerColor = 'FF1e3a8a';
        const textColor = 'FF303a4b';
        const borderColor = 'FFdcdcf0';

        // 1. Cabecera Corporativa — misma lógica exacta que buildPDF
        let titleText = entityName || (searchTerm ? searchTerm.toUpperCase() : "BÚSQUEDA DE PROCEDIMIENTOS");
        if (ruc) {
            if (entityName) {
                titleText = `${entityName} - RUC: ${ruc}`;
            } else if (ruc !== searchTerm) {
                titleText = `${titleText} - RUC: ${ruc}`;
            } else {
                titleText = `RUC: ${ruc}`;
            }
        }

        // Fila 1-3: fondo azul combinado (3 filas × 24px = 72px)
        worksheet.mergeCells('A1:J3');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = titleText;
        titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

        // Altura de las 3 filas del header (3x17 = 51px)
        [1, 2, 3].forEach(r => { worksheet.getRow(r).height = 17; });

        // Logos: 51px total. Para margen de 15px arriba, el logo debe ser de 36px (15+36=51)
        // Offset: 15 / 17 = 0.88 filas
        try {
            const mqsId = workbook.addImage({ base64: LOGO_MQS_B64.replace('data:image/png;base64,', ''), extension: 'png' });
            worksheet.addImage(mqsId, {
                tl: { col: 1.2, row: 0.88 },
                ext: { width: 50, height: 36 },
                editAs: 'oneCell'
            });
        } catch (_) {}
        try {
            const jcqId = workbook.addImage({ base64: LOGO_JCQ_B64.replace('data:image/png;base64,', ''), extension: 'png' });
            worksheet.addImage(jcqId, {
                tl: { col: 9.15, row: 0.88 },
                ext: { width: 50, height: 36 },
                editAs: 'oneCell'
            });
        } catch (_) {}

        // Fila 4: Metadata (fecha / total)
        worksheet.mergeCells('A4:J4');
        const metaCell = worksheet.getCell('A4');
        metaCell.value = `Generado: ${new Date().toLocaleString("es-PE")} | Total: ${data.length} registro(s)`;
        metaCell.font = { name: 'Arial', size: 9, color: { argb: 'FF555555' } };
        metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
        metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(4).height = 16;

        worksheet.addRow([]); // Fila 5 vacía separadora

        // 2. Cabeceras de Tabla (fila 6)
        const headerRow = worksheet.addRow(["N°", "Entidad", "Nomenclatura", "Descripción", "Monto Estimado", "Monto Adjudicado", "Consorcio y Consorciado", "Datos del Contrato", "Fechas", "Aseguradora"]);
        headerRow.eachCell((cell) => {
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin', color: { argb: borderColor } },
                bottom: { style: 'thin', color: { argb: borderColor } },
                left: { style: 'thin', color: { argb: borderColor } },
                right: { style: 'thin', color: { argb: borderColor } }
            };
        });
        headerRow.height = 25;

        // Anchos de columna
        worksheet.columns = [
            { width: 5 },   // N°
            { width: 35 },  // Entidad
            { width: 25 },  // Nomenclatura
            { width: 45 },  // Descripcion
            { width: 18 },  // Monto Est
            { width: 18 },  // Monto Adj
            { width: 50 },  // Consorcio
            { width: 25 },  // Contrato
            { width: 25 },  // Fechas
            { width: 20 },  // Aseguradora
        ];

        // 3. Insertar Datos
        data.forEach((lic, idx) => {
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
                ? (lic.monto_total_adjudicado || 0)
                : "N/A";
            
            const montoEst = lic.monto_estimado || 0;

            const primerMiembro = lic.miembros_consorcio?.find(m => m.fecha_firma_contrato || m.fecha_prevista_fin);
            let datosContrato = "N/A";
            if (primerMiembro) {
                const lines = [];
                if (primerMiembro.fecha_firma_contrato) lines.push(`Fecha de firma de contrato\n${formatDate(primerMiembro.fecha_firma_contrato)}`);
                if (primerMiembro.fecha_prevista_fin) lines.push(`Fecha prevista de fin de contrato\n${formatDate(primerMiembro.fecha_prevista_fin)}`);
                if (lines.length > 0) datosContrato = lines.join("\n\n");
            }

            const row = worksheet.addRow([
                idx + 1,
                lic.comprador || "",
                lic.nomenclatura || "S/N",
                lic.descripcion || "",
                montoEst,
                montoAdj,
                ganador,
                datosContrato,
                `Conv: ${formatDate(lic.fecha_publicacion)}\nAdj: ${formatDate(lic.fecha_adjudicacion)}`,
                lic.entidades_financieras || "N/A"
            ]);

            // Estilos de la fila
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.font = { name: 'Arial', size: 9, color: { argb: textColor } };
                cell.border = {
                    top: { style: 'thin', color: { argb: borderColor } },
                    bottom: { style: 'thin', color: { argb: borderColor } },
                    left: { style: 'thin', color: { argb: borderColor } },
                    right: { style: 'thin', color: { argb: borderColor } }
                };
                
                // Alineación Wrap y Top
                let hAlign: 'left'|'center'|'right' = 'left';
                if (colNumber === 1 || colNumber === 9) hAlign = 'center';
                if (colNumber === 5 || colNumber === 6) hAlign = 'right';

                cell.alignment = { vertical: 'top', horizontal: hAlign, wrapText: true };

                // Filas alternas (Cebra)
                if (idx % 2 !== 0) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FF' } };
                }

                // Montos color y formato
                if (colNumber === 5) {
                    if (typeof cell.value === 'number') cell.numFmt = '"S/" #,##0.00';
                }
                if (colNumber === 6) {
                    if (typeof cell.value === 'number') {
                        cell.numFmt = '"S/" #,##0.00';
                        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF059669' } }; // Verde
                    }
                }
                if (colNumber === 3) {
                    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1e3a8a' } }; // Azul nomenclatura
                }
            });
        });

        worksheet.autoFilter = 'A6:J6';

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const cleanFileSearch = searchTerm ? searchTerm.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30) : "procedimientos";
        const filename = ruc 
            ? `reporte_${cleanFileSearch}_${ruc}.xlsx`
            : `reporte_${cleanFileSearch}.xlsx`;

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const handleExportExcel = async () => {
        setExportingExcel(true);
        try {
            const allData = onFetchAll ? await onFetchAll() : licitaciones;
            await buildExcel(allData);
        } catch (err) {
            console.error("Error al exportar Excel:", err);
            await buildExcel(licitaciones);
        } finally {
            setExportingExcel(false);
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
                
                <div className="flex gap-2">
                    <button
                        onClick={handleExportExcel}
                        disabled={licitaciones.length === 0 || exportingExcel}
                        className="group relative inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none overflow-hidden"
                    >
                        <div className="absolute inset-0 w-1/2 h-full skew-x-[-20deg] bg-white/10 -translate-x-full group-hover:translate-x-[250%] transition-transform duration-1000"></div>
                        {exportingExcel
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
                            : <><FileDown className="w-4 h-4" /> Exportar Excel {totalItems && totalItems > licitaciones.length ? `(${totalItems})` : ""}</>
                        }
                    </button>
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
                            <th className="px-5 py-6 min-w-[160px] text-center border-b border-white/10">Documentos</th>
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
                                        {lic.miembros_consorcio && lic.miembros_consorcio.length > 0 ? (
                                            <div className="flex flex-col gap-1 mt-1">
                                                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-600/5 px-1.5 rounded self-start">Consorcio</span>
                                                {lic.miembros_consorcio.map((m: any, i: number) => (
                                                    <div key={i} className="text-[9px] font-medium text-slate-500 dark:text-slate-400 flex flex-col border-b border-slate-100 dark:border-white/5 last:border-0 pb-1 last:pb-0">
                                                        <span className="line-clamp-2 leading-tight" title={m.nombre_miembro}>{m.nombre_miembro}</span>
                                                        {m.porcentaje_participacion ? <span className="font-bold text-slate-700 dark:text-slate-300">{m.porcentaje_participacion}%</span> : null}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : lic.nombres_consorciados ? (
                                            <div className="flex flex-col gap-1 mt-1">
                                                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-600/5 px-1.5 rounded self-start">Consorcio</span>
                                                <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 line-clamp-2" title={lic.nombres_consorciados}>{lic.nombres_consorciados}</span>
                                            </div>
                                        ) : null}
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
                                <td className="px-5 py-6">
                                    <div className="flex flex-col gap-2">
                                        {lic.url_pdf_contrato && (
                                            <a 
                                                href={lic.url_pdf_contrato} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all text-[10px] font-bold uppercase tracking-tight shadow-sm hover:shadow-md"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                <span>Contrato</span>
                                            </a>
                                        )}
                                        {lic.url_pdf_consorcio && (
                                            <a 
                                                href={lic.url_pdf_consorcio} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all text-[10px] font-bold uppercase tracking-tight shadow-sm hover:shadow-md"
                                            >
                                                <Users className="w-3.5 h-3.5" />
                                                <span>Consorcio</span>
                                            </a>
                                        )}
                                        {!lic.url_pdf_contrato && !lic.url_pdf_consorcio && (
                                            <div className="flex items-center justify-center py-2 px-3 rounded-lg border border-dashed border-slate-200 dark:border-white/5">
                                                <span className="text-[10px] text-slate-400 italic">Sin documentos</span>
                                            </div>
                                        )}
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
                                <td colSpan={12} className="px-5 py-32 text-center bg-slate-50/50 dark:bg-white/[0.01] rounded-b-[2rem]">
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
