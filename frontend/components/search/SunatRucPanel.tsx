"use client";

import React, { useState } from "react";
import {
    X,
    Building2,
    MapPin,
    FileText,
    AlertTriangle,
    Users,
    RefreshCw,
    ChevronDown,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    FileDown,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/formatters";
import { LOGO_MQS_B64 } from "@/lib/utils/pdfAssets";

interface SunatData {
    encontrado: boolean;
    ruc: string;
    razon_social: string;
    tipo_contribuyente: string;
    nombre_comercial: string;
    estado_contribuyente: string;
    condicion_contribuyente: string;
    domicilio_fiscal: string;
    actividades_economicas: string[] | string;
    comprobantes_pago: string[] | string;
    sistema_emision: string;
    sistema_contabilidad: string;
    actividad_comercio_exterior: string;
    sistema_emision_electronica: string;
    fecha_inscripcion: string;
    fecha_inicio_actividades: string;
    emisor_electronico_desde: string;
    padrones: string;
    deuda_coactiva: any[];
    representantes_legales: any[];
    fecha_consulta: string;
    fuente?: string;
    nombre_en_bd?: string;
    fuente_busqueda?: string;
    error?: string;
}

interface Props {
    data: SunatData | SunatData[];
    onClose: () => void;
    onRefresh?: (ruc: string) => void;
    isRefreshing?: boolean;
}

type TabId = "datos" | "deuda" | "representantes";

const TABS: { id: TabId; label: string; icon: React.ReactNode; color: string; gradient: string }[] = [
    { 
        id: "datos", 
        label: "Datos SUNAT", 
        icon: <Building2 className="w-4 h-4" />,
        color: "text-indigo-600",
        gradient: "from-indigo-600 to-violet-600"
    },
    { 
        id: "deuda", 
        label: "Deuda Coactiva", 
        icon: <AlertTriangle className="w-4 h-4" />,
        color: "text-blue-600",
        gradient: "from-blue-500 to-cyan-600"
    },
    { 
        id: "representantes", 
        label: "Representante Legal", 
        icon: <Users className="w-4 h-4" />,
        color: "text-emerald-600",
        gradient: "from-emerald-500 to-teal-600"
    },
];

function EstadoBadge({ estado }: { estado: string }) {
    const upper = (estado || "").toUpperCase();
    if (upper === "ACTIVO") {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-sm shadow-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVO
            </span>
        );
    }
    if (upper === "BAJA" || upper.includes("BAJA")) {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-sm shadow-rose-500/20">
                <XCircle className="w-3.5 h-3.5" /> {upper}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-500 text-white shadow-sm shadow-slate-500/20">
            <Clock className="w-3.5 h-3.5" /> {upper || "N/A"}
        </span>
    );
}

function CondicionBadge({ condicion }: { condicion: string }) {
    const upper = (condicion || "").toUpperCase();
    if (upper === "HABIDO") {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-500 text-white shadow-sm shadow-indigo-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> HABIDO
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-orange-500 text-white shadow-sm shadow-orange-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> {upper || "N/A"}
        </span>
    );
}

function SourceBadge({ source }: { source?: string }) {
    if (!source) return null;
    const s = source.toLowerCase();
    if (s === "entidad") return <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-orange-100 text-orange-600 border border-orange-200 uppercase">Entidad</span>;
    if (s === "ganador" || s === "proveedor") return <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-100 text-emerald-600 border border-emerald-200 uppercase">Proveedor</span>;
    if (s === "consorcio") return <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-purple-100 text-purple-600 border border-purple-200 uppercase">Consorcio</span>;
    return null;
}

function InfoRow({ label, value }: { label: string; value: string | React.ReactNode }) {
    if (!value) return null;
    return (
        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-slate-100 dark:border-white/5 last:border-b-0">
            <span className="text-[13px] font-extrabold text-slate-600 dark:text-slate-300 sm:w-52 shrink-0 uppercase tracking-wide">
                {label}
            </span>
            <span className="text-[15px] text-slate-900 dark:text-slate-100 break-words leading-relaxed">
                {value}
            </span>
        </div>
    );
}

