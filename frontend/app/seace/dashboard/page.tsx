"use client";

import React, { useEffect, useState, useCallback } from "react";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import { DistributionRadialChart } from "@/components/ecommerce/DistributionRadialChart";

import { SalesAreaChart } from "@/components/ecommerce/SalesAreaChart";
import { PeruInteractiveMap } from "@/components/ecommerce/PeruInteractiveMap";
import { FinancialEntitiesTable } from "@/components/ecommerce/FinancialEntitiesTable";
import { licitacionService } from "@/lib/services/licitacionService";
import { DEFAULT_TIPOS_PROCEDIMIENTO } from "@/lib/constants/procedimientos";
import { ChevronDown, Filter, RotateCcw } from "lucide-react";

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


    // 2a. KPIs - Licitaciones
    useEffect(() => {
        async function fetchKpisLic() {
            try {
                setLoadingKpis(true);
                const query = getQueryParams();
                const res = await fetch(`/api/dashboard/kpis?${query}`).then(r => r.json());
                setKpisLic(res);
            } catch (e) {
                console.error("KPI Lic error", e);
            } finally {
                setLoadingKpis(false);
            }
        }
        fetchKpisLic();
    }, [getQueryParams]);

    // 2b. KPIs - Monto
    useEffect(() => {
        async function fetchKpisMonto() {
            try {
                const query = getQueryParams();
                const res = await fetch(`/api/dashboard/kpis?${query}`).then(r => r.json());
                setKpisMonto({
                    ...res,
                    monto_total_adjudicado: parseFloat(res?.monto_total_estimado || "0")
                });
            } catch (e) {
                console.error("KPI Monto error", e);
            }
        }
        fetchKpisMonto();
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
            <div className="min-h-screen bg-slate-50 dark:bg-[#0b122b] p-4 sm:p-6 lg:p-8 flex items-center justify-center">
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
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b122b] p-4 text-slate-800 dark:text-slate-200 font-sans fade-in transition-colors duration-300">
            <div className="mx-auto max-w-[1600px] space-y-6">

                {/* --- Display User's Request: Year, Month, Procedure count? --- */}
                {/* --- Filter Bar (Modified) --- */}
                <div className="bg-white dark:bg-[#111c44] rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-white/5">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-sm min-w-max">
                            <Filter size={18} />
                            Filtros:
                        </div>

                        {/* 1. Procedimiento ("Recuento de cada proceso") - MOVED TO FIRST */}
                        <div className="relative w-full md:w-auto flex-1">
                            <select
                                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-10 text-xs font-bold text-slate-700 focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10 outline-none transition-all dark:bg-[#0b122b] dark:border-slate-700 dark:text-white"
                                value={filterTipo}
                                onChange={(e) => setFilterTipo(e.target.value)}
                            >
                                <option value="">Todos los Procedimientos</option>
                                {options.tipos && options.tipos.map((t: string) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>

                        {/* 2. Año - MOVED TO SECOND */}
                        <div className="relative w-full md:w-40">
                            <select
                                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-10 text-xs font-bold text-slate-700 focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10 outline-none transition-all dark:bg-[#0b122b] dark:border-slate-700 dark:text-white"
                                value={filterAnio}
                                onChange={(e) => setFilterAnio(Number(e.target.value))}
                            >
                                <option value="0">Todos los Años</option>
                                {options.anios && options.anios.map((y: any) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>

                        {/* 3. Mes - MOVED TO THIRD */}
                        <div className="relative w-full md:w-40">
                            <select
                                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-10 text-xs font-bold text-slate-700 focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10 outline-none transition-all dark:bg-[#0b122b] dark:border-slate-700 dark:text-white"
                                value={filterMes}
                                onChange={(e) => setFilterMes(Number(e.target.value))}
                            >
                                <option value="0">Todos los Meses</option>
                                {options.meses.map((m) => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>



                        <button
                            onClick={handleClearFilters}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100 text-xs font-bold hover:bg-red-100 transition-all ml-auto"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Limpiar
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
                            // Pass Global Filter State (could be overridden by local controls inside component if implemented, but here we just pass props)
                            yearLic={filterAnio}
                            onYearLicChange={(y) => setFilterAnio(y)}
                            yearMonto={filterAnio}
                            onYearMontoChange={(y) => setFilterAnio(y)}
                            label={processLabel}
                        />
                    </div>

                    {/* ROW 2: Charts (Trend + Distribution) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        {/* Left: Monthly Trend (Main Chart) */}
                        <div className="lg:col-span-8 h-[500px]">
                            <SalesAreaChart
                                data={monthlyTrend}
                                selectedYear={filterAnio}
                                onYearChange={(y) => setFilterAnio(y)}
                                label={processLabel}
                            />
                        </div>

                        {/* Right: Distribution (Radial) */}
                        <div className="lg:col-span-4 h-[500px]">
                            <DistributionRadialChart
                                data={distribution}
                                selectedYear={filterAnio}
                                onYearChange={(y) => setFilterAnio(y)}
                                label={processLabel}
                            />
                        </div>
                    </div>

                    {/* ROW 3: Detailed Tables */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Left: Peru Interactive Map (Narrower) */}
                        <div className="lg:col-span-5">
                            <PeruInteractiveMap
                                departmentRanking={finalDeptRanking}
                                provinceRanking={provinceRanking}
                                selectedDepartment={selectedMapDept}
                                onDepartmentClick={handleDepartmentClick}
                                loading={loadingMap}
                                label={processLabel}
                            />
                        </div>

                        {/* Right: Financial Entities (Wider) */}
                        <div className="lg:col-span-7">
                            <FinancialEntitiesTable
                                data={financialEntities}
                                selectedYear={filterAnio}
                                onYearChange={(y) => setFilterAnio(y)}
                            />
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
