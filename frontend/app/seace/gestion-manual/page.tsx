"use client";

import React, { useState, useEffect } from "react";
import {
    Search,
    RotateCcw,
    ChevronDown,
    ChevronUp,
    Plus,
    LayoutGrid,
    List,
    FileText,
    Settings,
    MoreHorizontal,
    MapPin,
    Building2,
    Calendar,
    Briefcase,
    FileEdit,
    RefreshCcw,
    Check
} from "lucide-react";
import { LicitacionCard } from "@/components/search/LicitacionCard";
import LicitacionModal from "@/components/search/LicitacionModal";
import DeleteLicitacionModal from "@/components/search/DeleteLicitacionModal";
import { AutocompleteSearch } from "@/components/search/AutocompleteSearch";
import type { Licitacion } from "@/types/licitacion";
import { licitacionService } from "@/lib/services/licitacionService";
import { DEFAULT_TIPOS_PROCEDIMIENTO } from "@/lib/constants/procedimientos";


export default function GestionManualPage() {
    // Filter States
    const [showFilters, setShowFilters] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Select States
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
    const [origenFilter, setOrigenFilter] = useState("Todos");
    const [isOrigenDropdownOpen, setIsOrigenDropdownOpen] = useState(false);

    // Cascading Filter Options
    const [provinciaOptions, setProvinciaOptions] = useState<string[]>([]);
    const [distritoOptions, setDistritoOptions] = useState<string[]>([]);

    // Initial Filter Options (Dynamic)
    const [filterOptions, setFilterOptions] = useState({
        departamentos: [],
        estados: [],
        categorias: [],
        anios: [],
        entidades: [],
        tipos_garantia: [],
        aseguradoras: []
    });

    // Data State
    const [licitaciones, setLicitaciones] = useState<Licitacion[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLicitacion, setSelectedLicitacion] = useState<Licitacion | null>(null);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [licitacionToDelete, setLicitacionToDelete] = useState<Licitacion | null>(null);

    // Fetch Data
    const fetchLicitaciones = async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (searchTerm) filters.search = searchTerm;
            if (estado) filters.estado = estado;
            if (departamento) filters.departamento = departamento;
            if (provincia) filters.provincia = provincia;
            if (distrito) filters.distrito = distrito;
            if (categoria) filters.categoria = categoria;
            if (origenFilter !== 'Todos') filters.origen = origenFilter;

            if (anio) filters.anio = anio;
            if (mes) {
                // Convert month name to number if needed or send as is depending on backend
                const monthMap: { [key: string]: number } = { "Enero": 1, "Febrero": 2, "Marzo": 3, "Abril": 4, "Mayo": 5, "Junio": 6, "Julio": 7, "Agosto": 8, "Septiembre": 9, "Octubre": 10, "Noviembre": 11, "Diciembre": 12 };
                // Check if it's already a number or name
                filters.mes = monthMap[mes] || mes;
            }
            if (tipoGarantia) filters.tipo_garantia = tipoGarantia;
            if (aseguradora) filters.entidad_financiera = aseguradora;
            if (entidad) filters.comprador = entidad;
            if (tipoProcedimiento) filters.tipo_procedimiento = tipoProcedimiento;

            const response = await licitacionService.getAll(currentPage, 20, filters);
            setLicitaciones(response.items);
            setTotalItems(response.total);
            setTotalPages(response.total_pages);
        } catch (error) {
            console.error("Error fetching licitaciones:", error);
        } finally {
            setLoading(false);
        }
    };


    // Cascading: Load Provincias when Departamento changes
    useEffect(() => {
        const fetchProvincias = async () => {
            setProvincia("");
            setDistrito("");
            setProvinciaOptions([]);
            setDistritoOptions([]);

            if (departamento) {
                try {
                    const data = await licitacionService.getLocations(departamento);
                    setProvinciaOptions(data.provincias || []);
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
            setDistrito("");
            setDistritoOptions([]);

            if (provincia && departamento) {
                try {
                    const data = await licitacionService.getLocations(departamento, provincia);
                    setDistritoOptions(data.distritos || []);
                } catch (error) {
                    console.error("Error loading distritos:", error);
                }
            }
        };
        fetchDistritos();
    }, [provincia, departamento]);

    const fetchFilters = async () => {

        try {
            const data = await licitacionService.getFilters();
            setFilterOptions(data);
        } catch (error) {
            console.error("Error fetching filters:", error);
        }
    };

    useEffect(() => {
        fetchFilters();
        fetchLicitaciones();
    }, [searchTerm, estado, departamento, provincia, distrito, categoria, origenFilter, anio, mes, tipoGarantia, aseguradora, entidad, tipoProcedimiento, currentPage]);

    // Handlers
    const handleCreate = () => {
        setSelectedLicitacion(null);
        setIsModalOpen(true);
    };

    const handleEdit = (id: string) => {
        const item = licitaciones.find(l => l.id_convocatoria === id);
        if (item) {
            setSelectedLicitacion(item);
            setIsModalOpen(true);
        }
    };

    const handleValidSave = async (data: any) => {
        try {
            if (selectedLicitacion) {
                await licitacionService.update(selectedLicitacion.id_convocatoria, data);
            } else {
                await licitacionService.create(data);
            }
            setIsModalOpen(false);
            fetchLicitaciones();
        } catch (error) {
            console.error("Error saving licitacion:", error);
            alert("Error al guardar la licitación");
        }
    };

    const handleDeleteClick = (id: string) => {
        const item = licitaciones.find(l => l.id_convocatoria === id);
        if (item) {
            setLicitacionToDelete(item);
            setIsDeleteModalOpen(true);
        }
    };

    const handleConfirmDelete = async (authCode: string) => {
        if (authCode === '123123') { // Auth code changed to 123123
            if (licitacionToDelete) {
                try {
                    await licitacionService.delete(licitacionToDelete.id_convocatoria);
                    setIsDeleteModalOpen(false);
                    setLicitacionToDelete(null);
                    fetchLicitaciones();
                } catch (error) {
                    console.error("Error deleting:", error);
                    alert("Error al eliminar");
                }
            }
        } else {
            alert("Código de autorización incorrecto");
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
        setOrigenFilter("Todos");
        setCurrentPage(1);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b122b] p-4 sm:p-6 lg:p-8 transition-colors duration-300">
            <div className="mx-auto max-w-7xl space-y-6">

                {/* Main Filter Card */}
                <div className="rounded-3xl bg-white shadow-sm border border-slate-200 dark:bg-[#111c44] dark:border-white/5 overflow-hidden">
                    <div className="p-6 md:p-8">

                        {/* Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                            <div>
                                <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                                    Gestión Manual de Licitaciones
                                </h1>
                                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Busca, filtra y gestiona licitaciones manualmente con controles avanzados
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-4 duration-300">

                            {/* Row 1 - Always Visible */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Departamento</label>
                                <div className="relative">
                                    <select
                                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300"
                                        value={departamento} onChange={(e) => setDepartamento(e.target.value)}
                                    >
                                        <option value="">Todos los departamentos</option>
                                        {filterOptions.departamentos?.map((dept: string) => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Estado del Proceso</label>
                                <div className="relative">
                                    <select
                                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300"
                                        value={estado} onChange={(e) => setEstado(e.target.value)}
                                    >
                                        <option value="">Todos los estados</option>
                                        {filterOptions.estados?.map((est: string) => (
                                            <option key={est} value={est}>{est}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Categoría</label>
                                <div className="relative">
                                    <select
                                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300"
                                        value={categoria} onChange={(e) => setCategoria(e.target.value)}
                                    >
                                        <option value="">Todas las categorías</option>
                                        {filterOptions.categorias?.map((cat: string) => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Periodo</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <select
                                            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-8 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300"
                                            value={anio} onChange={(e) => setAnio(e.target.value)}
                                        >
                                            <option value="">Año</option>
                                            {filterOptions.anios?.map((a: number) => (
                                                <option key={a} value={String(a)}>{a}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                    </div>
                                    <div className="relative">
                                        <select
                                            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-8 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300"
                                            value={mes} onChange={(e) => setMes(e.target.value)}
                                        >
                                            <option value="">Mes</option>
                                            {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m) => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Row 2 - Collapsible */}
                            {showFilters && (
                                <>
                                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Ubicación Detallada</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="relative">
                                                <select
                                                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-8 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300"
                                                    value={provincia} onChange={(e) => setProvincia(e.target.value)}
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
                                                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-8 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300"
                                                    value={distrito} onChange={(e) => setDistrito(e.target.value)}
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
                                        <div className="relative">
                                            <select
                                                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300"
                                                value={tipoGarantia} onChange={(e) => setTipoGarantia(e.target.value)}
                                            >
                                                <option value="">Todos los tipos</option>
                                                {filterOptions.tipos_garantia?.map((tipo: string) => (
                                                    <option key={tipo} value={tipo}>{tipo}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200 delay-100">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Aseguradora</label>
                                        <div className="relative">
                                            <select
                                                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300"
                                                value={aseguradora} onChange={(e) => setAseguradora(e.target.value)}
                                            >
                                                <option value="">Todas las aseguradoras</option>
                                                {filterOptions.aseguradoras?.map((aseg: string) => (
                                                    <option key={aseg} value={aseg}>{aseg}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200 delay-150">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Entidad o Consorcio</label>
                                        <div className="relative">
                                            <select
                                                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300"
                                                value={entidad} onChange={(e) => setEntidad(e.target.value)}
                                            >
                                                <option value="">Todas las entidades</option>
                                                {filterOptions.entidades?.map((ent: string) => (
                                                    <option key={ent} value={ent}>{ent}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>


                                </>
                            )}
                        </div>

                    </div>
                </div>

                {/* Control Bar */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="px-4 py-2 bg-slate-100 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Total:</span>
                            <span className="text-sm font-black text-slate-800 dark:text-white">{loading ? '...' : totalItems}</span>
                        </div>
                        <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-bold shadow-lg shadow-blue-500/30 hover:bg-[#1d4ed8] hover:shadow-blue-500/50 transition-all">
                            <Search className="w-4 h-4" />
                            Buscar
                        </button>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:shadow-emerald-500/50 transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            Nueva Licitación
                        </button>

                        <div className="relative group">
                            <button
                                onClick={() => setIsOrigenDropdownOpen(!isOrigenDropdownOpen)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all dark:bg-[#111c44] dark:border-slate-700 dark:text-white min-w-[140px] justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <LayoutGrid className="w-4 h-4 text-blue-500" />
                                    {origenFilter}
                                </div>
                                {isOrigenDropdownOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </button>

                            {isOrigenDropdownOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 z-20 animate-in fade-in zoom-in-95 duration-200">
                                    <button
                                        onClick={() => { setOrigenFilter("Todos"); setIsOrigenDropdownOpen(false); }}
                                        className={`w-full px-4 py-2.5 text-sm font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${origenFilter === 'Todos' ? 'text-blue-500 bg-blue-50/50' : 'text-slate-600 dark:text-slate-300'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <LayoutGrid size={16} />
                                            Todos
                                        </div>
                                        {origenFilter === 'Todos' && <Check size={16} />}
                                    </button>
                                    <button
                                        onClick={() => { setOrigenFilter("Manuales"); setIsOrigenDropdownOpen(false); }}
                                        className={`w-full px-4 py-2.5 text-sm font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${origenFilter === 'Manuales' ? 'text-blue-500 bg-blue-50/50' : 'text-slate-600 dark:text-slate-300'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <FileEdit size={16} />
                                            Manuales
                                        </div>
                                        {origenFilter === 'Manuales' && <Check size={16} />}
                                    </button>
                                    <button
                                        onClick={() => { setOrigenFilter("Automático"); setIsOrigenDropdownOpen(false); }}
                                        className={`w-full px-4 py-2.5 text-sm font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${origenFilter === 'Automático' ? 'text-blue-500 bg-blue-50/50' : 'text-slate-600 dark:text-slate-300'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <RefreshCcw size={16} />
                                            Automático
                                        </div>
                                        {origenFilter === 'Automático' && <Check size={16} />}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Results Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    {licitaciones.map((item) => (
                        <LicitacionCard
                            key={item.id_convocatoria}
                            licitacion={item}
                            showManualActions={true}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                        />
                    ))}
                </div>



                {/* Pagination */}
                {
                    totalPages > 1 && (
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
                    )
                }

                <LicitacionModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    licitacion={selectedLicitacion}
                    onSave={handleValidSave}
                    estadosOptions={filterOptions.estados}
                    tipoGarantiaOptions={filterOptions.tipos_garantia}
                    aseguradorasOptions={filterOptions.aseguradoras}
                    departamentosOptions={filterOptions.departamentos}
                />

                <DeleteLicitacionModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    licitacion={licitacionToDelete}
                    onConfirm={handleConfirmDelete}
                />

            </div >
        </div >
    );
}