function SingleRucPanel({
    data,
    activeTab,
    setActiveTab,
    onRefresh,
    isRefreshing,
}: {
    data: SunatData;
    activeTab: TabId;
    setActiveTab: (t: TabId) => void;
    onRefresh?: (ruc: string) => void;
    isRefreshing?: boolean;
}) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            const { default: jsPDF } = await import("jspdf");
            const autoTable = (await import("jspdf-autotable")).default;

            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            
            // Generate Report ID with actual RUC to avoid confusion
            const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(8, 12);
            const reportId = `REP-${data.ruc}-${timestamp}`;
            
            // Helper for QR Code
            const fetchQrDataUrl = async (text: string) => {
                const url = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text)}`;
                const response = await fetch(url);
                const blob = await response.blob();
                return new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            };

            const sunatUrl = `https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/FrameCriterioBusquedaWeb.jsp?nroRuc=${data.ruc}`;
            const qrCodeData = await fetchQrDataUrl(sunatUrl);
            // ... (rest of the code below was fine but replacing in chunks)

            // Colors
            const sunatBlue: [number, number, number] = [30, 58, 138];
            const activeGreenBg: [number, number, number] = [209, 250, 229];
            const activeGreenText: [number, number, number] = [6, 95, 70];
            const habidoBlueBg: [number, number, number] = [219, 234, 254];
            const habidoBlueText: [number, number, number] = [30, 64, 175];
            const textGray: [number, number, number] = [107, 114, 128];
            const textDark: [number, number, number] = [31, 41, 55];
            const borderColor: [number, number, number] = [229, 231, 235];
            const lineGray: [number, number, number] = [241, 245, 249];

            // 1. --- HEADER ---
            doc.setFillColor(...sunatBlue);
            doc.roundedRect(14, 14, 12, 10, 1, 1, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(5.5);
            doc.text("SUNAT", 15.5, 20.5);

            doc.setTextColor(...sunatBlue);
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text("REPORTE OFICIAL DEL CONTRIBUYENTE", 30, 18);
            
            doc.setTextColor(...textDark);
            doc.setFontSize(24);
            doc.text("CONSULTA RUC", 30, 26);

            // 1.1 --- SYSTEM LOGO (TOP RIGHT) ---
            doc.addImage(LOGO_MQS_B64, "PNG", pageW - 32, 14, 18, 18);

            doc.setTextColor(...textGray);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            const genDate = new Date().toLocaleString("es-PE", { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            doc.text(`Generado el ${genDate}`, 30, 31.5);

            let currentY = 40;

            // 2. --- ENTITY CARD ---
            doc.setDrawColor(...borderColor);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(14, currentY, pageW - 28, 55, 4, 4, "DF");

            // Badges
            let badgeX = 20;
            // RUC
            const rucT = `RUC: ${data.ruc}`;
            doc.setFillColor(...sunatBlue);
            doc.roundedRect(badgeX, currentY + 6, doc.getTextWidth(rucT) + 6, 6, 3, 3, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8.5);
            doc.setFont("helvetica", "bold");
            doc.text(rucT, badgeX + 3, currentY + 10.5);
            badgeX += doc.getTextWidth(rucT) + 12;

            // Status
            const stText = (data.estado_contribuyente || "ACTIVO").toUpperCase();
            doc.setFillColor(...activeGreenBg);
            doc.roundedRect(badgeX, currentY + 6, doc.getTextWidth(stText) + 8, 6, 3, 3, "F");
            doc.setTextColor(...activeGreenText);
            doc.text(stText, badgeX + 4, currentY + 10.5);
            badgeX += doc.getTextWidth(stText) + 12;

            // Condition
            const condT = (data.condicion_contribuyente || "HABIDO").toUpperCase();
            doc.setFillColor(...habidoBlueBg);
            doc.roundedRect(badgeX, currentY + 6, doc.getTextWidth(condT) + 8, 6, 3, 3, "F");
            doc.setTextColor(...habidoBlueText);
            doc.text(condT, badgeX + 4, currentY + 10.5);

            // QR Code in Card
            doc.addImage(qrCodeData, "PNG", pageW - 48, currentY + 10, 28, 28);
            doc.link(pageW - 48, currentY + 10, 28, 28, { url: sunatUrl });

            // Reason Social
            doc.setTextColor(...textDark);
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            const displayName = data.razon_social || "SIN RAZÓN SOCIAL";
            const splitName = doc.splitTextToSize(displayName, 110);
            doc.text(splitName, 20, currentY + 24);
            
            const cardInnerY = currentY + 24 + (splitName.length * 8);

            // Details with Icons (simulated with labels)
            doc.setTextColor(...textGray);
            doc.setFontSize(7.5);
            doc.text("DOMICILIO FISCAL", 20, cardInnerY + 4);
            doc.text("ACTIVIDAD ECONÓMICA", pageW / 2 + 10, cardInnerY + 4);

            doc.setTextColor(...textDark);
            doc.setFontSize(8.5);
            doc.setFont("helvetica", "normal");
            const splitDom = doc.splitTextToSize(data.domicilio_fiscal || "-", 80);
            doc.text(splitDom, 20, cardInnerY + 9);

            const actText = Array.isArray(data.actividades_economicas) ? data.actividades_economicas.join(", ") : (data.actividades_economicas || "-");
            const splitAct = doc.splitTextToSize(actText, 70);
            doc.text(splitAct, pageW / 2 + 10, cardInnerY + 9);

            currentY = Math.max(cardInnerY + 9 + (splitDom.length * 4), cardInnerY + 9 + (splitAct.length * 4)) + 15;

            // 3. --- DEUDA COACTIVA ---
            doc.setTextColor(...textDark);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("DETALLE DE DEUDA COACTIVA", 14, currentY);
            
            const deudasArr = Array.isArray(data.deuda_coactiva) ? data.deuda_coactiva : [];
            doc.setTextColor(...textGray);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text(`${deudasArr.length} REGISTROS`, pageW - 14, currentY, { align: "right" });

            const totalSum = deudasArr.reduce((acc, d) => acc + (Number(d.monto) || 0), 0);

            autoTable(doc, {
                startY: currentY + 4,
                head: [["ENTIDAD ACREEDORA", "PERIODO", "FECHA INICIO", "MONTO (S/)"]],
                body: deudasArr.length > 0 ? deudasArr.map(d => [
                    (d.entidad_asociada || d.entidad || "SUNAT").toUpperCase(),
                    d.periodo_tributario || d.periodo || d.codigo || "-",
                    d.fecha_inicio_cobranza || d.fecha_inicio || d.fecha || "-",
                    { content: (Number(d.monto) || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 }), styles: { fontStyle: "bold" } }
                ]) : [["No registra deuda coactiva vigente.", "", "", ""]],
                theme: "plain",
                headStyles: { fillColor: [255, 255, 255], textColor: textGray, fontSize: 8, fontStyle: "bold", cellPadding: 4 },
                styles: { fontSize: 9, cellPadding: 5, textColor: textDark, valign: "middle" },
                columnStyles: { 3: { halign: "right" } },
                margin: { left: 14, right: 14 },
                didDrawPage: (data) => {
                    doc.setDrawColor(...lineGray);
                    doc.line(14, data.cursor!.y, pageW - 14, data.cursor!.y);
                }
            });

            currentY = (doc as any).lastAutoTable.finalY + 8;

            if (deudasArr.length > 0) {
                const totalVal = `S/ ${totalSum.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
                
                doc.setTextColor(...textGray);
                doc.setFontSize(9);
                doc.setFont("helvetica", "bold");
                // Safest approach: Label on the left, value on the right
                doc.text("TOTAL ACUMULADO EXIGIBLE", 14, currentY + 4);

                doc.setTextColor(...habidoBlueText);
                doc.setFontSize(18);
                doc.text(totalVal, pageW - 14, currentY + 4, { align: "right" });
                currentY += 15;
            }

            // 4. --- REPRESENTANTES LEGALES ---
            doc.setTextColor(...textDark);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("REPRESENTANTES LEGALES", 14, currentY);
            currentY += 8;

            const representatives = Array.isArray(data.representantes_legales) ? data.representantes_legales : [];
            const repCardW = (pageW - 32) / 2;
            const repCardH = 32;

            representatives.slice(0, 4).forEach((r, idx) => {
                const row = Math.floor(idx / 2);
                const col = idx % 2;
                const rx = 14 + (col * (repCardW + 4));
                const ry = currentY + (row * (repCardH + 4));

                if (ry + repCardH > pageH - 45) return;

                doc.setFillColor(255, 255, 255);
                doc.setDrawColor(...borderColor);
                doc.roundedRect(rx, ry, repCardW, repCardH, 3, 3, "DF");

                // --- GENDER-BASED AVATAR ---
                const firstName = (r.nombre || "").split(",")[0]?.split(" ")[0]?.toUpperCase() || "";
                const femaleNames = ["MARIA", "ANA", "ELENA", "LUZ", "ROSA", "CARMEN", "JUANA", "SILVIA", "PATRICIA", "MERCEDES", "BEATRIZ"];
                const isFemale = femaleNames.some(fn => firstName.includes(fn)) || firstName.endsWith("A");
                
                const avX = rx + 11;
                const avY = ry + 11;
                doc.setFillColor(241, 245, 249);
                doc.circle(avX, avY, 7, "F"); // Background circle
                
                doc.setFillColor(...textGray);
                if (isFemale) {
                    // Drawing a simple female silhouette
                    doc.circle(avX, avY - 1.5, 2.2, "F"); // Head
                    doc.triangle(avX - 3.5, avY + 4.5, avX + 3.5, avY + 4.5, avX, avY + 1, "F"); // Body (dress style)
                } else {
                    // Drawing a simple male silhouette
                    doc.circle(avX, avY - 1.5, 2.3, "F"); // Head
                    doc.roundedRect(avX - 3.5, avY + 1.5, 7, 3.5, 1, 1, "F"); // Shoulders
                }

                // --- Info ---
                doc.setTextColor(...textDark);
                doc.setFontSize(9);
                doc.setFont("helvetica", "bold");
                const rName = doc.splitTextToSize(r.nombre || "-", repCardW - 25);
                doc.text(rName, rx + 22, ry + 8);

                const rCargo = (r.cargo || "REPRESENTANTE").toUpperCase();
                doc.setFillColor(...habidoBlueBg);
                doc.roundedRect(rx + 22, ry + 10, doc.getTextWidth(rCargo) + 4, 4, 1, 1, "F");
                doc.setTextColor(...habidoBlueText);
                doc.setFontSize(6.5);
                doc.text(rCargo, rx + 24, ry + 13);

                doc.setTextColor(...textGray);
                doc.setFontSize(7);
                doc.setFont("helvetica", "bold");
                doc.text("DNI", rx + 22, ry + 22);
                doc.text("VIGENCIA", rx + 45, ry + 22);
                
                doc.setTextColor(...textDark);
                doc.setFont("helvetica", "normal");
                doc.text(r.numero_de_documento || "-", rx + 22, ry + 26);
                doc.text(formatDate(r.fecha_desde), rx + 45, ry + 26);
            });

            // 5. --- FOOTER / VERIFICATION ---
            const fY = pageH - 45;
            doc.addImage(qrCodeData, "PNG", 20, fY, 25, 25);
            doc.link(20, fY, 25, 25, { url: sunatUrl });

            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(...borderColor);
            doc.roundedRect(55, fY, pageW - 75, 25, 3, 3, "DF");
            
            doc.setTextColor(...sunatBlue);
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("VERIFICACIÓN Y SEGURIDAD", 62, fY + 8);
            
            doc.setTextColor(...textGray);
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "normal");
            const footerNote = `Este reporte tiene carácter oficial. La integridad del documento puede verificarse escaneando el código QR o ingresando el ID del reporte ${reportId} en mcqs-jcq.com.`;
            doc.text(doc.splitTextToSize(footerNote, pageW - 90), 62, fY + 14);

            doc.setFontSize(7);
            doc.text(`© ${new Date().getFullYear()} SUNAT - REPÚBLICA DEL PERÚ`, pageW / 2, pageH - 10, { align: "center" });

            doc.save(`Reporte_Oficial_SUNAT_${data.ruc}.pdf`);

        } catch (error) {
            console.error("Error generating SUNAT PDF:", error);
            alert("Error al generar el PDF. Verifica tu conexión.");
        } finally {
            setIsExporting(false);
        }
    };
    const actividades = Array.isArray(data.actividades_economicas)
        ? data.actividades_economicas
        : typeof data.actividades_economicas === "string" && data.actividades_economicas
            ? [data.actividades_economicas]
            : [];

    const deudas = Array.isArray(data.deuda_coactiva) ? data.deuda_coactiva : [];
    const representantes = Array.isArray(data.representantes_legales) ? data.representantes_legales : [];

    return (
        <div>
            {/* Header with RUC, Name, Status */}
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white truncate">
                            {data.razon_social || "Sin Razón Social"}
                        </h3>
                        <EstadoBadge estado={data.estado_contribuyente} />
                        <CondicionBadge condicion={data.condicion_contribuyente} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        RUC: <span className="font-bold text-slate-700 dark:text-slate-300">{data.ruc}</span>
                        {data.tipo_contribuyente && (
                            <> · <span className="text-slate-600 dark:text-slate-400">{data.tipo_contribuyente}</span></>
                        )}
                        {data.fuente === "cache" && (
                            <span className="ml-2 text-xs text-slate-400">(caché)</span>
                        )}
                    </p>
                    {data.nombre_en_bd && (
                        <p className="mt-0.5 text-xs text-indigo-600 dark:text-indigo-400">
                            Encontrado en BD como: {data.nombre_en_bd} ({data.fuente_busqueda})
                        </p>
                    )}
                </div>
                {onRefresh && (
                    <div className="flex items-center gap-2">
                         <button
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-[11px] font-black text-white transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 active:scale-95"
                        >
                            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                            EXPORTAR PDF
                        </button>
                        <button
                            onClick={() => onRefresh(data.ruc)}
                            disabled={isRefreshing}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-[11px] font-black text-white transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 active:scale-95"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                            ACTUALIZAR
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl">
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all flex-1 justify-center relative overflow-hidden group ${
                                isActive
                                    ? `bg-gradient-to-br ${tab.gradient} text-white shadow-lg shadow-indigo-500/20`
                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10"
                            }`}
                        >
                            <span className={`${isActive ? "text-white" : tab.color}`}>
                                {tab.icon}
                            </span>
                            <span className="hidden sm:inline uppercase tracking-tighter">{tab.label}</span>
                            {isActive && (
                                <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in duration-200">
                {activeTab === "datos" && (
                    <div className="space-y-0">
                        <InfoRow label="Número de RUC" value={data.ruc} />
                        <InfoRow label="Razón Social" value={data.razon_social} />
                        <InfoRow 
                            label="Estado" 
                            value={
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                    data.estado_contribuyente === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                    {data.estado_contribuyente || "-"}
                                </span>
                            } 
                        />
                        <InfoRow 
                            label="Condición" 
                            value={
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                    data.condicion_contribuyente === 'HABIDO' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                    {data.condicion_contribuyente || "-"}
                                </span>
                            } 
                        />
                        <InfoRow
                            label="Domicilio Fiscal"
                            value={
                                data.domicilio_fiscal ? (
                                    <span className="flex items-start gap-1.5 leading-relaxed font-medium">
                                        <MapPin className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                        {data.domicilio_fiscal}
                                    </span>
                                ) : "-"
                            }
                        />
                    </div>
                )}

                {activeTab === "deuda" && (
                    <div>
                        {deudas.length > 0 ? (
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-white/5">
                                            <th className="px-4 py-3 text-left text-[13px] font-extrabold uppercase text-slate-600 dark:text-slate-300">Monto</th>
                                            <th className="px-4 py-3 text-left text-[13px] font-extrabold uppercase text-slate-600 dark:text-slate-300">Período</th>
                                            <th className="px-4 py-3 text-left text-[13px] font-extrabold uppercase text-slate-600 dark:text-slate-300">Fecha Inicio</th>
                                            <th className="px-4 py-3 text-left text-[13px] font-extrabold uppercase text-slate-600 dark:text-slate-300">Entidad</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {deudas.map((d: any, i: number) => (
                                            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                                <td className="px-4 py-3 text-[14px] font-bold text-slate-900 dark:text-white">
                                                    {d.monto ? `S/ ${Number(d.monto).toLocaleString("es-PE", { minimumFractionDigits: 2 })}` : "-"}
                                                </td>
                                                <td className="px-4 py-3 text-[14px] text-slate-800 dark:text-slate-200">
                                                    {d.periodo_tributario || d.periodo || d.codigo || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-[13px] text-slate-700 dark:text-slate-300 text-nowrap">
                                                    {d.fecha_inicio_cobranza || d.fecha_inicio || d.fecha || "-"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2.5 py-1 rounded-full text-[12px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                        {d.entidad_asociada || d.entidad || "-"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
                                <p className="text-[15px] font-bold text-slate-700 dark:text-slate-200">Sin deuda coactiva registrada</p>
                                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                                    Este contribuyente no presenta deudas en cobranza coactiva
                                </p>
                            </div>
                        )}

                        {deudas.length > 0 && (
                            <div className="mt-6 flex justify-end">
                                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl px-8 py-4 shadow-xl shadow-blue-500/20 border border-white/10 ring-1 ring-white/20">
                                    <p className="text-[11px] font-black text-blue-100 uppercase tracking-widest mb-1">
                                        Suma total de los montos de la deuda
                                    </p>
                                    <p className="text-2xl font-black text-white flex items-baseline gap-2">
                                        <span className="text-sm font-bold opacity-80 italic text-cyan-100">S/</span>
                                        {deudas.reduce((acc: number, d: any) => acc + (Number(d.monto) || 0), 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "representantes" && (
                    <div>
                        {representantes.length > 0 ? (
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-white/5">
                                            <th className="px-4 py-3 text-left text-[13px] font-extrabold uppercase text-slate-600 dark:text-slate-300">Documento</th>
                                            <th className="px-4 py-3 text-left text-[13px] font-extrabold uppercase text-slate-600 dark:text-slate-300">Número</th>
                                            <th className="px-4 py-3 text-left text-[13px] font-extrabold uppercase text-slate-600 dark:text-slate-300">Nombre</th>
                                            <th className="px-4 py-3 text-left text-[13px] font-extrabold uppercase text-slate-600 dark:text-slate-300">Cargo</th>
                                            <th className="px-4 py-3 text-left text-[13px] font-extrabold uppercase text-slate-600 dark:text-slate-300">Desde</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {representantes.map((r: any, i: number) => (
                                            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                                <td className="px-4 py-3 text-[13px] text-slate-700 dark:text-slate-300 font-bold">
                                                    {r.tipo_de_documento || r.documento || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-[14px] text-slate-800 dark:text-slate-200 font-mono">
                                                    {r.numero_de_documento || r.numero_documento || r.dni || r.numero || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-[14px] font-bold text-slate-900 dark:text-white">
                                                    {r.nombre || r.nombre_completo || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-[14px] text-slate-700 dark:text-slate-300">
                                                    {r.cargo || r.tipo || "Representante Legal"}
                                                </td>
                                                <td className="px-4 py-3 text-[13px] text-slate-600 dark:text-slate-400 text-nowrap">
                                                    {r.fecha_desde || r.desde || "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <Users className="w-10 h-10 text-slate-400 mb-3" />
                                <p className="text-[15px] font-bold text-slate-700 dark:text-slate-200">Sin representantes legales registrados</p>
                                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                                    No se encontraron representantes legales para este RUC
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export const SunatRucPanel: React.FC<Props> = ({ data, onClose, onRefresh, isRefreshing }) => {
    const [activeTab, setActiveTab] = useState<TabId>("datos");
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Support both single result and array (search by name)
    const items = Array.isArray(data) ? data : [data];
    const currentItem = items[selectedIndex];

    if (!currentItem || !currentItem.encontrado) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800/30 dark:bg-amber-900/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                            {currentItem?.error || "No se encontraron datos de SUNAT para este RUC"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/20">
                        <X className="w-4 h-4 text-amber-600" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-indigo-200/50 bg-white shadow-lg shadow-indigo-500/5 dark:border-indigo-800/20 dark:bg-[#111c44] overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-700 border-b border-indigo-400/20 shadow-inner">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-md">
                        <Building2 className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest leading-none mb-1">
                            Consulta RUC
                        </span>
                        <span className="text-sm font-extrabold text-white leading-none">
                            SUNAT OFICIAL
                        </span>
                    </div>
                    {currentItem.fecha_consulta && (
                        <div className="ml-4 pl-4 border-l border-white/20">
                            <span className="text-[10px] text-indigo-100/60 block">Última Consulta</span>
                            <span className="text-[10px] font-bold text-white uppercase">
                                {new Date(currentItem.fecha_consulta).toLocaleString("es-PE")}
                            </span>
                        </div>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Multi-result selector (when searching by name) */}
            {items.length > 1 && (
                <div className="px-6 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-500">
                            {items.length} empresas encontradas:
                        </span>
                        {items.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => { setSelectedIndex(idx); setActiveTab("datos"); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                                    idx === selectedIndex
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 dark:bg-white/5 dark:text-slate-300 dark:border-white/10"
                                }`}
                            >
                                <div className="flex flex-col items-start gap-0.5">
                                    <div className="flex items-center gap-2">
                                        <SourceBadge source={item.fuente_busqueda} />
                                        <span>{item.razon_social ? item.razon_social.substring(0, 35) + (item.razon_social.length > 35 ? "..." : "") : item.ruc}</span>
                                    </div>
                                    <span className={`text-[9px] opacity-70 ${idx === selectedIndex ? "text-indigo-100" : "text-slate-400"}`}>{item.ruc}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="p-6">
                <SingleRucPanel
                    data={currentItem}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onRefresh={onRefresh}
                    isRefreshing={isRefreshing}
                />
            </div>
        </div>
    );
};

export default SunatRucPanel;
