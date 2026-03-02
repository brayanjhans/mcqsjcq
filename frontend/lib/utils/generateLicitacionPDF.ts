/**
 * Professional PDF Report Generator for Licitación Details.
 * Uses jsPDF + jspdf-autotable to produce an enterprise-quality report.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Licitacion, EjecucionFinanciera, GarantiasResponse } from '@/types/licitacion';
import { LOGO_MQS_B64, LOGO_JCQ_B64, PDF_ICON_B64 } from './pdfAssets';

// ── Color palette ──
const COLORS = {
    primary: [37, 99, 235] as [number, number, number],   // indigo-600
    dark: [15, 23, 42] as [number, number, number],    // slate-900
    medium: [100, 116, 139] as [number, number, number], // slate-500
    light: [241, 245, 249] as [number, number, number], // slate-100
    white: [255, 255, 255] as [number, number, number],
    accent: [16, 185, 129] as [number, number, number],  // emerald-500
    warning: [245, 158, 11] as [number, number, number],  // amber-500
    headerBg: [30, 41, 59] as [number, number, number],    // slate-800
    stripeBg: [248, 250, 252] as [number, number, number], // slate-50
};

const fmt = (n?: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n || 0);

const fmtDate = (d?: string) => {
    if (!d) return 'N/A';
    const iso = d.includes('T') ? d.split('T')[0] : d;
    const [y, m, day] = iso.split('-');
    return y && m && day ? `${day}/${m}/${y}` : 'N/A';
};

const fmtPct = (n?: number) => n != null ? `${n.toFixed(1)}%` : '—';

// ── Main export function ──
export function generateLicitacionPDF(
    licitacion: Licitacion,
    ejecucion: EjecucionFinanciera | null,
    garantias: GarantiasResponse | null,
) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = 0;

    // ─────────────────────────────────────────────────────
    // HELPER: Add page footer on every page
    // ─────────────────────────────────────────────────────
    const addFooter = () => {
        const pages = doc.getNumberOfPages();
        const now = new Date().toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' });
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(...COLORS.medium);
            doc.text(`Página ${i} de ${pages}`, pageW / 2, pageH - 8, { align: 'center' });
            doc.text(`Generado: ${now}`, margin, pageH - 8);
            doc.text('MQS JCQ — Sistema de Inteligencia SEACE', pageW - margin, pageH - 8, { align: 'right' });
            // Thin line above footer
            doc.setDrawColor(...COLORS.light);
            doc.setLineWidth(0.3);
            doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
        }
    };

    // ─────────────────────────────────────────────────────
    // HELPER: Check page break
    // ─────────────────────────────────────────────────────
    const checkPageBreak = (needed: number) => {
        if (y + needed > pageH - 20) {
            doc.addPage();
            y = 15;
        }
    };

    // ─────────────────────────────────────────────────────
    // HELPER: Section title with accent bar
    // ─────────────────────────────────────────────────────
    const sectionTitle = (title: string, color: [number, number, number] = COLORS.primary) => {
        checkPageBreak(14);
        doc.setFillColor(...color);
        doc.rect(margin, y, 3, 8, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.dark);
        doc.text(title.toUpperCase(), margin + 6, y + 6);
        y += 12;
    };

    // ─────────────────────────────────────────────────────
    // HELPER: Key-value row
    // ─────────────────────────────────────────────────────
    const kvRow = (label: string, value: string, x: number = margin, width: number = contentW) => {
        checkPageBreak(7);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.medium);
        doc.text(label, x, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.dark);
        const valX = x + width * 0.4;
        const lines = doc.splitTextToSize(value, width * 0.58);
        doc.text(lines, valX, y);
        y += Math.max(lines.length * 4, 5);
    };

    // ═══════════════════════════════════════════════════
    //  1. HEADER (white background, bold dark text)
    // ═══════════════════════════════════════════════════

    // Logo MQS on the left corner
    try {
        doc.addImage(LOGO_MQS_B64, 'PNG', margin, 2, 26, 26);
    } catch (e) { /* logo not available */ }

    // Logo JCQ on the right corner
    try {
        doc.addImage(LOGO_JCQ_B64, 'PNG', pageW - margin - 26, 2, 26, 26);
    } catch (e) { /* logo not available */ }

    // Title text (centered area between logos)
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('INFORME DE PROCESO', pageW / 2, 14, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.medium);
    doc.text(`Proceso ${licitacion.id_convocatoria}`, pageW / 2, 21, { align: 'center' });

    // System name and date below
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.medium);
    doc.text('MQS JCQ — Sistema de Inteligencia SEACE', pageW / 2, 27, { align: 'center' });

    const today = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.medium);
    doc.text(`Fecha de emisión: ${today}`, pageW / 2, 32, { align: 'center' });

    // Bottom border line
    doc.setDrawColor(...COLORS.dark);
    doc.setLineWidth(0.8);
    doc.line(margin, 36, pageW - margin, 36);

    y = 42;

    // ═══════════════════════════════════════════════════
    //  2. INFORMACIÓN DEL PROCESO
    // ═══════════════════════════════════════════════════
    sectionTitle('Información del Proceso');

    kvRow('N° Proceso:', licitacion.id_convocatoria || '—');
    kvRow('OCID:', licitacion.ocid || '—');
    kvRow('Estado:', licitacion.estado_proceso || '—');
    kvRow('Categoría:', licitacion.categoria || '—');
    kvRow('Nomenclatura:', licitacion.nomenclatura || '—');
    kvRow('Tipo Procedimiento:', licitacion.tipo_procedimiento || '—');
    kvRow('Fecha Publicación:', fmtDate(licitacion.fecha_publicacion));
    kvRow('Monto Estimado:', fmt(licitacion.monto_estimado));
    kvRow('Moneda:', licitacion.moneda || 'PEN');

    y += 3;

    // ═══════════════════════════════════════════════════
    //  3. DESCRIPCIÓN
    // ═══════════════════════════════════════════════════
    sectionTitle('Descripción del Objeto');
    checkPageBreak(20);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.dark);
    const descLines = doc.splitTextToSize(licitacion.descripcion || 'Sin descripción', contentW - 4);
    // Background box
    doc.setFillColor(...COLORS.light);
    doc.roundedRect(margin, y - 2, contentW, descLines.length * 4 + 6, 2, 2, 'F');
    doc.text(descLines, margin + 3, y + 3);
    y += descLines.length * 4 + 10;

    // ═══════════════════════════════════════════════════
    //  4. ENTIDAD CONVOCANTE
    // ═══════════════════════════════════════════════════
    sectionTitle('Entidad Convocante');
    kvRow('Entidad:', licitacion.comprador || '—');
    kvRow('Ubicación:', licitacion.ubicacion_completa || `${licitacion.departamento || '—'} / ${licitacion.provincia || '—'}`);
    y += 3;

    // ═══════════════════════════════════════════════════
    //  5. EJECUCIÓN FINANCIERA
    // ═══════════════════════════════════════════════════
    if (ejecucion && ejecucion.encontrado) {
        sectionTitle('Ejecución Financiera', COLORS.accent);

        const cuiLabel = ejecucion.cui ? `CUI: ${ejecucion.cui}` : '';
        const yearLabel = ejecucion.year_found ? `Año: ${ejecucion.year_found}` : '';
        if (cuiLabel || yearLabel) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(...COLORS.medium);
            doc.text([cuiLabel, yearLabel].filter(Boolean).join('  |  '), margin + 6, y);
            y += 6;
        }

        // Main financial table
        autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [['PIA', 'PIM', 'Certificación', 'Comp. Anual', 'Devengado', 'Girado', 'Avance']],
            body: [[
                fmt(ejecucion.pia),
                fmt(ejecucion.pim),
                fmt(ejecucion.certificado),
                fmt(ejecucion.compromiso_anual),
                fmt(ejecucion.devengado),
                fmt(ejecucion.girado),
                ejecucion.pim > 0 ? `${((ejecucion.devengado / ejecucion.pim) * 100).toFixed(1)}%` : '0%',
            ]],
            theme: 'grid',
            headStyles: {
                fillColor: COLORS.headerBg,
                textColor: COLORS.white,
                fontSize: 7,
                fontStyle: 'bold',
                halign: 'center',
            },
            bodyStyles: {
                fontSize: 8,
                textColor: COLORS.dark,
                halign: 'center',
            },
            columnStyles: {
                1: { fontStyle: 'bold' },
                4: { textColor: [37, 99, 235] },
                5: { textColor: [16, 185, 129] },
                6: { fontStyle: 'bold' },
            },
        });
        y = (doc as any).lastAutoTable.finalY + 6;

        // ── Historial anual ──
        if (ejecucion.historial && ejecucion.historial.length > 0) {
            checkPageBreak(20);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...COLORS.dark);
            doc.text('HISTORIAL DE EJECUCIÓN POR AÑO', margin + 6, y);
            y += 6;

            const histBody = ejecucion.historial.map((h: any) => [
                String(h.year),
                fmt(h.pia),
                fmt(h.pim),
                fmt(h.certificado),
                fmt(h.compromiso_anual),
                fmt(h.devengado),
                fmt(h.girado),
                fmtPct(h.avance_pct),
            ]);

            autoTable(doc, {
                startY: y,
                margin: { left: margin, right: margin },
                head: [['Año', 'PIA', 'PIM', 'Certificación', 'Comp. Anual', 'Devengado', 'Girado', 'Avance']],
                body: histBody,
                theme: 'striped',
                headStyles: {
                    fillColor: COLORS.headerBg,
                    textColor: COLORS.white,
                    fontSize: 7,
                    fontStyle: 'bold',
                    halign: 'center',
                },
                bodyStyles: {
                    fontSize: 7,
                    textColor: COLORS.dark,
                    halign: 'center',
                },
                alternateRowStyles: {
                    fillColor: COLORS.stripeBg,
                },
                columnStyles: {
                    0: { fontStyle: 'bold', halign: 'center' },
                    2: { fontStyle: 'bold' },
                    7: { fontStyle: 'bold' },
                },
            });
            y = (doc as any).lastAutoTable.finalY + 6;
        }
    } else {
        sectionTitle('Ejecución Financiera', COLORS.warning);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...COLORS.medium);
        doc.text('No se encontraron datos de ejecución financiera para este proceso.', margin + 6, y);
        y += 8;
    }

    // ═══════════════════════════════════════════════════
    //  6. ADJUDICACIONES Y GARANTÍAS
    // ═══════════════════════════════════════════════════
    const adjudicaciones = licitacion.adjudicaciones || [];
    if (adjudicaciones.length > 0) {
        sectionTitle('Adjudicaciones y Garantías', [16, 185, 129]);

        const adjBody = adjudicaciones.map((adj: any) => [
            adj.ganador_nombre || '—',
            adj.ganador_ruc || '—',
            fmt(adj.monto_adjudicado),
            (adj.tipo_garantia || licitacion.tipo_garantia || 'SIN GARANTÍA').replace(/_/g, ' '),
            adj.entidad_financiera || licitacion.entidades_financieras || '—',
            fmtDate(adj.fecha_adjudicacion),
            adj.estado_item || 'VIGENTE',
        ]);

        autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [['Ganador', 'RUC', 'Monto Adjudicado', 'Garantía', 'Emisor', 'Fecha', 'Estado']],
            body: adjBody,
            theme: 'grid',
            headStyles: {
                fillColor: COLORS.headerBg,
                textColor: COLORS.white,
                fontSize: 7,
                fontStyle: 'bold',
                halign: 'center',
            },
            bodyStyles: {
                fontSize: 7,
                textColor: COLORS.dark,
                halign: 'center',
                cellPadding: 3,
            },
            columnStyles: {
                0: { halign: 'left', fontStyle: 'bold', cellWidth: 35 },
                2: { fontStyle: 'bold', textColor: [37, 99, 235] },
            },
        });
        y = (doc as any).lastAutoTable.finalY + 6;

        // ── Consorcios ──
        const withConsorcios = adjudicaciones.filter((a: any) => a.consorcios && a.consorcios.length > 0);
        if (withConsorcios.length > 0) {
            checkPageBreak(20);
            sectionTitle('Integrantes de Consorcios', [139, 92, 246]);

            const consBody: string[][] = [];
            withConsorcios.forEach((adj: any) => {
                adj.consorcios.forEach((m: any, i: number) => {
                    consBody.push([
                        i === 0 ? (adj.ganador_nombre || '—') : '',
                        m.nombre_miembro || '—',
                        m.ruc_miembro || '—',
                        m.porcentaje_participacion ? `${Number(m.porcentaje_participacion)}%` : '—',
                    ]);
                });
            });

            autoTable(doc, {
                startY: y,
                margin: { left: margin, right: margin },
                head: [['Adjudicación', 'Miembro', 'RUC', 'Participación']],
                body: consBody,
                theme: 'striped',
                headStyles: {
                    fillColor: COLORS.headerBg,
                    textColor: COLORS.white,
                    fontSize: 7,
                    fontStyle: 'bold',
                    halign: 'center',
                },
                bodyStyles: {
                    fontSize: 7,
                    textColor: COLORS.dark,
                    halign: 'center',
                },
                alternateRowStyles: {
                    fillColor: COLORS.stripeBg,
                },
                columnStyles: {
                    0: { halign: 'left', fontStyle: 'bold', cellWidth: 45 },
                    1: { halign: 'left' },
                },
            });
            y = (doc as any).lastAutoTable.finalY + 6;
        }

        // ── Documentación Contractual (with PDF icons) ──
        checkPageBreak(20);
        sectionTitle('Documentación Contractual', [139, 92, 246]);

        // Use empty strings for cells where we'll draw icons
        const docBody: string[][] = [];
        adjudicaciones.forEach((adj: any) => {
            docBody.push([
                adj.ganador_nombre || '—',
                adj.url_pdf_contrato ? '' : 'No disponible',
                adj.url_pdf_consorcio ? '' : 'No disponible',
                adj.url_pdf_cartafianza ? '' : 'No disponible',
            ]);
        });

        autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [['Ganador', 'Contrato', 'Consorcio', 'Fianza']],
            body: docBody,
            theme: 'grid',
            headStyles: {
                fillColor: COLORS.headerBg,
                textColor: COLORS.white,
                fontSize: 7,
                fontStyle: 'bold',
                halign: 'center',
            },
            bodyStyles: {
                fontSize: 7,
                textColor: COLORS.medium,
                halign: 'center',
                cellPadding: 4,
                minCellHeight: 14,
            },
            columnStyles: {
                0: { halign: 'left', fontStyle: 'bold', cellWidth: 45, textColor: COLORS.dark },
            },
            didDrawCell: (data: any) => {
                if (data.section === 'body' && data.column.index >= 1) {
                    const adj = adjudicaciones[data.row.index];
                    let url = '';
                    if (data.column.index === 1) url = adj?.url_pdf_contrato || '';
                    if (data.column.index === 2) url = adj?.url_pdf_consorcio || '';
                    if (data.column.index === 3) url = adj?.url_pdf_cartafianza || '';
                    if (url) {
                        try {
                            const iconW = 7;
                            const iconH = 7;
                            const iconX = data.cell.x + (data.cell.width - iconW) / 2;
                            const iconY = data.cell.y + (data.cell.height - iconH) / 2;
                            doc.addImage(PDF_ICON_B64, 'PNG', iconX, iconY, iconW, iconH);
                            doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
                        } catch (e) { /* icon not available */ }
                    }
                }
            },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
    }

    // ═══════════════════════════════════════════════════
    //  7. GARANTÍAS OCDS (si hay)
    // ═══════════════════════════════════════════════════
    if (garantias && garantias.garantias && garantias.garantias.length > 0) {
        checkPageBreak(20);
        sectionTitle('Detalle de Garantías (OSCE)', [139, 92, 246]);

        const garBody = garantias.garantias.map((g: any) => [
            g.tipo || '—',
            g.monto_garantizado ? fmt(g.monto_garantizado) : '—',
            fmtDate(g.fecha_emision),
            fmtDate(g.fecha_vencimiento),
            g.dias_restantes != null ? `${g.dias_restantes} días` : '—',
            (g.estado || '—').toUpperCase(),
        ]);

        autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [['Tipo', 'Monto', 'Emisión', 'Vencimiento', 'Días Rest.', 'Estado']],
            body: garBody,
            theme: 'grid',
            headStyles: {
                fillColor: COLORS.headerBg,
                textColor: COLORS.white,
                fontSize: 7,
                fontStyle: 'bold',
                halign: 'center',
            },
            bodyStyles: {
                fontSize: 7,
                textColor: COLORS.dark,
                halign: 'center',
            },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
    }

    // ═══════════════════════════════════════════════════
    //  8. RESUMEN EJECUTIVO (bottom box)
    // ═══════════════════════════════════════════════════
    checkPageBreak(25);
    y += 2;
    doc.setFillColor(...COLORS.light);
    doc.roundedRect(margin, y, contentW, 18, 2, 2, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('RESUMEN EJECUTIVO', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.medium);

    const col1x = margin + 4;
    const col2x = margin + contentW * 0.35;
    const col3x = margin + contentW * 0.7;

    doc.text(`Monto Estimado: ${fmt(licitacion.monto_estimado)}`, col1x, y + 11);
    doc.text(`Monto Adjudicado: ${fmt(licitacion.monto_total_adjudicado)}`, col2x, y + 11);
    doc.text(`Total Adjudicaciones: ${adjudicaciones.length}`, col3x, y + 11);

    if (ejecucion?.encontrado) {
        doc.text(`PIM: ${fmt(ejecucion.pim)}`, col1x, y + 15);
        doc.text(`Devengado: ${fmt(ejecucion.devengado)}`, col2x, y + 15);
        const avance = ejecucion.pim > 0 ? ((ejecucion.devengado / ejecucion.pim) * 100).toFixed(1) : '0';
        doc.text(`Avance: ${avance}%`, col3x, y + 15);
    }

    // ── Footer on all pages ──
    addFooter();

    // ── Save ──
    doc.save(`Informe_Proceso_${licitacion.id_convocatoria}.pdf`);
}
