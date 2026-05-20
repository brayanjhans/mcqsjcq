"use client";

import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import { DistributionRadialChart } from "@/components/ecommerce/DistributionRadialChart";
import { SalesAreaChart } from "@/components/ecommerce/SalesAreaChart";
import dynamic from "next/dynamic";
import { FinancialEntitiesTable } from "@/components/ecommerce/FinancialEntitiesTable";
import { ActivityRadar } from "@/components/ecommerce/ActivityRadar";
import { licitacionService } from "@/lib/services/licitacionService";
import { DEFAULT_TIPOS_PROCEDIMIENTO } from "@/lib/constants/procedimientos";
import { ChevronDown, Filter, RotateCcw, SlidersHorizontal, Calendar, CalendarDays, FileText, Sparkles } from "lucide-react";

const PeruInteractiveMap = dynamic(
    () => import("@/components/ecommerce/PeruInteractiveMap").then(mod => mod.PeruInteractiveMap),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full min-h-[500px] rounded-2xl bg-slate-100 dark:bg-[#111c44] animate-pulse flex items-center justify-center">
                <div className="text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto animate-pulse" />
                    <p className="text-xs text-slate-400 font-medium">Cargando mapa interactivo...</p>
                </div>
            </div>
        )
    }
);

// ─── Constantes de caché ────────────────────────────────────────────
const STALE_30MIN = 30 * 60 * 1000;  // 30 minutos — datos del dashboard en memoria
const STALE_60MIN = 60 * 60 * 1000;  // 60 minutos — opciones de filtro (no cambian)
const GC_120MIN   = 120 * 60 * 1000; // 2 horas — retención en garbage collection

// ─── Fetchers tipados ────────────────────────────────────────────────
async function fetchJson(url: string) {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
    return res.json();
}

