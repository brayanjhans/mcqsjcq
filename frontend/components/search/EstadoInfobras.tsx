import React, { useEffect, useState } from "react";
import { Loader2, Activity, AlertTriangle, Calendar, TrendingUp, TrendingDown, Target, Building, BookOpen, Clock, FileText, Image as ImageIcon, Briefcase, Hash, Database, Copy, Check, CircleDollarSign, CalendarDays, FileCheck, CalendarRange, XCircle, ShieldCheck } from "lucide-react";

const DataValue = ({ val, className = "" }: { val: string | undefined | null, className?: string }) => {
    if (!val || val.toLowerCase().includes("no registra") || val.toLowerCase().includes("no provist") || val === "-") {
        return <span className={`text-slate-400 dark:text-slate-500 italic text-[11px] font-medium tracking-wide ${className}`}>No provisto</span>;
    }
    return <span className={className}>{val}</span>;
}

interface InfobrasValorizacion {
    periodo: string;
    avance_fisico_prog: string;
    avance_fisico_real: string;
    avance_val_prog: string;
    avance_val_real: string;
    pct_ejecucion_fin: string;
    monto_ejecucion_fin: string;
    estado: string;
    causal_paralizacion: string;
    url_imagen: string;
}

interface InfobrasData {
    cui?: string;
    obra_id_infobras: string;
    entidad: string;
    estado_ejecucion: string;
    contratista: string;
    modalidad: string;
    contrato_desc: string;
    fecha_contrato: string;
    fecha_inicio: string;
    fecha_fin: string;
    costo_viable: string;
    costo_actualizado: string;
    alerta_situacional: string;
    pdf_resolucion: string;
    last_updated: string;
    pdf_acta_terreno?: string;
    pdf_designacion_supervisor?: string;
    pdf_cronograma?: string;
    pdf_suspension_plazo?: string;
    pdf_resolucion_contrato?: string;
    pdf_informe_control?: string;
    valorizaciones: InfobrasValorizacion[];
}

interface Props {
    cui?: string | null;
}

