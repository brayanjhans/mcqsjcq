"use client";

import React, { useState, useEffect } from "react";
import {
    Search,
    Filter,
    RotateCcw,
    FileText,
    FileSpreadsheet,
    File,
    Calendar,
    Download,
    ChevronUp,
    ChevronDown,
    Eye,
    CheckCircle2
} from "lucide-react";
import { licitacionService } from "@/lib/services/licitacionService";
import { LicitacionCard } from "@/components/search/LicitacionCard";
import { AutocompleteSearch } from "@/components/search/AutocompleteSearch";
import type { Licitacion } from "@/types/licitacion";

const DEFAULT_TIPOS_PROCEDIMIENTO = [
    "Adjudicación Abreviada",
    "Adjudicación Directa Pública",
    "Adjudicación Directa Selectiva",
    "Adjudicación Selectiva",
    "Adjudicación Simplificada",
    "Adjudicación Simplificada - Décima Disposición Complementaria Final Reg. Ley 30225",
    "Adjudicación Simplificada - Decreto Urgencia 012-2023",
    "Adjudicación Simplificada - Decreto Urgencia 032-2023",
    "Adjudicación Simplificada - Decreto Urgencia 034-2023",
    "Adjudicación Simplificada - Ley Nº 26859",
    "Adjudicación Simplificada - Ley Nº 30556",
    "Adjudicación Simplificada - Ley N° 31125",
    "Adjudicación Simplificada - Ley N° 31579",
    "Adjudicación Simplificada - Ley N° 31589",
    "Adjudicación Simplificada - Ley N° 31728",
    "Concurso Público",
    "Concurso Público de Servicios",
    "Licitación Pública",
    "Licitación Pública Abreviada",
    "Licitación Pública Abreviada - Ley N°26859",
    "Licitación Pública Abreviada - Ley N°31589",
    "Licitación Pública Abreviada Emergencia",
    "Licitación Pública Abreviada Homologación",
    "Licitación Pública Abreviada Séptima DCF Ley N°32069",
    "Procedimiento Especial de Selección",
    "Subasta Inversa Electrónica"
];