export default function EcommerceDashboardPage() {
    // ─── Estados de filtro ────────────────────────────────────────────
    const [filterAnio, setFilterAnio] = useState<number>(0);
    const [filterMes,  setFilterMes]  = useState<number>(0);
    const [filterTipo, setFilterTipo] = useState("");
    const [selectedMapDept, setSelectedMapDept] = useState<string>("");

    // ─── Query params helper ──────────────────────────────────────────
    const buildQuery = useCallback((extra: Record<string, string | number | undefined> = {}) => {
        const p = new URLSearchParams();
        if (filterAnio > 0)  p.set("year",              filterAnio.toString());
        if (filterMes  > 0)  p.set("mes",               filterMes.toString());
        if (filterTipo)      p.set("tipo_procedimiento", filterTipo);
        if (selectedMapDept) p.set("departamento",       selectedMapDept);
        Object.entries(extra).forEach(([k, v]) => { if (v !== undefined && v !== null) p.set(k, String(v)); });
        return p.toString();
    }, [filterAnio, filterMes, filterTipo, selectedMapDept]);

    const buildQueryNoDept = useCallback(() => {
        const p = new URLSearchParams();
        if (filterAnio > 0)  p.set("year",              filterAnio.toString());
        if (filterMes  > 0)  p.set("mes",               filterMes.toString());
        if (filterTipo)      p.set("tipo_procedimiento", filterTipo);
        return p.toString();
    }, [filterAnio, filterMes, filterTipo]);

    // ─── Opciones de filtro (semi-estáticas) ──────────────────────────
    const { data: filterOptions } = useQuery({
        queryKey: ["dashboard-filter-options"],
        queryFn:  () => licitacionService.getFilters(),
        staleTime: STALE_60MIN,
        gcTime:    GC_120MIN,
        retry: 1,
    });

    const options = {
        tipos: DEFAULT_TIPOS_PROCEDIMIENTO,
        anios: filterOptions?.anios ?? [2028, 2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020],
        meses: [
            { id: 1, name: "Enero" }, { id: 2, name: "Febrero" }, { id: 3, name: "Marzo" },
            { id: 4, name: "Abril" }, { id: 5, name: "Mayo" },    { id: 6, name: "Junio" },
            { id: 7, name: "Julio" }, { id: 8, name: "Agosto" },  { id: 9, name: "Septiembre" },
            { id: 10, name: "Octubre" }, { id: 11, name: "Noviembre" }, { id: 12, name: "Diciembre" }
        ]
    };

    // ─── 1. Unificado: Resumen de Dashboard ───────────────────────────
    // Llamada única que trae todos los KPIs, tendencias y distribuciones
    const { data: summaryRaw, isLoading: loadingKpis } = useQuery({
        queryKey: ["dashboard-summary", filterAnio, filterMes, filterTipo, selectedMapDept],
        queryFn:  () => fetchJson(`/api/dashboard/summary?${buildQuery()}`),
        staleTime: STALE_30MIN,
        gcTime:    GC_120MIN,
        retry: 2,
    });

    // ─── 2. Ranking departamentos (sin filtro dept para no vaciar el mapa) ──
    // Se mantiene separado porque no usa el filtro `selectedMapDept`
    const { data: deptRankingRaw, isLoading: loadingMap } = useQuery({
        queryKey: ["dashboard-dept-ranking", filterAnio, filterMes, filterTipo],
        queryFn:  () => fetchJson(`/api/dashboard/department-ranking?${buildQueryNoDept()}`),
        staleTime: STALE_30MIN,
        gcTime:    GC_120MIN,
        retry: 2,
    });

    // Desestructurar datos del summary
    const kpisRaw = summaryRaw?.kpis;
    const trendRaw = summaryRaw?.trend;
    const distRaw = summaryRaw?.distribution;
    const statusRaw = summaryRaw?.status;
    const finRaw = summaryRaw?.financial_entities;

    // ─── 3. Ranking provincias (solo cuando hay dept seleccionado) ─────
    const { data: provRankingRaw } = useQuery({
        queryKey: ["dashboard-prov-ranking", selectedMapDept, filterAnio, filterMes, filterTipo],
        queryFn:  () => {
            if (!selectedMapDept) return Promise.resolve({ data: [] });
            const cleanDept = selectedMapDept.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
            const q = buildQuery({ department: cleanDept });
            return fetchJson(`/api/dashboard/province-ranking?${q}`);
        },
        enabled:   true,
        staleTime: STALE_30MIN,
        gcTime:    GC_120MIN,
        retry: 2,
    });

    // ─── Transformaciones de datos ────────────────────────────────────
    const kpisLic   = kpisRaw   ?? null;
    const kpisMonto = kpisRaw   ? { ...kpisRaw, monto_total_adjudicado: parseFloat(kpisRaw?.monto_total_adjudicado || kpisRaw?.monto_total_estimado || "0") } : null;

    const monthlyTrend = (trendRaw?.data ?? []).map((item: any) => ({
        month: item.month || item.name,
        total: item.total || item.count || item.value || 0
    }));

    const distribution = (distRaw?.data ?? []).map((item: any) => ({
        type:  item.name ?? item.type,
        total: item.value ?? item.total
    }));

    const departmentRanking = deptRankingRaw?.data ?? [];
    const totalMapLic       = departmentRanking.reduce((acc: number, item: any) => acc + (item.count || 0), 0) || 1;
    const finalDeptRanking  = departmentRanking.map((item: any, index: number) => ({
        rank:       index + 1,
        name:       item.name,
        count:      item.count,
        percentage: Math.round((item.count / totalMapLic) * 100)
    }));

    const financialEntities = (finRaw?.data ?? []).map((item: any) => ({
        name:      item.name,
        garantias: item.count  ?? item.garantias,
        monto:     item.amount ?? item.monto,
        depts:     `${item.dept_count || 0} Depts.`,
        cobertura: "Nacional"
    }));

    const provinceRanking = provRankingRaw?.data ?? [];

    const processLabel = filterTipo ? filterTipo : "Procesos";

    // ─── Handlers ────────────────────────────────────────────────────
    const handleDepartmentClick = useCallback((dept: string | null) => setSelectedMapDept(dept || ""), []);
    const handleClearFilters    = () => { setFilterAnio(0); setFilterMes(0); setFilterTipo(""); setSelectedMapDept(""); };

    // ─── Loading state — solo en la carga inicial (primera visita) ────
    if (loadingKpis && !kpisLic) {
        return (
            <div className="min-h-screen bg-white dark:bg-[#0b122b] p-4 sm:p-6 lg:p-8 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto" />
                    <p className="text-sm text-slate-400 font-medium">Cargando dashboard unificado...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-[#0b122b] bg-[radial-gradient(#e2e8f0_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#ffffff03_1.2px,transparent_1.2px)] [background-size:20px_20px] p-4 text-slate-800 dark:text-slate-200 font-sans fade-in transition-colors duration-300 relative overflow-hidden">
            {/* Ambient Background Glow Orbs */}
            <div className="absolute top-1/4 left-[10%] w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-2/3 right-[10%] w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="mx-auto max-w-[1600px] space-y-6 relative z-10">

                {/* ── Filter Bar ── */}
                <div className="bg-white/95 dark:bg-[#111c44]/95 backdrop-blur-md rounded-2xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.06),_0_2px_4px_rgba(0,0,0,0.02)] border border-slate-300/80 border-t-white/80 dark:border-slate-800/80 dark:border-t-white/10 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute top-0 right-0 w-32 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
                    <div className="absolute top-1/2 right-6 -translate-y-1/2 pointer-events-none opacity-20 animate-pulse hidden xl:block">
                        <Sparkles className="w-5 h-5 text-indigo-400 animate-spin [animation-duration:12s]" />
                    </div>

                    <div className="flex flex-col xl:flex-row items-center gap-4 relative z-10">
                        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 dark:border-indigo-400/30 text-indigo-600 dark:text-indigo-400 font-black text-[10px] tracking-widest uppercase flex-shrink-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <SlidersHorizontal size={12} className="animate-pulse text-indigo-500" />
                            Filtros Inteligentes
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full flex-1">
                            {/* Procedimiento */}
                            <div className="relative w-full group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10 transition-colors duration-300">
                                    <FileText className="h-4 w-4 text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
                                </div>
                                <select
                                    className="w-full appearance-none rounded-xl border-l-[3px] border-l-indigo-500 border-y border-r border-slate-200/90 bg-gradient-to-b from-white to-slate-100/90 dark:from-[#111c44] dark:to-[#0b122b]/80 py-3 pl-12 pr-10 text-xs font-black text-slate-700 hover:border-indigo-500/30 dark:hover:border-indigo-500/20 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all duration-300 dark:border-white/5 dark:text-slate-200 cursor-pointer shadow-[0_2px_4px_rgba(0,0,0,0.04),_inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[0_2px_4px_rgba(0,0,0,0.2),_inset_0_1px_0_rgba(255,255,255,0.05)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.06),_inset_0_1px_0_rgba(255,255,255,0.8)] hover:-translate-y-[1px]"
                                    value={filterTipo}
                                    onChange={(e) => setFilterTipo(e.target.value)}
                                >
                                    <option value="">Todos los Procedimientos</option>
                                    {options.tipos && options.tipos.map((t: string) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>

                            {/* Año */}
                            <div className="relative w-full group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10 transition-colors duration-300">
                                    <Calendar className="h-4 w-4 text-violet-500 dark:text-violet-400 group-hover:scale-110 transition-transform duration-300" />
                                </div>
                                <select
                                    className="w-full appearance-none rounded-xl border-l-[3px] border-l-violet-500 border-y border-r border-slate-200/90 bg-gradient-to-b from-white to-slate-100/90 dark:from-[#111c44] dark:to-[#0b122b]/80 py-3 pl-12 pr-10 text-xs font-black text-slate-700 hover:border-indigo-500/30 dark:hover:border-indigo-500/20 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all duration-300 dark:border-white/5 dark:text-slate-200 cursor-pointer shadow-[0_2px_4px_rgba(0,0,0,0.04),_inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[0_2px_4px_rgba(0,0,0,0.2),_inset_0_1px_0_rgba(255,255,255,0.05)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.06),_inset_0_1px_0_rgba(255,255,255,0.8)] hover:-translate-y-[1px]"
                                    value={filterAnio}
                                    onChange={(e) => setFilterAnio(Number(e.target.value))}
                                >
                                    <option value="0">Todos los Años</option>
                                    {options.anios && options.anios.map((y: any) => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>

                            {/* Mes */}
                            <div className="relative w-full group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10 transition-colors duration-300">
                                    <CalendarDays className="h-4 w-4 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
                                </div>
                                <select
                                    className="w-full appearance-none rounded-xl border-l-[3px] border-l-emerald-500 border-y border-r border-slate-200/90 bg-gradient-to-b from-white to-slate-100/90 dark:from-[#111c44] dark:to-[#0b122b]/80 py-3 pl-12 pr-10 text-xs font-black text-slate-700 hover:border-indigo-500/30 dark:hover:border-indigo-500/20 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all duration-300 dark:border-white/5 dark:text-slate-200 cursor-pointer shadow-[0_2px_4px_rgba(0,0,0,0.04),_inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[0_2px_4px_rgba(0,0,0,0.2),_inset_0_1px_0_rgba(255,255,255,0.05)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.06),_inset_0_1px_0_rgba(255,255,255,0.8)] hover:-translate-y-[1px]"
                                    value={filterMes}
                                    onChange={(e) => setFilterMes(Number(e.target.value))}
                                >
                                    <option value="0">Todos los Meses</option>
                                    {options.meses.map((m) => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <button
                            onClick={handleClearFilters}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500/10 to-pink-500/5 hover:from-rose-500 hover:to-pink-500 text-rose-600 hover:text-white border border-rose-500/20 hover:border-transparent text-xs font-black transition-all duration-300 w-full xl:w-auto justify-center shadow-[0_3px_6px_rgba(244,63,94,0.1)] hover:shadow-[0_6px_16px_rgba(244,63,94,0.25)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)] active:translate-y-[1px] active:scale-98"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Limpiar Filtros
                        </button>
                    </div>
                </div>

                {/* ── Main Dashboard Grid ── */}
                <div className="space-y-6">

                    {/* ROW 1: Key Metrics */}
                    <div>
                        <EcommerceMetrics
                            licitaciones={kpisLic?.total_licitaciones}
                            monto={kpisMonto?.monto_total_adjudicado}
                            yearLic={filterAnio}
                            onYearLicChange={(y) => setFilterAnio(y)}
                            yearMonto={filterAnio}
                            onYearMontoChange={(y) => setFilterAnio(y)}
                            label={processLabel}
                            totalGarantias={kpisLic?.total_garantias}
                            garantiasActivas={kpisLic?.garantias_activas}
                            garantiasPorVencer={kpisLic?.garantias_por_vencer}
                            garantiasVencidas={kpisLic?.garantias_vencidas}
                        />
                    </div>

                    {/* ROW 2: Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        <div className="lg:col-span-8 h-[320px]">
                            <SalesAreaChart
                                data={monthlyTrend}
                                selectedYear={filterAnio}
                                onYearChange={(y) => setFilterAnio(y)}
                                label={processLabel}
                            />
                        </div>
                        <div className="lg:col-span-4 h-[320px]">
                            <DistributionRadialChart
                                data={distribution}
                                selectedYear={filterAnio}
                                onYearChange={(y) => setFilterAnio(y)}
                                label={processLabel}
                            />
                        </div>
                    </div>

                    {/* ROW 3: Map + Tables */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        <div className="lg:col-span-6">
                            <PeruInteractiveMap
                                departmentRanking={finalDeptRanking}
                                provinceRanking={provinceRanking}
                                selectedDepartment={selectedMapDept}
                                onDepartmentClick={handleDepartmentClick}
                                loading={loadingMap}
                                label={processLabel}
                            />
                        </div>
                        <div className="lg:col-span-3">
                            <FinancialEntitiesTable
                                data={financialEntities}
                                selectedYear={filterAnio}
                                onYearChange={(y) => setFilterAnio(y)}
                                selectedDepartment={selectedMapDept}
                            />
                        </div>
                        <div className="lg:col-span-3">
                            <ActivityRadar />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