export function EstadoInfobras({ cui }: Props) {
    const [data, setData] = useState<InfobrasData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        if (!cui) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                const response = await fetch(`${apiUrl}/api/integraciones/infobras/${cui}`);

                if (!response.ok) {
                    if (response.status === 404) {
                        setError("No se encontró información de la Contraloría (Infobras) para este CUI. Puede que aún no se haya sincronizado.");
                    } else {
                        throw new Error(`Error ${response.status}`);
                    }
                    setData(null);
                    return;
                }

                const result = await response.json();
                if (result.status === "success" && result.data) {
                    setData({ ...result.data, cui: cui }); // Inject CUI to use it visually
                } else {
                    setError("Formato de respuesta inválido.");
                }
            } catch (err: any) {
                console.error("Error fetching Infobras data:", err);
                setError(err.message || "Error al conectar con el servidor.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [cui]);

    if (!cui) return null;

    if (loading) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col items-center justify-center gap-3 dark:border-white/5 dark:bg-[#111c44] mt-6">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Consultando estado físico en la Contraloría...</span>
            </div>
        );
    }

    if (error || !data || data.obra_id_infobras === 'NO_ENCONTRADO') {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-6 shadow-inner dark:border-slate-700 dark:bg-[#0b122b]/50 text-center mt-6 flex flex-col items-center justify-center gap-2">
                <Activity className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Avance Físico (Infobras)</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">{error || "El proyecto no registra datos públicos en la Contraloría."}</p>
            </div>
        );
    }

    const {
        obra_id_infobras, estado_ejecucion, entidad, contratista, modalidad, contrato_desc,
        fecha_contrato, fecha_inicio, fecha_fin, costo_viable, costo_actualizado,
        alerta_situacional, pdf_resolucion, last_updated, valorizaciones: rawValorizaciones
    } = data;

    const monthMap: { [key: string]: number } = {
        'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4, 'MAYO': 5, 'JUNIO': 6,
        'JULIO': 7, 'AGOSTO': 8, 'SETIEMBRE': 9, 'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
    };

    const valorizaciones = [...(rawValorizaciones || [])].sort((a, b) => {
        const partsA = a.periodo.split(' ');
        const partsB = b.periodo.split(' ');
        const yearA = parseInt(partsA[1]) || 0;
        const yearB = parseInt(partsB[1]) || 0;
        const monthA = monthMap[partsA[0].toUpperCase()] || 0;
        const monthB = monthMap[partsB[0].toUpperCase()] || 0;
        return (yearB * 100 + monthB) - (yearA * 100 + monthA);
    });

    const hasAlert = alerta_situacional && alerta_situacional.toLowerCase() !== "no registrado";

    const handleCopy = (text: string, id: string) => {
        if (!text || text.toLowerCase().includes("no registra")) return;
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    let maxFisicoStr = "0.00%";
    let maxFinancStr = "0.00%";
    let numFisico = 0;
    let numFinanc = 0;

    if (valorizaciones && valorizaciones.length > 0) {
        const lastVal = valorizaciones[valorizaciones.length - 1];
        maxFisicoStr = lastVal.avance_fisico_real;
        maxFinancStr = lastVal.pct_ejecucion_fin;

        const parsePct = (s: string) => parseFloat(s.replace('%', '').trim()) || 0;
        numFisico = parsePct(maxFisicoStr);
        numFinanc = parsePct(maxFinancStr);
    }

    const getEstadoOperativoColor = (estado: string | undefined) => {
        if (!estado) return "bg-slate-500 dark:bg-slate-600";

        const est = estado.toLowerCase();
        if (est.includes("ejecuci")) return "bg-blue-600 dark:bg-blue-700";
        if (est.includes("paralizada")) return "bg-amber-500 dark:bg-amber-600";
        if (est.includes("abandonada")) return "bg-rose-600 dark:bg-rose-700";
        if (est.includes("finalizada")) return "bg-emerald-500 dark:bg-emerald-600";
        if (est.includes("resuelta")) return "bg-red-700 dark:bg-red-800";
        if (est.includes("liquidada")) return "bg-indigo-600 dark:bg-indigo-700";
        if (est.includes("transferida")) return "bg-teal-600 dark:bg-teal-700";
        if (est.includes("recep")) return "bg-emerald-600 dark:bg-emerald-700"; // fallback

        return "bg-slate-500 dark:bg-slate-600";
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-md dark:border-white/10 dark:bg-[#111c44] animate-in fade-in slide-in-from-bottom-5 duration-500 delay-400 mt-6 border-t-4 border-t-blue-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

            <div className={`absolute top-0 right-0 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-xl shadow-md flex items-center gap-1.5 z-20 ${getEstadoOperativoColor(estado_ejecucion)}`}>
                <span className="opacity-75 font-bold mr-1 hidden sm:inline-block">SITUACIÓN OPERATIVA:</span> {estado_ejecucion || "ESTADO NO REGISTRADO"}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 relative z-10 pt-4 md:pt-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center shadow-lg shadow-blue-500/20 text-white shrink-0 hidden sm:flex">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase leading-tight flex items-center gap-2">
                            <Activity className="w-5 h-5 sm:hidden text-blue-500" />
                            AVANCE FÍSICO Y CONTRALORÍA (INFOBRAS)
                        </h3>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md truncate max-w-[250px] border border-slate-200 dark:border-slate-700" title={entidad}>
                                {entidad}
                            </span>
                        </div>
                    </div>
                </div>
            </div>



            {/* CUADRO 1: Detalles Generales del Proyecto (infobras_obras) ALL 15 FIELDS */}
            <div className="mt-8 relative z-10">
                <div className="rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-[#0b122b] shadow-md">
                    {/* Row 1: Technical IDs (4 fields) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-900/10">
                        <div className="p-3 border-r border-slate-200 dark:border-slate-800 relative group cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors" onClick={() => handleCopy(cui || '', 'cui')}>
                            <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-blue-900/70 dark:text-blue-300 uppercase tracking-wide mb-1">
                                <Hash className="w-3 h-3" /> Código Único de Inversión
                            </span>
                            <span className="text-base font-mono font-black text-blue-700 dark:text-blue-400 mt-1 block">{cui}</span>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {copiedId === 'cui' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-blue-500/50" />}
                            </div>
                        </div>
                        <div className="p-3 border-r border-slate-200 dark:border-slate-800 relative group cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors" onClick={() => handleCopy(obra_id_infobras, 'obra_id')}>
                            <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                                <FileText className="w-3 h-3" /> Identificador de Obra
                            </span>
                            <DataValue val={obra_id_infobras} className="text-sm font-mono font-bold text-slate-800 dark:text-slate-100 mt-1 block" />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {copiedId === 'obra_id' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                            </div>
                        </div>
                        <div className="p-3">
                            <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                                <Clock className="w-3 h-3" /> Último Reporte Público
                            </span>
                            <DataValue val={last_updated} className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 block" />
                        </div>
                    </div>

                    {/* Row 2: General Info (2 fields left) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800">
                        <div className="p-4 border-r border-slate-200 dark:border-slate-800">
                            <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                                <Briefcase className="w-3 h-3" /> Empresa Contratista
                            </span>
                            <div className="mt-1">
                                <DataValue val={contratista} className="text-sm font-bold text-slate-800 dark:text-slate-200" />
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50/30 dark:bg-transparent">
                            <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                                <Building className="w-3 h-3" /> Método de Ejecución
                            </span>
                            <DataValue val={modalidad} className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1 block" />
                        </div>
                    </div>

                    {/* Row 3: Contracts & Dates (4 fields) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-white/[0.02]">
                        <div className="p-4 border-r border-slate-200 dark:border-slate-800">
                            <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                                <FileText className="w-3 h-3" /> Descripción del Contrato
                            </span>
                            <DataValue val={contrato_desc} className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block" />
                        </div>
                        <div className="p-4 border-r border-slate-200 dark:border-slate-800">
                            <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                                <CalendarDays className="w-3 h-3" /> Inicio de Actividades
                            </span>
                            <DataValue val={fecha_inicio} className="text-sm font-black text-slate-900 dark:text-white mt-1 block" />
                        </div>
                        <div className="p-4 border-r border-slate-200 dark:border-slate-800">
                            <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                                <Target className="w-3 h-3" /> Culminación Planificada
                            </span>
                            <DataValue val={fecha_fin} className="text-sm font-black text-slate-900 dark:text-white mt-1 block" />
                        </div>
                        <div className="p-4">
                            <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                                <FileText className="w-3 h-3" /> Suscripción de Contrato
                            </span>
                            <DataValue val={fecha_contrato} className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 block" />
                        </div>
                    </div>

                    {/* Row 4: Costs & Docs (4 fields) = Total 15 fields */}
                    <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#0b122b]">
                        <div className="p-4 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-center">
                            <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                                <CircleDollarSign className="w-3 h-3" /> Presupuesto Inicial
                            </span>
                            <DataValue val={costo_viable} className="text-sm font-mono font-black text-slate-700 dark:text-slate-300" />
                        </div>
                        <div className="p-4 border-r border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/20 flex flex-col justify-center shadow-[inset_0_2px_10px_rgba(16,185,129,0.05)]">
                            <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-800/80 dark:text-emerald-400/80 uppercase tracking-wide mb-1">
                                <CircleDollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" /> Costo Integral Vigente
                            </span>
                            <DataValue val={costo_actualizado} className="text-base font-mono font-black text-emerald-700 dark:text-emerald-400" />
                        </div>
                        <div className="p-4 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-center">
                            <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                                <AlertTriangle className="w-3 h-3" /> Estado de Alerta Oficial
                            </span>
                            <DataValue val={alerta_situacional} className={`text-xs font-bold ${hasAlert ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'} break-words leading-relaxed`} />
                        </div>
                        <div className="p-4 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col justify-center min-w-[200px]">
                            <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">
                                <BookOpen className="w-3 h-3" /> Documentación Técnica y Legal
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {pdf_resolucion && pdf_resolucion.length > 5 && pdf_resolucion !== "-" && (
                                    <a href={pdf_resolucion.startsWith('http') ? pdf_resolucion : `https://infobras.contraloria.gob.pe${pdf_resolucion}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors shadow-sm" title="Resolución de Aprobación">
                                        <FileText className="w-3 h-3" /> Resolución
                                    </a>
                                )}
                                {data.pdf_acta_terreno && data.pdf_acta_terreno.length > 5 && data.pdf_acta_terreno !== "-" && (
                                    <a href={data.pdf_acta_terreno} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors shadow-sm" title="Acta de Entrega de Terreno">
                                        <FileCheck className="w-3 h-3" /> Acta Terreno
                                    </a>
                                )}
                                {data.pdf_cronograma && data.pdf_cronograma.length > 5 && data.pdf_cronograma !== "-" && (
                                    <a href={data.pdf_cronograma} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors shadow-sm" title="Cronograma de Obra">
                                        <CalendarRange className="w-3 h-3" /> Cronograma
                                    </a>
                                )}
                                {data.pdf_resolucion_contrato && data.pdf_resolucion_contrato.length > 5 && data.pdf_resolucion_contrato !== "-" && (
                                    <a href={data.pdf_resolucion_contrato} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors shadow-sm" title="Resolución de Contrato / Cierre">
                                        <XCircle className="w-3 h-3" /> Resol. Contrato
                                    </a>
                                )}
                                {data.pdf_informe_control && data.pdf_informe_control.length > 5 && data.pdf_informe_control !== "-" && (
                                    <a href={data.pdf_informe_control} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors shadow-sm" title="Informes de Control de Contraloría">
                                        <ShieldCheck className="w-3 h-3" /> Inf. Control
                                    </a>
                                )}
                                {(!pdf_resolucion || pdf_resolucion === "-") && (!data.pdf_acta_terreno || data.pdf_acta_terreno === "-") && (
                                    <span className="text-[10px] text-slate-400 italic">No registra documentos adicionales</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CUADRO 2: Valorizaciones Table (infobras_valorizaciones) ALL 11 FIELDS ALWAYS SHOW */}
            <div className="mt-12 relative z-10 border-t-2 border-slate-200 dark:border-slate-700 pt-8">
                <h4 className="flex items-center gap-2 justify-center mb-0 top-[-10px] mx-auto w-max px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-[0.2em] relative z-20 border border-blue-200 dark:border-blue-800/50 rounded-full shadow-sm mt-[-40px]">
                    <Database className="w-3 h-3 text-blue-600 dark:text-blue-400 shadow-sm" /> 2. HISTORIAL DE REPORTE Y VALORIZACIONES MENSUALES
                </h4>

                {/* Identifier Visual */}
                <div className="text-right mb-3">
                    <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-700/50 px-2.5 py-1 rounded-md shadow-sm border border-slate-300 dark:border-slate-600">
                        Registro N° {cui}
                    </span>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 shadow-md">
                    {valorizaciones && valorizaciones.length > 0 ? (
                        <div className="max-h-96 overflow-auto custom-scrollbar">
                            <table className="w-full text-left whitespace-nowrap min-w-[1000px]">
                                <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-[#0b122b] backdrop-blur-md shadow-[0_1px_0_0_#cbd5e1] dark:shadow-[0_1px_0_0_#334155]">
                                    <tr>
                                        <th className="py-3 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Periodo Mensual</th>
                                        <th className="py-3 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-center bg-blue-100/50 dark:bg-blue-900/20">Físico Programado</th>
                                        <th className="py-3 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-center bg-blue-100/50 dark:bg-blue-900/20">Físico Ejecutado</th>
                                        <th className="py-3 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-center">Variación</th>
                                        <th className="py-3 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-right bg-emerald-100/50 dark:bg-emerald-900/20">Metrado Programado</th>
                                        <th className="py-3 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-right bg-emerald-100/50 dark:bg-emerald-900/20">Monto Valorizado</th>
                                        <th className="py-3 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-center">Tasa Monetaria</th>
                                        <th className="py-3 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-right">Ejecución Acumulada</th>
                                        <th className="py-3 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-center">Situación</th>
                                        <th className="py-3 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Causal Restricción</th>
                                        <th className="py-3 px-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-center">Evidencia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#111c44]">
                                    {valorizaciones.map((v, i) => {
                                        const parsePct = (s: string) => parseFloat(s.replace('%', '').trim()) || 0;
                                        const prog = parsePct(v.avance_fisico_prog);
                                        const real = parsePct(v.avance_fisico_real);
                                        const delta = real - prog;
                                        const isAtrasado = delta < -5;

                                        return (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors group">
                                                <td className="py-3 px-4 text-xs font-black text-slate-900 dark:text-slate-100">{v.periodo}</td>
                                                <td className="py-3 px-4 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 text-center bg-blue-50/40 dark:bg-blue-900/10 group-hover:bg-transparent">{v.avance_fisico_prog}</td>
                                                <td className="py-3 px-4 text-[11px] font-mono text-blue-700 dark:text-blue-300 font-black text-center bg-blue-50/40 dark:bg-blue-900/10 group-hover:bg-transparent">{v.avance_fisico_real}</td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className={`inline-flex items-center justify-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded shadow-sm border ${delta >= 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30' : isAtrasado ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30' : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'}`}>
                                                        {delta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                                        {Math.abs(delta).toFixed(2)}%
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 text-right bg-emerald-50/40 dark:bg-emerald-900/10 group-hover:bg-transparent">{v.avance_val_prog}</td>
                                                <td className="py-3 px-4 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-black text-right bg-emerald-50/40 dark:bg-emerald-900/10 group-hover:bg-transparent">{v.avance_val_real}</td>
                                                <td className="py-3 px-4 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 text-center">{v.pct_ejecucion_fin}</td>
                                                <td className="py-3 px-4 text-xs font-mono font-black text-slate-800 dark:text-slate-100 text-right">{v.monto_ejecucion_fin}</td>

                                                <td className="py-3 px-4 text-center">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase border shadow-sm ${v.estado.includes('APROBADO') ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-500/40 dark:text-emerald-300' :
                                                        'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300'
                                                        }`}>
                                                        {v.estado || "VIGENTE"}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={v.causal_paralizacion}>
                                                        {v.causal_paralizacion && v.causal_paralizacion !== 'No registrado' ? v.causal_paralizacion : '-'}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {v.url_imagen && v.url_imagen.startsWith('http') ? (
                                                        <a href={v.url_imagen} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200 rounded-md transition-colors shadow-sm dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/60" title="Ver Link">
                                                            <ImageIcon className="w-4 h-4" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black italic">No Provisto</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-10 px-6 bg-slate-50 dark:bg-[#0b122b]">
                            <div className="flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-slate-200/50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                    <BookOpen className="w-8 h-8 text-slate-500 dark:text-slate-400" />
                                </div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-slate-200">Sin Movimientos Informados</h3>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 max-w-[450px] mt-2">El proyecto es muy reciente o no se han publicado actas mensuales de avance físico/financiero para este registro en particular en la Contraloría.</p>
                            </div>

                            <div className="mt-8 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-xl bg-white dark:bg-[#111c44] overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shadow-sm select-none">
                                <div className="p-4 border-b-2 border-slate-200 dark:border-slate-800 border-dashed bg-slate-50/50 dark:bg-[#0b122b]/50">
                                    <span className="text-xs font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest">Métricas Monitoreadas Automáticamente (11 Indicadores)</span>
                                </div>
                                <table className="w-full text-left whitespace-nowrap min-w-[1000px]">
                                    <thead className="bg-slate-100/80 dark:bg-[#0b122b]">
                                        <tr>
                                            <th className="py-3 px-4 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Periodo Mensual</th>
                                            <th className="py-3 px-4 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Físico Programado</th>
                                            <th className="py-3 px-4 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Físico Ejecutado</th>
                                            <th className="py-3 px-4 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Metrado Programado</th>
                                            <th className="py-3 px-4 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Monto Valorizado</th>
                                            <th className="py-3 px-4 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Tasa Monetaria</th>
                                            <th className="py-3 px-4 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Ejecución Acumulada</th>
                                            <th className="py-3 px-4 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Situación</th>
                                            <th className="py-3 px-4 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Causal Restricción</th>
                                            <th className="py-3 px-4 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">Evidencia</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-slate-50/30 dark:bg-transparent">
                                        <tr>
                                            <td colSpan={10} className="py-8 text-center text-sm font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">
                                                A la espera de la publicación del primer reporte...
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default EstadoInfobras;