export default function GeneradorReportesPage() {
    // State for Filter Visibility
    const [showFilters, setShowFilters] = useState(true);

    // Filter States - Values (Standardized as "")
    const [searchTerm, setSearchTerm] = useState("");
    const [departamento, setDepartamento] = useState("");
    const [estado, setEstado] = useState("");
    const [categoria, setCategoria] = useState("");
    const [anio, setAnio] = useState("");
    const [mes, setMes] = useState("");
    const [provincia, setProvincia] = useState("");
    const [distrito, setDistrito] = useState("");
    const [tipoGarantia, setTipoGarantia] = useState("");
    const [aseguradora, setAseguradora] = useState("");
    const [entidad, setEntidad] = useState("");
    const [tipoProcedimiento, setTipoProcedimiento] = useState("");

    // Dynamic Filter Options
    const [filterOptions, setFilterOptions] = useState<any>({
        departamentos: [],
        estados: [],
        categorias: [],
        tipos_garantia: [],
        aseguradoras: [],
        entidades: [],
        anios: []
    });
    const [provinciasOptions, setProvinciasOptions] = useState<string[]>([]);
    const [distritosOptions, setDistritosOptions] = useState<string[]>([]);

    // Data State
    const [licitaciones, setLicitaciones] = useState<Licitacion[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(12);
    const [totalPages, setTotalPages] = useState(0);

    // Stats
    const [totalResultados, setTotalResultados] = useState(0);

    // Load Global Filters
    useEffect(() => {
        const loadFilters = async () => {
            try {
                const data = await licitacionService.getFilters();
                setFilterOptions({
                    departamentos: data.departamentos || [],
                    estados: data.estados || [],
                    categorias: data.categorias || [],
                    tipos_garantia: data.tipos_garantia || [],
                    aseguradoras: data.aseguradoras || [],
                    entidades: data.entidades || [],
                    anios: data.anios || []
                });
            } catch (error) {
                console.error("Error loading filters:", error);
            }
        };
        loadFilters();
    }, []);

    // Reactive / Faceted Filters Logic
    useEffect(() => {
        const loadFacetedFilters = async () => {
            const filters: any = {};
            if (searchTerm) filters.search = searchTerm;
            if (estado) filters.estado = estado;
            if (departamento) filters.departamento = departamento;
            if (categoria) filters.categoria = categoria;
            if (anio) filters.anio = anio;
            if (mes) filters.mes = Number(mes);

            try {
                // Get updated options based on current selections
                const data = await licitacionService.getFilters(filters);
                setFilterOptions({
                    departamentos: data.departamentos || [],
                    estados: data.estados || [],
                    categorias: data.categorias || [],
                    tipos_garantia: data.tipos_garantia || [],
                    aseguradoras: data.aseguradoras || [],
                    entidades: data.entidades || [],
                    anios: data.anios || []
                });
            } catch (error) {
                console.error("Error faceted filters:", error);
            }
        };
        const timer = setTimeout(loadFacetedFilters, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, estado, departamento, categoria, anio, mes]);

    // Calculate Results Count (Preview)
    useEffect(() => {
        const fetchCount = async () => {
            const filters: any = {};
            if (searchTerm) filters.search = searchTerm;
            if (estado) filters.estado = estado;
            if (departamento) filters.departamento = departamento;
            if (categoria) filters.categoria = categoria;
            if (anio) filters.anio = anio;
            if (mes) filters.mes = Number(mes);
            if (provincia) filters.provincia = provincia;
            if (distrito) filters.distrito = distrito;
            if (tipoGarantia) filters.tipo_garantia = tipoGarantia;
            if (aseguradora) filters.entidad_financiera = aseguradora;
            if (entidad) filters.comprador = entidad;

            try {
                // Fetch just 1 item to get the total count in metadata
                const response = await licitacionService.getAll(1, 1, filters);
                setTotalResultados(response.total);
            } catch (error) {
                console.error("Error counting results:", error);
            }
        };
        // Debounce calculation
        const timer = setTimeout(fetchCount, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, estado, departamento, categoria, anio, mes, provincia, distrito, tipoGarantia, aseguradora, entidad, tipoProcedimiento]);

    // Fetch Results Handling
    const fetchResultados = async (page = 1) => {
        setLoading(true);
        try {
            const filters: any = {};
            if (searchTerm) filters.search = searchTerm;
            if (estado) filters.estado = estado;
            if (departamento) filters.departamento = departamento;
            if (categoria) filters.categoria = categoria;
            if (anio) filters.anio = anio;
            if (mes) filters.mes = Number(mes);
            if (provincia) filters.provincia = provincia;
            if (distrito) filters.distrito = distrito;
            if (tipoGarantia) filters.tipo_garantia = tipoGarantia;
            if (aseguradora) filters.entidad_financiera = aseguradora;
            if (entidad) filters.comprador = entidad;
            if (tipoProcedimiento) filters.tipo_procedimiento = tipoProcedimiento;

            const data = await licitacionService.getAll(page, itemsPerPage, filters);
            setLicitaciones(data.items);

            // Auto-select all fetched items by default
            setSelectedIds(data.items.map((item: any) => item.id_convocatoria));

            setTotalResultados(data.total);
            setTotalPages(data.total_pages);
            setCurrentPage(data.page);
        } catch (error) {
            console.error("Error fetching preview:", error);
            setLicitaciones([]);
            setSelectedIds([]);
        } finally {
            setLoading(false);
        }
    };


    // Cascading Location: Departamento -> Provincia
    useEffect(() => {
        const fetchProvincias = async () => {
            setProvincia("");
            setDistrito("");
            setProvinciasOptions([]);
            setDistritosOptions([]);

            if (departamento) {
                try {
                    const data = await licitacionService.getLocations(departamento);
                    setProvinciasOptions(data.provincias || []);
                } catch (error) {
                    console.error("Error loading provincias:", error);
                }
            }
        };
        fetchProvincias();
    }, [departamento]);

    // Cascading Location: Provincia -> Distrito
    useEffect(() => {
        const fetchDistritos = async () => {
            setDistrito("");
            setDistritosOptions([]);

            if (provincia && departamento) {
                try {
                    const data = await licitacionService.getLocations(departamento, provincia);
                    setDistritosOptions(data.distritos || []);
                } catch (error) {
                    console.error("Error loading distritos:", error);
                }
            }
        };
        fetchDistritos();
    }, [provincia, departamento]);


    const handleClear = () => {
        setSearchTerm("");
        setDepartamento("");
        setEstado("");
        setCategoria("");
        setAnio("");
        setMes("");
        setProvincia("");
        setDistrito("");
        setTipoGarantia("");
        setAseguradora("");
        setEntidad("");
        setTipoProcedimiento("");
    };

    // Selection State
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectAllMatches, setSelectAllMatches] = useState(false); // New state for "Select All 162"

    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
        if (selectedIds.length === 0 && !selectAllMatches) return;

        setIsExporting(true);
        try {
            // Reconstruct filters
            const filters: any = {};
            if (searchTerm) filters.search = searchTerm;
            if (estado) filters.estado = estado;
            if (departamento) filters.departamento = departamento;
            if (categoria) filters.categoria = categoria;
            if (anio) filters.anio = anio;
            if (mes) filters.mes = Number(mes);
            if (provincia) filters.provincia = provincia;
            if (distrito) filters.distrito = distrito;
            if (tipoGarantia) filters.tipo_garantia = tipoGarantia;
            if (aseguradora) filters.entidad_financiera = aseguradora;
            if (entidad) filters.comprador = entidad;

            await licitacionService.exportData(format, selectedIds, selectAllMatches, filters);
        } catch (error) {
            console.error("Export failed:", error);
            // Could add toast notification here
        } finally {
            setIsExporting(false);
        }
    };

    const handleToggleSelect = (id: string) => {
        // If we were in "Select All Matches" mode, toggling one off switches back to manual mode
        // Ideally we might want "All except one", but for simplicity, let's just switch back or warn.
        // For now: If deselecting while in 'selectAllMatches', we simply disable 'selectAllMatches' 
        // and keep the current page selected (minus the one). 
        // Logic: specific exclusion is hard without all IDs. 
        // Better UX: Just toggle the ID in the local set. If selectAllMatches IS TRUE, 
        // we essentially treat it as "Visual Select All". 
        // Real implementation: If selectAllMatches is true, we shouldn't really allow distinct toggling easily without complex exclusion logic.
        // Let's effectively turn OFF selectAllMatches if user interacts manually, OR handle it.

        if (selectAllMatches) {
            setSelectAllMatches(false);
            // We keep the current page selected except the one clicked?
            // Or we just reset to manual selection of the current page.
            if (selectedIds.includes(id)) {
                setSelectedIds(prev => prev.filter(item => item !== id));
            }
        } else {
            setSelectedIds(prev =>
                prev.includes(id)
                    ? prev.filter(item => item !== id)
                    : [...prev, id]
            );
        }
    };

    const handleDeselectAll = () => {
        setSelectedIds([]);
        setSelectAllMatches(false);
    };

    const handleSelectAllMatches = () => {
        setSelectAllMatches(true);
        // Visual feedback: ensure all visible are checked (they likely already are)
        const allPageIds = licitaciones.map(l => l.id_convocatoria);
        // Ensure current page is fully selected visually
        setSelectedIds(prev => Array.from(new Set([...prev, ...allPageIds])));
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b122b] p-4 sm:p-6 lg:p-8 transition-colors duration-300">
            <div className="mx-auto max-w-7xl">

                {/* Main Card Container */}
                <div className="rounded-3xl bg-white shadow-sm border border-slate-200 dark:bg-[#111c44] dark:border-white/5 overflow-hidden">

                    {/* Header Section */}
                    <div className="p-8 pb-6 border-b border-slate-100 dark:border-white/5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                                    Generador de Reportes
                                </h1>
                                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Genera reportes personalizados con filtros avanzados y exporta a múltiples formatos
                                </p>
                            </div>

                            <div className="flex items-center gap-3 self-start md:self-auto">
                                {(selectedIds.length > 0 || selectAllMatches) && (
                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 animate-in fade-in">
                                        {selectAllMatches ? totalResultados : selectedIds.length} seleccionados
                                    </span>
                                )}
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F46E5] text-white text-xs font-bold hover:bg-[#4338ca] shadow-lg shadow-indigo-500/30 transition-all"
                                >
                                    {showFilters ? 'Menos Filtros' : 'Más Filtros'}
                                    {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={handleClear}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100 text-xs font-bold hover:bg-red-100 transition-all"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Limpiar
                                </button>
                            </div>
                        </div>

                        {/* Search Bar & Primary Filter */}
                        <div className="mb-8 flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <AutocompleteSearch
                                    onSearch={setSearchTerm}
                                    initialValue={searchTerm}
                                    placeholder="Buscar por descripción, comprador, nomenclatura, ganador, banco..."
                                />
                            </div>
                            <div className="w-full md:w-64 flex-shrink-0">
                                <div className="relative">
                                    <select
                                        className="w-full h-[52px] appearance-none rounded-xl border-2 border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10 outline-none transition-all dark:bg-[#0b122b] dark:border-slate-700 dark:text-white"
                                        value={tipoProcedimiento}
                                        onChange={(e) => setTipoProcedimiento(e.target.value)}
                                    >
                                        <option value="">Todos los procedimientos</option>
                                        {DEFAULT_TIPOS_PROCEDIMIENTO.map((tipo) => (
                                            <option key={tipo} value={tipo}>{tipo}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Filters Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                            {/* Departamento */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Departamento</label>
                                <div className="relative">
                                    <select
                                        value={departamento}
                                        onChange={(e) => setDepartamento(e.target.value)}
                                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300"
                                    >
                                        <option value="">Todos los departamentos</option>
                                        {filterOptions.departamentos.map((dept: string) => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Estado */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Estado del Proceso</label>
                                <div className="relative">
                                    <select
                                        value={estado}
                                        onChange={(e) => setEstado(e.target.value)}
                                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300"
                                    >
                                        <option value="">Todos los estados</option>
                                        {filterOptions.estados.map((item: string) => (
                                            <option key={item} value={item}>{item}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Categoria */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Categoría</label>
                                <div className="relative">
                                    <select
                                        value={categoria}
                                        onChange={(e) => setCategoria(e.target.value)}
                                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300"
                                    >
                                        <option value="">Todas las categorías</option>
                                        {filterOptions.categorias.map((item: string) => (
                                            <option key={item} value={item}>{item}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Periodo (Double Select) */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Periodo</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <select
                                            value={anio}
                                            onChange={(e) => setAnio(e.target.value)}
                                            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-8 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300"
                                        >
                                            <option value="">Año</option>
                                            {/* Dynamic years */}
                                            {filterOptions.anios.map((item: number) => (
                                                <option key={item} value={item}>{item}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                    </div>
                                    <div className="relative">
                                        <select
                                            value={mes}
                                            onChange={(e) => setMes(e.target.value)}
                                            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-8 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300"
                                        >
                                            <option value="">Mes</option>
                                            {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => (
                                                <option key={m} value={i + 1}>{m}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Advanced Filters Section */}
                        {showFilters && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Ubicación Detallada</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="relative">
                                            <select
                                                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-8 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300 disabled:opacity-50"
                                                value={provincia} onChange={(e) => setProvincia(e.target.value)}
                                                disabled={!departamento}
                                            >
                                                <option value="">Provincia</option>
                                                {provinciasOptions.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                        </div>
                                        <div className="relative">
                                            <select
                                                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-8 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300 disabled:opacity-50"
                                                value={distrito} onChange={(e) => setDistrito(e.target.value)}
                                                disabled={!provincia}
                                            >
                                                <option value="">Distrito</option>
                                                {distritosOptions.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Tipo de Garantía</label>
                                    <div className="relative">
                                        <select
                                            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300"
                                            value={tipoGarantia} onChange={(e) => setTipoGarantia(e.target.value)}
                                        >
                                            <option value="">Todos los tipos</option>
                                            {filterOptions.tipos_garantia.map((item: string) => (
                                                <option key={item} value={item}>{item}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Aseguradora</label>
                                    <div className="relative">
                                        <select
                                            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300"
                                            value={aseguradora} onChange={(e) => setAseguradora(e.target.value)}
                                        >
                                            <option value="">Todas las aseguradoras</option>
                                            {filterOptions.aseguradoras.map((item: string) => (
                                                <option key={item} value={item}>{item}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Entidad o Consorcio</label>
                                    <div className="relative">
                                        <select
                                            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300"
                                            value={entidad} onChange={(e) => setEntidad(e.target.value)}
                                        >
                                            <option value="">Todas las entidades</option>
                                            {filterOptions.entidades.map((item: string) => (
                                                <option key={item} value={item}>{item}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* Select All Banner (Gmail style) */}
                {!selectAllMatches && totalResultados > selectedIds.length && selectedIds.length > 0 && (
                    <div className="mt-4 flex justify-center fade-in slide-in-from-top-2 duration-300">
                        <div className="bg-blue-50 border border-blue-100 text-blue-800 text-xs font-semibold px-4 py-3 rounded-xl shadow-sm flex items-center gap-3">
                            <span>
                                Se han seleccionado <strong>{selectedIds.length}</strong> items de esta página.
                            </span>
                            <button
                                onClick={handleSelectAllMatches}
                                className="text-blue-600 hover:text-blue-800 underline decoration-blue-300 font-bold"
                            >
                                Seleccionar los {totalResultados} resultados encontrados
                            </button>
                        </div>
                    </div>
                )}
                {selectAllMatches && (
                    <div className="mt-4 flex justify-center fade-in slide-in-from-top-2 duration-300">
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold px-4 py-3 rounded-xl shadow-sm flex items-center gap-3">
                            <span>
                                <CheckCircle2 className="w-4 h-4 inline mr-2 -mt-0.5" />
                                Se han seleccionado todos los <strong>{totalResultados}</strong> resultados de la búsqueda.
                            </span>
                            <button
                                onClick={handleDeselectAll}
                                className="text-emerald-600 hover:text-emerald-800 underline decoration-emerald-300 font-bold"
                            >
                                Borrar selección
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer Actions - Separated Row */}
                <div className="mt-8 p-4 md:p-6 bg-white dark:bg-[#111c44] rounded-3xl shadow-sm border border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">

                    <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
                        <button
                            onClick={() => fetchResultados(1)}
                            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#2563EB] text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-[#1d4ed8] transition-all active:scale-95"
                        >
                            <Eye className="w-4 h-4" />
                            {loading ? "Cargando..." : "Generar Vista Previa"}
                        </button>

                        <div className="flex items-center h-8 gap-6 border-l border-slate-200 pl-6 dark:border-white/10 hidden md:flex">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Resultados</span>
                                <span className="text-sm font-extrabold text-slate-800 dark:text-white">
                                    {totalResultados} <span className="font-medium text-slate-500">encontrados</span>
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Selección</span>
                                <span className="text-sm font-extrabold text-[#2563EB]">
                                    {selectAllMatches ? totalResultados : selectedIds.length} <span className="font-medium text-slate-500 text-[#2563EB]/80">items</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse md:flex-row items-center gap-6 w-full md:w-auto justify-end">
                        <button
                            onClick={handleDeselectAll}
                            disabled={selectedIds.length === 0 && !selectAllMatches}
                            className="text-xs font-bold text-slate-500 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Deseleccionar Todos
                        </button>

                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-500 mr-1">Exportar{selectAllMatches ? ' Todo' : ''}:</span>

                            <button
                                onClick={() => handleExport('pdf')}
                                disabled={isExporting || (selectedIds.length === 0 && !selectAllMatches)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 hover:border-red-400 bg-white text-slate-700 hover:text-red-600 transition-all shadow-sm group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FileText className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">PDF</span>
                            </button>

                            <button
                                onClick={() => handleExport('excel')}
                                disabled={isExporting || (selectedIds.length === 0 && !selectAllMatches)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-200 hover:border-emerald-400 bg-white text-slate-700 hover:text-emerald-600 transition-all shadow-sm group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FileSpreadsheet className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">Excel</span>
                            </button>

                            <button
                                onClick={() => handleExport('csv')}
                                disabled={isExporting || (selectedIds.length === 0 && !selectAllMatches)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-400 bg-white text-slate-700 hover:text-slate-900 transition-all shadow-sm group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <File className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">CSV</span>
                            </button>
                        </div>
                    </div>

                </div>

                {/* Placeholder for Results / Table */}
                {/* Results Grid */}
                <div className="mt-8">
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-64 rounded-2xl bg-slate-200/50 animate-pulse dark:bg-slate-800/50"></div>
                            ))}
                        </div>
                    ) : licitaciones.length > 0 ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {licitaciones.map((lic) => (
                                    <LicitacionCard
                                        key={lic.id_convocatoria}
                                        licitacion={lic}
                                        basePath="/seace/reportes"
                                        selectable={true}
                                        isSelected={selectedIds.includes(lic.id_convocatoria) || selectAllMatches}
                                        onToggleSelect={handleToggleSelect}
                                    />
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-center pt-10 pb-6">
                                    <nav className="flex items-center gap-6" aria-label="Pagination">
                                        <button
                                            onClick={() => fetchResultados(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                            className="group flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
                                        >
                                            <div className="p-2 rounded-full group-hover:bg-slate-100 dark:group-hover:bg-white/5 transition-colors">
                                                <ChevronUp className="h-4 w-4 -rotate-90" />
                                            </div>
                                            <span className="hidden sm:inline">Anterior</span>
                                        </button>

                                        <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                            Página <span className="text-slate-900 dark:text-white font-bold mx-1">{currentPage}</span> de <span className="mx-1">{totalPages}</span>
                                        </div>

                                        <button
                                            onClick={() => fetchResultados(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                            className="group flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
                                        >
                                            <span className="hidden sm:inline">Siguiente</span>
                                            <div className="p-2 rounded-full group-hover:bg-slate-100 dark:group-hover:bg-white/5 transition-colors">
                                                <ChevronDown className="h-4 w-4 -rotate-90" />
                                            </div>
                                        </button>
                                    </nav>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl dark:border-slate-700">
                            <p className="text-slate-400 text-sm font-medium">
                                {totalResultados === 0 && !searchTerm && !departamento ?
                                    "Utiliza los filtros y genera una vista previa" :
                                    "No se encontraron resultados para los filtros aplicados"
                                }
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
