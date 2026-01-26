"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
    Building2,
    FileText,
    ChevronLeft,
    DollarSign,
    Landmark,
    Calendar,
    MapPin,
    Tag,
    ShieldCheck
} from "lucide-react";
import type { Licitacion, Adjudicacion } from "@/types/licitacion";
import { licitacionService } from "@/lib/services/licitacionService";

interface Props {
    id: string;
    basePath?: string;
}

export default function LicitacionDetail({ id, basePath = "/seace/busqueda" }: Props) {
    // States
    const [licitacion, setLicitacion] = useState<Licitacion | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await licitacionService.getById(id);
                if (data && !data.error) {
                    setLicitacion(data);
                } else {
                    setError("No se encontró la licitación.");
                }
            } catch (err) {
                console.error("Error fetching detail:", err);
                setError("Ocurrió un error al cargar los detalles.");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    const formatCurrency = (amount?: number, currency: string = "PEN") => {
        return new Intl.NumberFormat("es-PE", { style: "currency", currency: currency }).format(amount || 0);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "N/A";
        // Fix: Use simple string split to avoid timezone conversion issues
        if (dateString.includes('T')) {
            const dateOnly = dateString.split('T')[0];
            const [year, month, day] = dateOnly.split('-');
            return `${day}/${month}/${year}`;
        }

        // Assume YYYY-MM-DD
        const [year, month, day] = dateString.split('-');
        if (year && month && day) {
            return `${day}/${month}/${year}`;
        }

        return new Date(dateString).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b122b] flex items-center justify-center p-10">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium text-sm">Cargando detalles...</p>
            </div>
        </div>
    );

    if (error || !licitacion) return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b122b] flex items-center justify-center p-10">
            <div className="text-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Error</h3>
                <p className="text-slate-500 mb-4">{error || "No se encontró la información solicitada."}</p>
                <Link href={basePath} className="text-indigo-600 font-bold hover:underline">
                    &larr; Volver a resultados
                </Link>
            </div>
        </div>
    );

    const adjudicaciones = licitacion.adjudicaciones || [];

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-[#0b122b] transition-colors duration-300">
            <div className="mx-auto max-w-5xl space-y-6">

                {/* Back Link */}
                <Link href={basePath} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors font-medium">
                    <ChevronLeft className="w-4 h-4" />
                    Volver a resultados
                </Link>

                {/* Main Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm dark:border-white/5 dark:bg-[#111c44] animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center dark:bg-indigo-500/20 dark:text-indigo-300">
                                    <FileText className="w-5 h-5" />
                                </span>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                                        Proceso #{licitacion.id_convocatoria}
                                    </h1>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5 font-mono">
                                        {licitacion.ocid || "OCID no disponible"}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2 mb-4">
                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase border ${licitacion.estado_proceso === "CONVOCA" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                                    licitacion.estado_proceso?.includes("CONTRATADO") || licitacion.estado_proceso?.includes("ADJUDICADO") ? "bg-slate-100 text-slate-700 border-slate-200" :
                                        "bg-slate-50 text-slate-600 border-slate-200"
                                    }`}>
                                    {licitacion.estado_proceso || "PENDIENTE"}
                                </span>
                                <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-bold uppercase border border-purple-100">
                                    {licitacion.categoria || "BIENES"}
                                </span>
                            </div>

                            <p className="text-sm font-medium text-slate-600 leading-relaxed dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                                {licitacion.descripcion}
                            </p>
                        </div>

                        <div className="w-full md:w-auto p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Monto Estimado</p>
                            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                                {formatCurrency(licitacion.monto_estimado, licitacion.moneda)}
                            </p>
                            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between items-center gap-4 text-xs">
                                    <span className="text-slate-500 font-medium">Publicado:</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatDate(licitacion.fecha_publicacion)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-t border-slate-100 dark:border-white/5">

                        {/* Column 1: Entidad */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-900 font-bold dark:text-white mb-2">
                                <Building2 className="w-4 h-4 text-slate-400" />
                                <h3 className="text-sm uppercase tracking-wide">Entidad Convocante</h3>
                            </div>
                            <div className="pl-6">
                                <p className="text-sm font-bold text-slate-800 uppercase dark:text-slate-200 leading-snug">
                                    {licitacion.comprador}
                                </p>
                                <div className="flex items-start gap-1.5 mt-2 text-xs text-slate-500 font-medium">
                                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <span className="uppercase">{licitacion.ubicacion_completa || `${licitacion.departamento || ''} - ${licitacion.provincia || ''}`}</span>
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Detalles */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-900 font-bold dark:text-white mb-2">
                                <FileText className="w-4 h-4 text-slate-400" />
                                <h3 className="text-sm uppercase tracking-wide">Detalles Técnicos</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-3 pl-6">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Nomenclatura</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{licitacion.nomenclatura}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Tipo Proceso</p>
                                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{licitacion.tipo_procedimiento || "N/A"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Moneda</p>
                                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{licitacion.moneda || "PEN"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Column 3: Financiero */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-900 font-bold dark:text-white mb-2">
                                <DollarSign className="w-4 h-4 text-slate-400" />
                                <h3 className="text-sm uppercase tracking-wide">Resumen de Adjudicación</h3>
                            </div>
                            <div className="space-y-3 pl-6">
                                <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                    <span className="text-xs font-medium text-slate-500">Monto Adjudicado</span>
                                    <span className="text-sm font-bold text-emerald-600">{formatCurrency(licitacion.monto_total_adjudicado, licitacion.moneda)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-slate-50 dark:bg-white/5 p-2 rounded border border-slate-100 dark:border-white/5">
                                        <span className="text-[10px] block text-slate-400 uppercase font-bold">Items</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-white">{licitacion.total_adjudicaciones || 0}</span>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-white/5 p-2 rounded border border-slate-100 dark:border-white/5">
                                        <span className="text-[10px] block text-slate-400 uppercase font-bold">Sin Garantía</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-white">{licitacion.con_garantia_bancaria === 0 ? "Sí" : "No"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Adjudicaciones Table */}
                {adjudicaciones.length > 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm dark:border-white/5 dark:bg-[#111c44] animate-in fade-in slide-in-from-bottom-5 duration-500 delay-100">
                        <div className="flex items-center gap-3 mb-6">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Detalle de Adjudicaciones y Ganadores</h3>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Ganador / Proveedor</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Monto Adjudicado</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Garantía / Emitido Por</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Fecha</th>
                                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {adjudicaciones.map((adj) => (
                                            <tr key={adj.id_adjudicacion} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="py-4 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-800 dark:text-white uppercase">{adj.ganador_nombre}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">RUC: {adj.ganador_ruc}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                        {formatCurrency(adj.monto_adjudicado, licitacion.moneda)}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex flex-col gap-1">
                                                        {adj.tipo_garantia && adj.tipo_garantia !== "SIN_GARANTIA" ? (
                                                            <>
                                                                <span className="inline-flex items-center w-fit rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 border border-emerald-100">
                                                                    {adj.tipo_garantia.replace(/_/g, " ")}
                                                                </span>
                                                                {adj.entidad_financiera && (
                                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                                                                        <Landmark className="w-3 h-3" />
                                                                        {adj.entidad_financiera}
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 italic">Sin Garantía</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                                                    {formatDate(adj.fecha_adjudicacion)}
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                                                        {adj.estado_item || "VIGENTE"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/5 dark:bg-[#111c44] text-center">
                        <ShieldCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sin Adjudicaciones</h3>
                        <p className="text-xs text-slate-500 mt-1">Este proceso aún no reporta ganadores o items adjudicados.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
