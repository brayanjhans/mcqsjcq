"use client";

import React, { useState, useEffect, Suspense } from "react";
import { LicitacionCard } from "@/components/search/LicitacionCard";
import { LicitacionTable } from "@/components/search/LicitacionTable";
import { AutocompleteSearch } from "@/components/search/AutocompleteSearch";
import { SunatRucPanel } from "@/components/search/SunatRucPanel";
import type { Licitacion } from "@/types/licitacion";
import { licitacionService } from "@/lib/services/licitacionService";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { CompactSelect } from "@/components/ui/CompactSelect";
import {
    Search,
    ChevronUp,
    ChevronDown,
    RotateCcw,
    Building2,
    Loader2,
    LayoutGrid,
    List
} from "lucide-react";

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
    "Contratación Directa",
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

function BusquedaContent() {
    const searchParams = useSearchParams();

    // Filter State (Matching Gestion Manual & Reportes)
    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || searchParams.get('search') || "");
    const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

    // Select States - Values
    const [departamento, setDepartamento] = useState(searchParams.get('departamento') || "");
    const [estado, setEstado] = useState(searchParams.get('estado') || "");
    const [categoria, setCategoria] = useState(searchParams.get('categoria') || "");
    const [anio, setAnio] = useState(searchParams.get('anio') || "");
    const [mes, setMes] = useState(searchParams.get('mes') || "");
    const [provincia, setProvincia] = useState(searchParams.get('provincia') || "");
    const [distrito, setDistrito] = useState(searchParams.get('distrito') || "");
    const [tipoGarantia, setTipoGarantia] = useState(searchParams.get('tipo_garantia') || "");
    const [aseguradora, setAseguradora] = useState(searchParams.get('aseguradora') || "");
    const [entidad, setEntidad] = useState(searchParams.get('entidad') || "");
    const [tipoProcedimiento, setTipoProcedimiento] = useState(searchParams.get('tipo_procedimiento') || "");

    // Select States - Options (Dynamic)
    const [departamentoOptions, setDepartamentoOptions] = useState<string[]>([]);
    const [estadoOptions, setEstadoOptions] = useState<string[]>([]);
    const [categoriaOptions, setCategoriaOptions] = useState<string[]>([]);
    const [anioOptions, setAnioOptions] = useState<string[]>([]);
    const [tipoGarantiaOptions, setTipoGarantiaOptions] = useState<string[]>([]);
    const [aseguradoraOptions, setAseguradoraOptions] = useState<string[]>([]);
    const [entidadOptions, setEntidadOptions] = useState<string[]>([]);
    const [tipoProcedimientoOptions, setTipoProcedimientoOptions] = useState<string[]>([]);

    // Cascading Location Options
    const [provinciaOptions, setProvinciaOptions] = useState<string[]>([]);
    const [distritoOptions, setDistritoOptions] = useState<string[]>([]);

    // Pagination & Data State
    const [licitaciones, setLicitaciones] = useState<Licitacion[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
    const [itemsPerPage, setItemsPerPage] = useState(12);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);

    // SUNAT RUC Integration State
    const [sunatData, setSunatData] = useState<any>(null);
    const [sunatLoading, setSunatLoading] = useState(false);
    const [sunatVisible, setSunatVisible] = useState(false);

    // URL Persistence Logic
    const router = useRouter();
    const pathname = usePathname();

    // Debounced URL update to avoid browser history spam
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const params = new URLSearchParams();

            // Only add params if they have values
            if (searchTerm) params.set('q', searchTerm);
            if (currentPage > 1) params.set('page', currentPage.toString());
            if (departamento) params.set('departamento', departamento);
            if (estado) params.set('estado', estado);
            if (categoria) params.set('categoria', categoria);
            if (anio) params.set('anio', anio);
            if (mes) params.set('mes', mes);
            if (provincia) params.set('provincia', provincia);
            if (distrito) params.set('distrito', distrito);
            if (tipoGarantia) params.set('tipo_garantia', tipoGarantia);
            if (aseguradora) params.set('aseguradora', aseguradora);
            if (entidad) params.set('entidad', entidad);
            if (tipoProcedimiento) params.set('tipo_procedimiento', tipoProcedimiento);

            // Construct new URL
            const newUrl = `${pathname}?${params.toString()}`;

            // Check if URL actually changed to avoid redundant replace
            if (newUrl !== window.location.pathname + window.location.search) {
                router.replace(newUrl, { scroll: false });
            }

        }, 500); // 500ms delay

        return () => clearTimeout(timeoutId);
    }, [
        searchTerm, currentPage, departamento, estado, categoria,
        anio, mes, provincia, distrito, tipoGarantia,
        aseguradora, entidad, tipoProcedimiento,
        pathname, router
    ]);
    useEffect(() => {
        const loadFilters = async () => {
            try {
                const filters = await licitacionService.getFilters();
                if (filters) {
                    setDepartamentoOptions(filters.departamentos || []);
                    setEstadoOptions(filters.estados || []);
                    setCategoriaOptions(filters.categorias || []);
                    setTipoGarantiaOptions(filters.tipos_garantia || []);
                    setAseguradoraOptions(filters.aseguradoras || []);
                    setEntidadOptions(filters.entidades || []);
                    setAnioOptions(filters.anios || []);
                    setTipoProcedimientoOptions(filters.tipos_entidad || []);
                }
            } catch (error) {
                console.error("Error loading filters:", error);
            }
        };
        loadFilters();
    }, []); // Run only once on mount

    // Cascading: Load Provincias when Departamento changes

    // Cascading: Load Provincias when Departamento changes
    useEffect(() => {
        const fetchProvincias = async () => {
            setProvinciaOptions([]);
            if (departamento) {
                try {
                    const data = await licitacionService.getLocations(departamento);
                    if (data.provincias) {
                        setProvinciaOptions(data.provincias);
                    }
                } catch (error) {
                    console.error("Error loading provincias:", error);
                }
            }
        };
        fetchProvincias();
    }, [departamento]);

    // Cascading: Load Distritos when Provincia changes
    useEffect(() => {
        const fetchDistritos = async () => {
            setDistritoOptions([]);
            if (provincia && departamento) {
                try {
                    const data = await licitacionService.getLocations(departamento, provincia);
                    if (data.distritos) {
                        setDistritoOptions(data.distritos);
                    }
                } catch (error) {
                    console.error("Error loading distritos:", error);
                }
            }
        };
        fetchDistritos();
    }, [provincia, departamento]);

    const handleDepartamentoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setDepartamento(e.target.value);
        setProvincia("");
        setDistrito("");
    };

    const handleProvinciaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setProvincia(e.target.value);
        setDistrito("");
    };

    const fetchLicitaciones = async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (searchTerm) filters.search = searchTerm;
            if (departamento) filters.departamento = departamento;
            if (estado) filters.estado = estado;
            if (categoria) filters.categoria = categoria;
            if (anio) filters.year = anio;
            if (mes) {
                const monthMap: { [key: string]: number } = { "Enero": 1, "Febrero": 2, "Marzo": 3, "Abril": 4, "Mayo": 5, "Junio": 6, "Julio": 7, "Agosto": 8, "Septiembre": 9, "Octubre": 10, "Noviembre": 11, "Diciembre": 12 };
                filters.mes = monthMap[String(mes)] || Number(mes);
            }
            if (provincia) filters.provincia = provincia;
            if (distrito) filters.distrito = distrito;
            if (tipoGarantia) filters.tipo_garantia = tipoGarantia;
            if (aseguradora) filters.entidad_financiera = aseguradora;
            if (entidad) filters.comprador = entidad;
            if (tipoProcedimiento) filters.tipo_procedimiento = tipoProcedimiento;

            const data = await licitacionService.getAll(currentPage, itemsPerPage, filters);

            setLicitaciones(data.items);
            setTotalPages(data.total_pages);
            setTotalItems(data.total);

        } catch (error) {
            console.error("Error cargando licitaciones:", error);
            setLicitaciones([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLicitaciones();
    }, [currentPage, itemsPerPage, searchTerm, departamento, estado, categoria, anio, mes, provincia, distrito, tipoGarantia, aseguradora, entidad, tipoProcedimiento]);

    // SUNAT: Auto-detect RUC (11 digits) and trigger lookup
    useEffect(() => {
        const term = searchTerm.trim();
        const isRuc = /^\d{11}$/.test(term);
        if (isRuc) {
            handleSunatRucLookup(term);
        } else {
            // Clear SUNAT panel if searchTerm is no longer a RUC
            if (sunatData && !Array.isArray(sunatData)) {
                setSunatData(null);
                setSunatVisible(false);
            }
        }
    }, [searchTerm]);

    const handleSunatRucLookup = async (ruc: string, refresh = false) => {
        setSunatLoading(true);
        setSunatVisible(true);
        try {
            const data = await licitacionService.consultarSunatRuc(ruc, refresh);
            setSunatData(data);
        } catch (error) {
            console.error("Error consultando SUNAT:", error);
            setSunatData({ encontrado: false, error: "Error al consultar SUNAT", ruc });
        } finally {
            setSunatLoading(false);
        }
    };

    const handleSunatNameSearch = async () => {
        const term = searchTerm.trim();
        if (term.length < 3) return;
        setSunatLoading(true);
        setSunatVisible(true);
        try {
            const data = await licitacionService.buscarSunatNombre(term);
            if (data.resultados && data.resultados.length > 0) {
                setSunatData(data.resultados);
            } else {
                setSunatData({ encontrado: false, error: data.mensaje || "No se encontraron RUCs para ese nombre", ruc: "" });
            }
        } catch (error) {
            console.error("Error buscando SUNAT por nombre:", error);
            setSunatData({ encontrado: false, error: "Error al buscar en SUNAT", ruc: "" });
        } finally {
            setSunatLoading(false);
        }
    };

    const handleFetchAllLicitaciones = async () => {
        try {
            const filters: any = {};
            if (searchTerm) filters.search = searchTerm;
            if (departamento) filters.departamento = departamento;
            if (estado) filters.estado = estado;
            if (categoria) filters.categoria = categoria;
            if (anio) filters.year = anio;
            if (mes) {
                const monthMap: { [key: string]: number } = { "Enero": 1, "Febrero": 2, "Marzo": 3, "Abril": 4, "Mayo": 5, "Junio": 6, "Julio": 7, "Agosto": 8, "Septiembre": 9, "Octubre": 10, "Noviembre": 11, "Diciembre": 12 };
                filters.mes = monthMap[String(mes)] || Number(mes);
            }
            if (provincia) filters.provincia = provincia;
            if (distrito) filters.distrito = distrito;
            if (tipoGarantia) filters.tipo_garantia = tipoGarantia;
            if (aseguradora) filters.entidad_financiera = aseguradora;
            if (entidad) filters.comprador = entidad;
            if (tipoProcedimiento) filters.tipo_procedimiento = tipoProcedimiento;

            // Fetch with a high limit to get all results (max 5000 for safety)
            const data = await licitacionService.getAll(1, 5000, filters);
            return data.items;
        } catch (error) {
            console.error("Error fetching all licitaciones for PDF:", error);
            throw error; // Throw so that LicitacionTable handles the fallback
        }
    };

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
        setProvinciaOptions([]);
        setDistritoOptions([]);
        setCurrentPage(1);

        // Clear URL immediately
        router.replace(pathname, { scroll: false });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b122b] p-4 sm:p-6 lg:p-8 transition-colors duration-300">
            <div className="mx-auto max-w-7xl space-y-8">

                {/* Main Filter Card */}
                <div className="rounded-3xl bg-white shadow-sm border border-slate-200 dark:bg-[#111c44] dark:border-white/5">
                    <div className="p-6 md:p-8">

                        {/* Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                            <div>
                                <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                                    Búsqueda de Procedimientos
                                </h1>
                                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Encuentra oportunidades de negocio en el estado
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
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

                        {/* Search Bar - Replaced with AutocompleteSearch */}
                        {/* Search Bar & Tipo Procedimiento Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8 relative z-50">
                            <div className="lg:col-span-3">
                                <AutocompleteSearch
                                    onSearch={(term) => { setSearchTerm(term); setCurrentPage(1); }}
                                    placeholder="Buscar por descripción, comprador, nomenclatura, ganador, banco..."
                                    initialValue={searchTerm}
                                />
                            </div>
                            <div>
                                <CompactSelect
                                    value={tipoProcedimiento}
                                    onChange={(v) => { setTipoProcedimiento(v); setCurrentPage(1); }}
                                    options={DEFAULT_TIPOS_PROCEDIMIENTO}
                                    placeholder="Todos los procedimientos"
                                />
                            </div>
                        </div>

                        {/* Filters Grid */}
                        {showFilters && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-4 duration-300">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Departamento</label>
                                <CompactSelect
                                    value={departamento}
                                    onChange={(v) => { handleDepartamentoChange({ target: { value: v } } as any); setCurrentPage(1); }}
                                    options={departamentoOptions}
                                    placeholder="Todos los departamentos"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Estado del Proceso</label>
                                <CompactSelect
                                    value={estado}
                                    onChange={(v) => { setEstado(v); setCurrentPage(1); }}
                                    options={estadoOptions}
                                    placeholder="Todos los estados"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Categoría</label>
                                <CompactSelect
                                    value={categoria}
                                    onChange={(v) => { setCategoria(v); setCurrentPage(1); }}
                                    options={categoriaOptions}
                                    placeholder="Todas las categorías"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Periodo</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <CompactSelect
                                        value={anio}
                                        onChange={(v) => { setAnio(v); setCurrentPage(1); }}
                                        options={anioOptions.map(String)}
                                        placeholder="Año"
                                    />
                                    <CompactSelect
                                        value={mes ? String(mes) : ""}
                                        onChange={(v) => { setMes(v); setCurrentPage(1); }}
                                        options={["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]}
                                        placeholder="Mes"
                                    />
                                </div>
                            </div>

                                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Ubicación Detallada</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="relative">
                                                <select
                                                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-8 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    value={provincia}
                                                    onChange={(e) => { handleProvinciaChange(e); setCurrentPage(1); }}
                                                    disabled={!departamento}
                                                >
                                                    <option value="">Provincia</option>
                                                    {provinciaOptions.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                            </div>
                                            <div className="relative">
                                                <select
                                                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-8 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    value={distrito}
                                                    onChange={(e) => { setDistrito(e.target.value); setCurrentPage(1); }}
                                                    disabled={!provincia}
                                                >
                                                    <option value="">Distrito</option>
                                                    {distritoOptions.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200 delay-75">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Tipo de Garantía</label>
                                        <CompactSelect
                                            value={tipoGarantia}
                                            onChange={(v) => { setTipoGarantia(v); setCurrentPage(1); }}
                                            options={tipoGarantiaOptions}
                                            placeholder="Todos los tipos"
                                        />
                                    </div>
                                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200 delay-100">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Aseguradora</label>
                                        <CompactSelect
                                            value={aseguradora}
                                            onChange={(v) => { setAseguradora(v); setCurrentPage(1); }}
                                            options={aseguradoraOptions}
                                            placeholder="Todas las aseguradoras"
                                        />
                                    </div>
                                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200 delay-150">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Entidad o Consorcio</label>
                                        <CompactSelect
                                            value={entidad}
                                            onChange={(v) => { setEntidad(v); setCurrentPage(1); }}
                                            options={entidadOptions}
                                            placeholder="Todas las entidades"
                                        />
                                    </div>

                            </div>
                        )}

                    </div>
                </div>

                {/* SUNAT Panel (between filters and results) */}
                {sunatLoading && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800/20 animate-pulse">
                        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                        <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                            Consultando SUNAT...
                        </span>
                    </div>
                )}

                {sunatVisible && sunatData && !sunatLoading && (
                    <SunatRucPanel
                        data={sunatData}
                        onClose={() => { setSunatVisible(false); setSunatData(null); }}
                        onRefresh={(ruc) => handleSunatRucLookup(ruc, true)}
                        isRefreshing={sunatLoading}
                    />
                )}

                {/* SUNAT Search Button (for text searches, not RUC) */}
                {searchTerm.trim().length >= 3 && !/^\d{11}$/.test(searchTerm.trim()) && !sunatVisible && (
                    <div className="flex justify-center">
                        <button
                            onClick={handleSunatNameSearch}
                            disabled={sunatLoading}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-bold hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                        >
                            <Building2 className="w-4 h-4" />
                            Consultar SUNAT
                        </button>
                    </div>
                )}

                {/* Results Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white shrink-0">
                        {loading ? 'Cargando...' : `${totalItems} resultados`}
                    </h2>
                        
                    {!loading && totalItems > 0 && (
                        <div className="flex flex-1 justify-center sm:justify-center w-full sm:w-auto mt-2 sm:mt-0">
                            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-xl dark:bg-slate-800/80 shadow-inner border border-slate-200/50 dark:border-slate-700/50">
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`flex items-center gap-2.5 px-8 py-2.5 rounded-lg text-xs font-extrabold transition-all duration-200 ${
                                        viewMode === 'table' 
                                            ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-700 dark:text-blue-400 dark:ring-white/10' 
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    <List className="w-4 h-4" />
                                    Vista tabla
                                </button>
                                <button
                                    onClick={() => setViewMode('card')}
                                    className={`flex items-center gap-2.5 px-8 py-2.5 rounded-lg text-xs font-extrabold transition-all duration-200 ${
                                        viewMode === 'card' 
                                            ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-700 dark:text-blue-400 dark:ring-white/10' 
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                    Vista card
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        Página <span className="text-slate-900 dark:text-white font-bold">{currentPage}</span> de <span className="text-slate-900 dark:text-white font-bold">{totalPages || 1}</span>
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-64 rounded-2xl bg-slate-200/50 animate-pulse dark:bg-slate-800/50"></div>
                        ))}
                    </div>
                ) : licitaciones.length > 0 ? (
                    viewMode === 'card' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {licitaciones.map((lic) => (
                                <LicitacionCard key={lic.id_convocatoria} licitacion={lic} searchTerm={searchTerm} />
                            ))}
                        </div>
                    ) : (
                        <LicitacionTable 
                            licitaciones={licitaciones} 
                            searchTerm={searchTerm} 
                            onFetchAll={handleFetchAllLicitaciones}
                            totalItems={totalItems}
                        />
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 p-12 text-center dark:border-slate-700 dark:bg-[#111c44]/50">
                        <svg className="h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">No se encontraron resultados</h3>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">Intenta ajustar los filtros de búsqueda.</p>
                    </div>
                )}

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="flex justify-center pt-10 pb-6">
                        <nav className="flex items-center gap-6" aria-label="Pagination">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
        </div >
    );
}

export default function BusquedaLicitacionesPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b122b]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>}>
            <BusquedaContent />
        </Suspense>
    );
}
