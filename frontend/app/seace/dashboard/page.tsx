"use client";

import React, { useEffect, useState, useCallback } from "react";
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
    { ssr: false }
);

export default function EcommerceDashboardPage() {
    // --- Data States ---
    const [kpisLic, setKpisLic] = useState<any>(null); // For Lictaciones card
    const [kpisMonto, setKpisMonto] = useState<any>(null); // For Monto card
    const [distribution, setDistribution] = useState<any[]>([]);
    const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
    const [financialEntities, setFinancialEntities] = useState<any[]>([]);
    const [departmentRanking, setDepartmentRanking] = useState<any[]>([]);
    const [statusStats, setStatusStats] = useState<any[]>([]);

    const [provinceRanking, setProvinceRanking] = useState<any[]>([]);

    // --- Filter States (Global) ---
    // User Requested: Year, Month, Procedure Type (Third Section)
    const [filterAnio, setFilterAnio] = useState<number>(0); // 0 = All Years
    const [filterMes, setFilterMes] = useState<number>(0);   // 0 = All Months
    const [filterTipo, setFilterTipo] = useState("");        // Procedure Type

    // We keep a local state for Map Department selection since it's no longer a global filter bar item
    const [selectedMapDept, setSelectedMapDept] = useState<string>("");

    // Filter Options
    const [options, setOptions] = useState({
        tipos: DEFAULT_TIPOS_PROCEDIMIENTO, // Initialize with static list
        anios: [],
        meses: [
            { id: 1, name: "Enero" }, { id: 2, name: "Febrero" }, { id: 3, name: "Marzo" },
            { id: 4, name: "Abril" }, { id: 5, name: "Mayo" }, { id: 6, name: "Junio" },
            { id: 7, name: "Julio" }, { id: 8, name: "Agosto" }, { id: 9, name: "Septiembre" },
            { id: 10, name: "Octubre" }, { id: 11, name: "Noviembre" }, { id: 12, name: "Diciembre" }
        ]
    });

    // --- Loading States ---
    const [loadingKpis, setLoadingKpis] = useState(true);
    const [loadingMap, setLoadingMap] = useState(false);

    // 0. Load Filter Options
    useEffect(() => {
        async function loadOptions() {
            try {
                const data = await licitacionService.getFilters();
                setOptions(prev => ({
                    ...prev,
                    // tipos: data.tipos_entidad || [], // OLD: Dynamic from DB
                    tipos: DEFAULT_TIPOS_PROCEDIMIENTO, // NEW: Static List (Contains "Contratación Directa")
                    // Use backend years if available, else default
                    anios: data.anios || [2028, 2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020]
                }));
            } catch (error) {
                console.error("Error options:", error);
            }
        }
        loadOptions();
    }, []);

    // Helper to build query string
    const getQueryParams = useCallback((extraParams: any = {}) => {
        const params = new URLSearchParams();

        // Global Filters are always applied
        if (filterAnio > 0) params.append("year", filterAnio.toString());
        if (filterMes > 0) params.append("mes", filterMes.toString());
        if (filterTipo) params.append("tipo_procedimiento", filterTipo);

        // Map Selection (treated as a filter for other widgets if needed, or primarily for Drilldown)
        // Let's decide: Should selecting a department on map filter everything else?
        // User request didn't specify, but "Global Dept" filter was removed.
        // Let's allow map selection to filter "Province Ranking" and maybe "Financial Entities".
        if (selectedMapDept) params.append("departamento", selectedMapDept);

        // Merge extra params
        Object.keys(extraParams).forEach(key => {
            if (extraParams[key] !== undefined && extraParams[key] !== null) {
                // If the widget overrides year, use widget's year. 
                // BUT user wants global year filter. So Global wins?
                // Let's adopt a policy: Global Filter wins unless explicit override is intended to show specific historical context.
                // However, charts often have their own time axis (Trend). 
                // If Global Year is selected (e.g. 2024), Trend should show 2024 months.
                // If Global Year is All (0), Trend should show... all years? Or specific year?
                // Usually Trend takes a year argument.
                // We will let the Global Filter drive the 'default'.
                params.set(key, extraParams[key].toString());
            }
        });

        return params.toString();
    }, [filterAnio, filterMes, filterTipo, selectedMapDept]);

    // 1. Initial Load (Static Data + First Fetch)
    useEffect(() => {
        async function fetchStatic() {
            try {
                const query = getQueryParams();
                const baseUrl = '/api/dashboard';
                const [status] = await Promise.all([
                    fetch(`${baseUrl}/stats-by-status?${query}`).then(r => r.json())
                ]);

                // Transform Status to be resilient
                const transformedStatus = (status.data || []).map((item: any) => ({
                    status: item.name,
                    count: item.value
                }));
                setStatusStats(transformedStatus);

            } catch (error) {
                console.error("Error static:", error);
            }
        }
        fetchStatic();
    }, [getQueryParams]); // Re-fetch on global filter change


    // 2. KPIs - Licitaciones y Monto
    useEffect(() => {
        async function fetchKpis() {
            try {
                setLoadingKpis(true);
                const query = getQueryParams();
                const res = await fetch(`/api/dashboard/kpis?${query}`).then(r => r.json());
                setKpisLic(res);
                setKpisMonto({
                    ...res,
                    monto_total_adjudicado: parseFloat(res?.monto_total_adjudicado || res?.monto_total_estimado || "0")
                });
            } catch (e) {
                console.error("KPI error", e);
            } finally {
                setLoadingKpis(false);
            }
        }
        fetchKpis();
    }, [getQueryParams]);

    // 4a. Map Data - Department Ranking
    useEffect(() => {
        async function fetchDepartmentRanking() {
            setLoadingMap(true);
            try {
                // Special Case: If we select a department on the map, we don't want the MAP ITSELF to filter to only that department (it would look empty).
                // But we DO want it to respect Year/Month/Proc.
                // So we construct a query WITHOUT 'departamento'.
                const params = new URLSearchParams();
                if (filterAnio > 0) params.append("year", filterAnio.toString());
                if (filterMes > 0) params.append("mes", filterMes.toString());
                if (filterTipo) params.append("tipo_procedimiento", filterTipo);

                const baseUrl = '/api/dashboard';
                const deptRes = await fetch(`${baseUrl}/department-ranking?${params.toString()}`).then(r => r.json());
                setDepartmentRanking(deptRes.data || []);
            } catch (error) {
                console.error("Error dept data:", error);
            } finally {
                setLoadingMap(false);
            }
        }
        fetchDepartmentRanking();
    }, [filterAnio, filterMes, filterTipo]); // Depend explicitly on Global Filters

    // 4b. Map Data - Province Ranking (On Map Selection)
    useEffect(() => {
        async function fetchProvinceRanking() {
            if (!selectedMapDept) {
                setProvinceRanking([]);
                return;
            }
            try {
                const cleanDept = selectedMapDept.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

                // Use helper but force department (just in case)
                const query = getQueryParams({
                    department: cleanDept
                });

                const provRes = await fetch(`/api/dashboard/province-ranking?${query}`).then(r => r.json());
                setProvinceRanking(provRes.data || []);
            } catch (error) {
                console.error("Error prov data:", error);
                setProvinceRanking([]);
            }
        }
        fetchProvinceRanking();
    }, [selectedMapDept, getQueryParams]);


    // 3. Monthly Trend
    useEffect(() => {
        async function fetchTrend() {
            try {
                const query = getQueryParams();
                const res = await fetch(`/api/dashboard/monthly-trend?${query}`).then(r => r.json());
                const transformed = (res.data || []).map((item: any) => ({
                    month: item.month || item.name,
                    total: item.total || item.count || item.value || 0
                }));
                setMonthlyTrend(transformed);
            } catch (e) {
                console.error("Trend error", e);
            }
        }
        fetchTrend();
    }, [getQueryParams]);

    // 4. Distribution
    useEffect(() => {
        async function fetchDist() {
            try {
                const query = getQueryParams();
                const res = await fetch(`/api/dashboard/distribution-by-type?${query}`).then(r => r.json());
                const transformed = (res.data || []).map((item: any) => ({
                    type: item.name,
                    total: item.value
                }));
                setDistribution(transformed);
            } catch (e) {
                console.error("Dist error", e);
            }
        }
        fetchDist();
    }, [getQueryParams]);

    // 5. Financial Entities
    useEffect(() => {
        async function fetchFinance() {
            try {
                const query = getQueryParams(); // Respects selectedMapDept if set
                const res = await fetch(`/api/dashboard/financial-entities-ranking?${query}`).then(r => r.json());

                const transformed = (res.data || []).map((item: any) => ({
                    name: item.name,
                    garantias: item.count,
                    monto: item.amount,
                    depts: `${item.dept_count || 0} Depts.`,
                    cobertura: "Nacional"
                }));
                setFinancialEntities(transformed);
            } catch (e) {
                console.error("Finance error", e);
            }
        }
        fetchFinance();
    }, [getQueryParams]);




    // Map click updates local state
    const handleDepartmentClick = useCallback((dept: string | null) => setSelectedMapDept(dept || ""), []);

    const handleClearFilters = () => {
        setFilterAnio(0);
        setFilterMes(0);
        setFilterTipo("");
        setSelectedMapDept("");
    };

    if (loadingKpis && !kpisLic) {
        return (
            <div className="min-h-screen bg-white dark:bg-[#0b122b] p-4 sm:p-6 lg:p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Prep Dept Ranking with percentages
    const totalMapLicitaciones = departmentRanking.reduce((acc: number, item: any) => acc + (item.count || 0), 0) || 1;
    const finalDeptRanking = departmentRanking.map((item: any, index: number) => ({
        rank: index + 1,
        name: item.name,
        count: item.count,
        percentage: Math.round((item.count / totalMapLicitaciones) * 100)
    }));

    // Dynamic Label Logic
    // If a specific procedure is selected, use it. Otherwise "Procesos".
    // We might want to pluralize or format it, but raw string is often okay or we can append "(s)" if needed.
    // For now, let's use the singular term from the filter or "Procesos" (Plural).
    const processLabel = filterTipo ? filterTipo : "Procesos";

    return (
        <div className="min-h-screen bg-white dark:bg-[#0b122b] bg-[radial-gradient(#e2e8f0_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#ffffff03_1.2px,transparent_1.2px)] [background-size:20px_20px] p-4 text-slate-800 dark:text-slate-200 font-sans fade-in transition-colors duration-300 relative overflow-hidden">
            {/* Ambient Background Glow Orbs */}
            <div className="absolute top-1/4 left-[10%] w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-2/3 right-[10%] w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="mx-auto max-w-[1600px] space-y-6 relative z-10">

                {/* --- Display User's Request: Year, Month, Procedure count? --- */}
                {/* --- Filter Bar (Modified to Peak Premium with 3D Relief) --- */}
                <div className="bg-white/95 dark:bg-[#111c44]/95 backdrop-blur-md rounded-2xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.06),_0_2px_4px_rgba(0,0,0,0.02)] border border-slate-300/80 border-t-white/80 dark:border-slate-800/80 dark:border-t-white/10 transition-all duration-300 relative overflow-hidden">
                    {/* Glowing background highlights */}
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute top-0 right-0 w-32 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
                    
                    {/* Decorative Star/Sparkle for high-end feel */}
                    <div className="absolute top-1/2 right-6 -translate-y-1/2 pointer-events-none opacity-20 animate-pulse hidden xl:block">
                        <Sparkles className="w-5 h-5 text-indigo-400 animate-spin [animation-duration:12s]" />
                    </div>

                    <div className="flex flex-col xl:flex-row items-center gap-4 relative z-10">
                        {/* Title Badge (Debossed/Sunken Relief style) */}
                        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 dark:border-indigo-400/30 text-indigo-600 dark:text-indigo-400 font-black text-[10px] tracking-widest uppercase flex-shrink-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <SlidersHorizontal size={12} className="animate-pulse text-indigo-500" />
                            Filtros Inteligentes
                        </div>

                        {/* Filter Inputs Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full flex-1">
                            {/* 1. Procedimiento select (Tactile Beveled 3D style) */}
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

                            {/* 2. Año select (Tactile Beveled 3D style) */}
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

                            {/* 3. Mes select (Tactile Beveled 3D style) */}
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

                        {/* Action Button (Elevated physical click style) */}
                        <button
                            onClick={handleClearFilters}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500/10 to-pink-500/5 hover:from-rose-500 hover:to-pink-500 text-rose-600 hover:text-white border border-rose-500/20 hover:border-transparent text-xs font-black transition-all duration-300 w-full xl:w-auto justify-center shadow-[0_3px_6px_rgba(244,63,94,0.1)] hover:shadow-[0_6px_16px_rgba(244,63,94,0.25)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)] active:translate-y-[1px] active:scale-98"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Limpiar Filtros
                        </button>
                    </div>
                </div>

                {/* --- Main Dashboard Grid --- */}
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

                    {/* ROW 2: Charts (Trend + Distribution) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        {/* Left: Monthly Trend (Main Chart) */}
                        <div className="lg:col-span-8 h-[320px]">
                            <SalesAreaChart
                                data={monthlyTrend}
                                selectedYear={filterAnio}
                                onYearChange={(y) => setFilterAnio(y)}
                                label={processLabel}
                            />
                        </div>

                        {/* Right: Distribution (Radial) */}
                        <div className="lg:col-span-4 h-[320px]">
                            <DistributionRadialChart
                                data={distribution}
                                selectedYear={filterAnio}
                                onYearChange={(y) => setFilterAnio(y)}
                                label={processLabel}
                            />
                        </div>
                    </div>

                    {/* ROW 3: Detailed Tables (Bento Grid Style) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        {/* Left: Peru Interactive Map Heatmap */}
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

                        {/* Middle: Financial & Contratistas Leaderboards */}
                        <div className="lg:col-span-3">
                            <FinancialEntitiesTable
                                data={financialEntities}
                                selectedYear={filterAnio}
                                onYearChange={(y) => setFilterAnio(y)}
                                selectedDepartment={selectedMapDept}
                            />
                        </div>

                        {/* Right: Real-time Activity Radar Feed */}
                        <div className="lg:col-span-3">
                            <ActivityRadar />
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
