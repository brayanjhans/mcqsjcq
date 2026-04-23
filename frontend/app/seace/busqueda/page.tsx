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
    List,
    DollarSign
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
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);

    // SUNAT RUC Integration State
    const [sunatData, setSunatData] = useState<any>(null);
    const [sunatLoading, setSunatLoading] = useState(false);
    const [sunatVisible, setSunatVisible] = useState(false);
    const [selectedSunatIndex, setSelectedSunatIndex] = useState(0);

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
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] p-4 sm:p-6 lg:p-8 transition-colors duration-500 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            
            <div className="mx-auto max-w-[1700px] space-y-10 relative z-10">

                {/* Main Filter Card */}
                <div className="rounded-[2.5rem] glass-luxury border-white/40 mb-10 overflow-hidden">
                    <div className="p-8 md:p-10">

                        {/* Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    Búsqueda Inteligente
                                </h1>
                                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Explora el ecosistema de contrataciones del estado en tiempo real
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
                        onClose={() => setSunatVisible(false)}
                        onRefresh={(ruc) => handleSunatRucLookup(ruc, true)}
                        isRefreshing={sunatLoading}
                        selectedIndex={selectedSunatIndex}
                        onSelectedIndexChange={setSelectedSunatIndex}
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
                {/* Results Header with Integrated Stats & Enhanced Animations */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 px-2">
                    <div className="flex flex-col gap-3 group">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-10 bg-gradient-to-b from-indigo-600 to-blue-600 rounded-full shadow-lg shadow-indigo-500/20 group-hover:scale-y-110 transition-transform duration-500"></div>
                            <h2 className="text-3xl font-black text-[#0A192F] dark:text-white uppercase tracking-tighter transition-all duration-300 group-hover:translate-x-1">
                                Resultados de búsqueda
                            </h2>
                        </div>
                        {!loading && totalItems > 0 && (
                            <div className="flex flex-wrap items-center gap-4 ml-5 animate-in fade-in slide-in-from-left-4 duration-700">
                                <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-blue-500/5 border border-blue-500/10 dark:bg-blue-500/10 hover:bg-blue-500/10 hover:border-blue-500/20 transition-all duration-300 group/badge cursor-default">
                                    <div className="relative">
                                        <Search className="w-4 h-4 text-blue-600 relative z-10" />
                                        <div className="absolute inset-0 bg-blue-400 rounded-full blur-md opacity-0 group-hover/badge:opacity-50 animate-pulse transition-opacity"></div>
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 mr-1">Total:</span>
                                    <span className="text-base font-black text-blue-700 dark:text-blue-400 tabular-nums">
                                        {totalItems.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {!loading && totalItems > 0 && (
                        <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto animate-in fade-in slide-in-from-right-4 duration-700">
                            {/* Enhanced View Switcher */}
                            <div className="relative flex items-center glass-luxury p-1.5 rounded-[1.5rem] border-white/50 shadow-2xl overflow-hidden min-w-[300px]">
                                {/* Sliding Indicator Background with Deep Navy Gradient */}
                                <div 
                                    className="absolute top-1.5 bottom-1.5 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] rounded-2xl bg-gradient-to-r from-[#1e3a8a] to-[#172554] shadow-xl"
                                    style={{
                                        left: viewMode === 'table' ? '6px' : 'calc(50% + 3px)',
                                        width: 'calc(50% - 9px)',
                                    }}
                                />
                                
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`relative z-10 flex-1 flex items-center justify-center gap-3 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${
                                        viewMode === 'table' 
                                            ? 'text-white dark:text-[#0A192F] scale-105' 
                                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
                                    }`}
                                >
                                    <List className={`w-4 h-4 transition-all duration-500 ${viewMode === 'table' ? 'rotate-0' : 'rotate-[-10deg] opacity-60'}`} />
                                    Tabla
                                </button>
                                
                                <button
                                    onClick={() => setViewMode('card')}
                                    className={`relative z-10 flex-1 flex items-center justify-center gap-3 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${
                                        viewMode === 'card' 
                                            ? 'text-white dark:text-[#0A192F] scale-105' 
                                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
                                    }`}
                                >
                                    <LayoutGrid className={`w-4 h-4 transition-all duration-500 ${viewMode === 'card' ? 'scale-110' : 'scale-90 opacity-60 rotate-[10deg]'}`} />
                                    Cards
                                </button>
                            </div>

                            {/* Refined Page Indicator */}
                            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white dark:bg-[#111c44] border border-slate-200 dark:border-white/10 shadow-sm group/page cursor-default">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Página</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-base font-black text-indigo-600 dark:text-indigo-400 animate-in zoom-in duration-300">
                                        {currentPage}
                                    </span>
                                    <span className="text-slate-300 dark:text-slate-700 font-light text-xl">/</span>
                                    <span className="text-base font-black text-slate-900 dark:text-white">
                                        {totalPages || 1}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>


                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="rounded-[2.5rem] bg-white/50 dark:bg-white/5 p-8 border border-white/20 space-y-6 overflow-hidden relative">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl skeleton-box shrink-0"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-3/4 skeleton-box rounded"></div>
                                        <div className="h-3 w-1/2 skeleton-box rounded opacity-50"></div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-3 w-full skeleton-box rounded"></div>
                                    <div className="h-3 w-5/6 skeleton-box rounded"></div>
                                </div>
                                <div className="space-y-4 pt-2">
                                    {[...Array(3)].map((_, j) => (
                                        <div key={j} className="flex gap-3">
                                            <div className="w-4 h-4 skeleton-box rounded shrink-0"></div>
                                            <div className="h-3 w-1/2 skeleton-box rounded"></div>
                                        </div>
                                    ))}
                                </div>
                                <div className="h-10 w-full skeleton-box rounded-xl mt-4"></div>
                            </div>
                        ))}
                    </div>
                ) : licitaciones.length > 0 ? (
                    viewMode === 'card' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {licitaciones.map((lic, index) => (
                                <div 
                                    key={lic.id_convocatoria}
                                    className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
                                    style={{ animationDelay: `${index * 80}ms` }}
                                >
                                    <LicitacionCard licitacion={lic} searchTerm={searchTerm} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <LicitacionTable 
                            licitaciones={licitaciones} 
                            searchTerm={searchTerm} 
                            onFetchAll={handleFetchAllLicitaciones}
                            totalItems={totalItems}
                            ruc={(() => {
                                // 1. Check if SUNAT data is available
                                if (sunatData) {
                                    if (Array.isArray(sunatData)) {
                                        const item = sunatData[selectedSunatIndex];
                                        if (item?.encontrado) return item.ruc;
                                        // Fallback to first if index is out of bounds
                                        return sunatData[0]?.ruc;
                                    }
                                    return sunatData.encontrado ? sunatData.ruc : undefined;
                                }

                                // 2. Check if searchTerm is a RUC
                                const term = searchTerm.trim();
                                if (/^\d{11}$/.test(term)) return term;

                                // 3. Fallback: Extract from search results if homogeneous
                                if (licitaciones.length > 0) {
                                    // Try winner RUC
                                    let candidateRuc = licitaciones[0].ganador_ruc;
                                    
                                    // Try consortium RUCs string
                                    if (!candidateRuc || !/^\d{11}$/.test(candidateRuc)) {
                                        candidateRuc = licitaciones[0].rucs_consorciados?.split('|')[0]?.trim();
                                    }

                                    // Try members list
                                    if (!candidateRuc || !/^\d{11}$/.test(candidateRuc)) {
                                        candidateRuc = licitaciones[0].miembros_consorcio?.[0]?.ruc_miembro;
                                    }

                                    if (candidateRuc && /^\d{11}$/.test(candidateRuc)) {
                                        // Check if at least the first 5 results share this RUC
                                        const isHomogeneous = licitaciones.slice(0, Math.min(5, licitaciones.length)).every(l => 
                                            l.ganador_ruc === candidateRuc || 
                                            l.rucs_consorciados?.includes(candidateRuc) ||
                                            l.miembros_consorcio?.some(m => m.ruc_miembro === candidateRuc)
                                        );
                                        if (isHomogeneous) return candidateRuc;
                                    }
                                }
                                
                                return undefined;
                            })()}
                            entityName={(() => {
                                // 1. Check if SUNAT data is available
                                if (sunatData) {
                                    if (Array.isArray(sunatData)) {
                                        const item = sunatData[selectedSunatIndex];
                                        return item?.razon_social || sunatData[0]?.razon_social;
                                    }
                                    return sunatData.razon_social;
                                }

                                // 2. Fallback: Search for the RUC in Results
                                const term = searchTerm.trim();
                                const isRuc = /^\d{11}$/.test(term);

                                if (isRuc && licitaciones.length > 0) {
                                    // Look for the RUC in winners or consortium members
                                    for (const lic of licitaciones) {
                                        // Match direct winner
                                        if (lic.ganador_ruc === term && lic.ganador_nombre) {
                                            return lic.ganador_nombre;
                                        }
                                        // Match member of consortium
                                        const memberMatch = lic.miembros_consorcio?.find(m => m.ruc_miembro === term);
                                        if (memberMatch?.nombre_miembro) {
                                            return memberMatch.nombre_miembro;
                                        }
                                    }
                                }

                                // 3. Fallback: Consensus name (first few results)
                                if (licitaciones.length > 0) {
                                    const first = licitaciones[0].ganador_nombre;
                                    if (first && first !== "NO INFORMADO" && first !== "N/A" && first !== "N/D") {
                                        const isConsensus = licitaciones.slice(0, 3).every(l => l.ganador_nombre === first);
                                        if (isConsensus) return first;
                                    }
                                }
                                return undefined;
                            })()}
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
