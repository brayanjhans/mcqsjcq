/**
 * Professional PDF Report Generator for Licitación Details.
 * Uses jsPDF + jspdf-autotable to produce an enterprise-quality report.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Licitacion, EjecucionFinanciera, GarantiasResponse, InfobrasData } from '@/types/licitacion';
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
    infoobras: [2, 132, 199] as [number, number, number], // light-blue-600
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
    infobras: InfobrasData | null = null,
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

    const drawPDFIcon = (doc: any, cellX: number, cellY: number, cellW: number, cellH: number, url: string) => {
        const w = 9;
        const h = 12;
        const cx = cellX + cellW / 2 - w / 2;
        const cy = cellY + cellH / 2 - h / 2;

        try {
            doc.addImage(PDF_ICON_B64, 'PNG', cx, cy, w, h);
        } catch (error) {
            doc.setFillColor(220, 38, 38);
            doc.roundedRect(cx, cy, w, h, 1, 1, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(4.5);
            doc.setTextColor(255, 255, 255);
            doc.text('PDF', cx + w / 2, cy + h - 2, { align: 'center' });
        }
        doc.link(cellX, cellY, cellW, cellH, { url: url });
    };

    // ═══════════════════════════════════════════════
    //  1. HEADER WITH LOGOS
    // ═══════════════════════════════════════════════
    // Blue Banner Background for white logos
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageW, 32, 'F');

    const logoSize = 18;

    // Left logo (MQS)
    try { doc.addImage(LOGO_MQS_B64, 'PNG', margin, 7, logoSize, logoSize); } catch (_) { }

    // Right logo (JCQ)
    try { doc.addImage(LOGO_JCQ_B64, 'PNG', pageW - margin - logoSize, 7, logoSize, logoSize); } catch (_) { }

    // Centered title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.white);
    doc.text(`INFORME DE PROCESO N° ${licitacion.id_convocatoria}`, pageW / 2, 14, { align: 'center' });

    // Subtitle
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 230, 255);
    doc.text('MQS JCQ — Sistema de Inteligencia SEACE', pageW / 2, 20, { align: 'center' });

    // Date
    const today = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.setFontSize(7);
    doc.setTextColor(200, 215, 255);
    doc.text(`Fecha de emisión: ${today}`, pageW / 2, 25, { align: 'center' });

    y = 38;

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


        // ── Documentación Contractual (links) ──
        checkPageBreak(25);
        sectionTitle('Documentación Contractual', [139, 92, 246]);

        const docBody: string[][] = [];
        adjudicaciones.forEach((adj: any) => {
            docBody.push([
                adj.ganador_nombre || '—',
                adj.url_pdf_oferta ? '' : '',
                adj.url_pdf_contrato ? '' : '',
                adj.url_pdf_consorcio ? '' : '',
                adj.url_pdf_cartafianza ? '' : '',
            ]);
        });

        autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [['Ganador', 'Oferta PDF', 'Contrato PDF', 'Consorcio PDF', 'Fianza PDF']],
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
                textColor: COLORS.dark,
                halign: 'center',
                valign: 'middle',
                minCellHeight: 18, // Needs space for icon
            },
            columnStyles: {
                0: { halign: 'left', fontStyle: 'bold', cellWidth: 45 },
            },
            didDrawCell: (data: any) => {
                if (data.section === 'body' && data.column.index >= 1) {
                    const adj = adjudicaciones[data.row.index];
                    let url = '';
                    if (data.column.index === 1) url = adj?.url_pdf_oferta || '';
                    if (data.column.index === 2) url = adj?.url_pdf_contrato || '';
                    if (data.column.index === 3) url = adj?.url_pdf_consorcio || '';
                    if (data.column.index === 4) url = adj?.url_pdf_cartafianza || '';

                    if (url) {
                        drawPDFIcon(doc, data.cell.x, data.cell.y, data.cell.width, data.cell.height, url);
                    }
                }
            },
        });
        y = (doc as any).lastAutoTable.finalY + 8;

        // ── Fianzas y Pagaré (links) ──
        checkPageBreak(25);
        sectionTitle('Fianzas y Pagaré', [16, 185, 129]);


        const fianzaBody: string[][] = [];
        adjudicaciones.forEach((adj: any) => {
            fianzaBody.push([
                adj.ganador_nombre || '—',
                adj.fiel_cumplimiento ? '' : '',
                adj.adelanto_materiales ? '' : '',
                adj.adelanto_directo ? '' : '',
                adj.doc_completo ? '' : '',
            ]);
        });

        autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [['Adjudicación / Ganador', 'Fiel Cumplimiento', 'Adelanto Materiales', 'Adelanto Directo', 'Doc Completo']],
            body: fianzaBody,
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
                valign: 'middle',
                minCellHeight: 18,
            },
            columnStyles: {
                0: { halign: 'left', fontStyle: 'bold', cellWidth: 45 },
            },
            didDrawCell: (data: any) => {
                if (data.section === 'body' && data.column.index >= 1) {
                    const adj = adjudicaciones[data.row.index];
                    let url = '';
                    if (data.column.index === 1) url = adj?.fiel_cumplimiento || '';
                    if (data.column.index === 2) url = adj?.adelanto_materiales || '';
                    if (data.column.index === 3) url = adj?.adelanto_directo || '';
                    if (data.column.index === 4) url = adj?.doc_completo || '';

                    if (url) {
                        drawPDFIcon(doc, data.cell.x, data.cell.y, data.cell.width, data.cell.height, url);
                    }
                }
            },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
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
    //  8. AVANCE FÍSICO (INFOBRAS) - MOVED TO END
    // ═══════════════════════════════════════════════════
    if (infobras) {
        sectionTitle('Avance Físico y Contraloría (INFOBRAS)', COLORS.infoobras);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.medium);
        doc.text(`CUI: ${licitacion.cui || '—'}  |  Obra Id: ${infobras.obra_id_infobras}`, margin + 6, y);
        y += 6;

        // Metadata grid for Infobras
        const infoGrid = [
            ['Contratista:', infobras.contratista || '—', 'Modalidad:', infobras.modalidad || '—'],
            ['Estado:', infobras.estado_ejecucion || '—', 'Contrato:', infobras.contrato_desc || '—'],
            ['Inicio:', infobras.fecha_inicio || '—', 'Fin (Estimado):', infobras.fecha_fin || '—'],
            ['Costo Viable:', infobras.costo_viable || '—', 'Costo Actualizado:', infobras.costo_actualizado || '—'],
            ['Resolución:', infobras.pdf_resolucion ? 'Ver Documento' : 'No registrada', '', '']
        ];

        autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            body: infoGrid,
            theme: 'plain',
            styles: { fontSize: 7, cellPadding: 1.5 },
            columnStyles: {
                0: { fontStyle: 'bold', textColor: COLORS.medium, cellWidth: 25 },
                1: { textColor: COLORS.dark, cellWidth: 60, minCellHeight: 12 },
                2: { fontStyle: 'bold', textColor: COLORS.medium, cellWidth: 25 },
                3: { textColor: COLORS.dark },
            },
            didDrawCell: (data: any) => {
                if (data.section === 'body' && data.row.index === 4 && data.column.index === 1 && infobras.pdf_resolucion && infobras.pdf_resolucion !== "-") {
                    const finalUrl = infobras.pdf_resolucion.startsWith('http') ? infobras.pdf_resolucion : `https://infobras.contraloria.gob.pe${infobras.pdf_resolucion}`;
                    drawPDFIcon(doc, data.cell.x, data.cell.y, data.cell.width, data.cell.height, finalUrl);
                }
            },
        });

        y = (doc as any).lastAutoTable.finalY + 6;

        // ── Nueva Sección: Documentación Técnica y Legal ──
        const extraDocs = [
            { label: 'Acta Terreno', url: infobras.pdf_acta_terreno },
            { label: 'Crono. Obra', url: infobras.pdf_cronograma },
            { label: 'Resol. Contrato', url: infobras.pdf_resolucion_contrato },
            { label: 'Design. Superv.', url: infobras.pdf_designacion_supervisor },
            { label: 'Susp. de Plazo', url: infobras.pdf_suspension_plazo },
            { label: 'Inf. de Control', url: infobras.pdf_informe_control }
        ].filter(d => d.url && d.url !== "-");

        if (extraDocs.length > 0) {
            checkPageBreak(30);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...COLORS.dark);
            doc.text('DOCUMENTACIÓN TÉCNICA Y LEGAL (INFOBRAS)', margin + 6, y);
            y += 5;

            const docRows: string[][] = [];
            // Group by 3 columns
            for (let i = 0; i < extraDocs.length; i += 3) {
                const row = extraDocs.slice(i, i + 3);
                docRows.push(row.map(d => d.label));
            }

            autoTable(doc, {
                startY: y,
                margin: { left: margin, right: margin },
                body: docRows,
                theme: 'grid',
                styles: { 
                    fontSize: 7, 
                    halign: 'center', 
                    valign: 'middle', 
                    minCellHeight: 15,
                    textColor: COLORS.medium 
                },
                columnStyles: {
                    0: { cellWidth: contentW / 3 },
                    1: { cellWidth: contentW / 3 },
                    2: { cellWidth: contentW / 3 },
                },
                didDrawCell: (data: any) => {
                    if (data.section === 'body') {
                        const idx = data.row.index * 3 + data.column.index;
                        if (idx < extraDocs.length) {
                            const d = extraDocs[idx];
                            // Draw icon above text or shift text down
                            // We use the cell center for the icon
                            drawPDFIcon(doc, data.cell.x, data.cell.y - 2, data.cell.width, data.cell.height, d.url!);
                        }
                    }
                }
            });
            y = (doc as any).lastAutoTable.finalY + 8;
        }

        // Monthly Valorizations Table
        if (infobras.valorizaciones && infobras.valorizaciones.length > 0) {
            checkPageBreak(25);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...COLORS.dark);
            doc.text('HISTORIAL DE VALORIZACIONES MENSUALES', margin + 6, y);
            y += 5;

            // Sort valorizaciones: "MES AÑO" to date descending
            const monthMap: { [key: string]: number } = {
                'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4, 'MAYO': 5, 'JUNIO': 6,
                'JULIO': 7, 'AGOSTO': 8, 'SETIEMBRE': 9, 'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
            };

            const sortedVals = [...infobras.valorizaciones].sort((a, b) => {
                const partsA = a.periodo.split(' ');
                const partsB = b.periodo.split(' ');
                const yearA = parseInt(partsA[1]) || 0;
                const yearB = parseInt(partsB[1]) || 0;
                const monthA = monthMap[partsA[0].toUpperCase()] || 0;
                const monthB = monthMap[partsB[0].toUpperCase()] || 0;

                return (yearB * 100 + monthB) - (yearA * 100 + monthA);
            });

            const valBody = sortedVals.map(v => [
                v.periodo,
                v.avance_fisico_prog,
                v.avance_fisico_real,
                v.avance_val_prog,
                v.avance_val_real,
                v.monto_ejecucion_fin,
                v.estado
            ]);

            autoTable(doc, {
                startY: y,
                margin: { left: margin, right: margin },
                head: [['Periodo', 'Fis. Prog', 'Fis. Real', 'Val. Prog', 'Val. Real', 'Monto Ej. Fin', 'Estado']],
                body: valBody,
                theme: 'striped',
                headStyles: {
                    fillColor: COLORS.infoobras,
                    textColor: COLORS.white,
                    fontSize: 7,
                    fontStyle: 'bold',
                    halign: 'center',
                },
                bodyStyles: {
                    fontSize: 6.5,
                    textColor: COLORS.dark,
                    halign: 'center',
                },
                columnStyles: {
                    0: { fontStyle: 'bold', halign: 'left' },
                    5: { textColor: COLORS.primary, fontStyle: 'bold' },
                    6: { fontSize: 6 }
                },
            });
            y = (doc as any).lastAutoTable.finalY + 8;
        }
    }

    // ═══════════════════════════════════════════════════
    //  9. RESUMEN EJECUTIVO (bottom box)
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
