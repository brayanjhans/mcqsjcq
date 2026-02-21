"use client";

import React, { useEffect, useState } from "react";
import type { SearchFilters } from "@/types/licitacion";
import { Search, X, Filter } from "lucide-react";
import { licitacionService } from "@/lib/services/licitacionService";

interface Props {
    onFilterChange: (filters: SearchFilters) => void;
    initialFilters?: SearchFilters;
}

interface FilterOptions {
    estados: string[];
    aseguradoras: string[];
    tipos_entidad: string[];
    objetos: string[];
    departamentos: string[];
    tipos_procedimiento: string[];
}

export const SearchFiltersComponent: React.FC<Props> = ({
    onFilterChange,
    initialFilters = {},
}) => {
    // Default Options
    const DEFAULT_DEPARTAMENTOS = [
        "AMAZONAS", "ANCASH", "APURIMAC", "AREQUIPA", "AYACUCHO", "CAJAMARCA", "CALLAO",
        "CUSCO", "HUANCAVELICA", "HUANUCO", "ICA", "JUNIN", "LA LIBERTAD", "LAMBAYEQUE",
        "LIMA", "LORETO", "MADRE DE DIOS", "MOQUEGUA", "PASCO", "PIURA", "PUNO",
        "SAN MARTIN", "TACNA", "TUMBES", "UCAYALI"
    ];

    const DEFAULT_ESTADOS = ["CONVOCADO", "ADJUDICADO", "DESIERTO", "CANCELADO", "SUSPENDIDO"];
    const DEFAULT_CATEGORIAS = ["BIENES", "SERVICIOS", "OBRAS", "CONSULTORIA DE OBRAS"];
    const DEFAULT_ASEGURADORAS = ["SECREX", "AVLA", "INSUR", "MAPFRE", "CRECER", "LIBERTY", "MUNDIAL"];
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

    const [localFilters, setLocalFilters] = useState<SearchFilters>(initialFilters);
    const [options, setOptions] = useState<FilterOptions>({
        estados: DEFAULT_ESTADOS,
        aseguradoras: DEFAULT_ASEGURADORAS,
        tipos_entidad: [],
        objetos: DEFAULT_CATEGORIAS,
        departamentos: DEFAULT_DEPARTAMENTOS,
        tipos_procedimiento: DEFAULT_TIPOS_PROCEDIMIENTO
    });

    const [showAdvanced, setShowAdvanced] = useState(false);



    // ... (inside component)

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                // Pass current local filters to get adapted options
                const data = await licitacionService.getFilters(localFilters);

                setOptions(prev => ({
                    estados: data.estados?.length ? data.estados : [],
                    aseguradoras: data.aseguradoras?.length ? data.aseguradoras : [],
                    tipos_entidad: data.tipos_entidad || [], // Backend might not return this yet?
                    objetos: data.categorias?.length ? data.categorias : [], // Map categorias to objetos
                    departamentos: data.departamentos?.length ? data.departamentos : [],
                    tipos_procedimiento: DEFAULT_TIPOS_PROCEDIMIENTO // Keep static for now or fetch if API supports
                }));
            } catch (error) {
                console.error("Error fetching filter options:", error);
            }
        };

        // Debounce fetching to avoid spamming while typing
        const timeoutId = setTimeout(() => {
            fetchOptions();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [localFilters]);

    const handleChange = (key: keyof SearchFilters, value: string) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleApply = () => {
        onFilterChange(localFilters);
    };

    const handleClear = () => {
        const emptyFilters = {};
        setLocalFilters(emptyFilters);
        onFilterChange(emptyFilters);
    };

    const inputClasses =
        "w-full rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 shadow-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-[#0b122b] dark:text-slate-200 dark:placeholder-slate-500/50";

    const labelClasses =
        "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400";

    return (
        <div className="space-y-6">

            {/* Header with Title and Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                        <Search className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            Búsqueda Avanzada de Licitaciones
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Filtra y encuentra licitaciones de manera rápida y precisa
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all"
                    >
                        {showAdvanced ? "Menos Filtros" : "Más Filtros"}
                        <Filter className={`w-3.5 h-3.5 transition-transform duration-300 ${showAdvanced ? "rotate-180" : ""}`} />
                    </button>
                    <button
                        onClick={handleClear}
                        className="group flex items-center gap-2 px-4 py-2 rounded-lg border border-transparent bg-red-50 text-xs font-bold text-red-500 hover:bg-red-100 transition-all dark:bg-red-900/20 dark:text-red-400"
                    >
                        <X className="w-3.5 h-3.5" />
                        <span>Limpiar</span>
                    </button>
                </div>
            </div>

            {/* Inputs Grid */}
            <div className="space-y-6">

                {/* Search Bar */}
                <div>
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Buscar por descripción, comprador, nomenclatura, ganador, banco..."
                            className={`${inputClasses} pl-11 py-3 bg-white border-slate-200 shadow-sm group-focus-within:shadow-md transition-shadow`}
                            value={localFilters.search || ""}
                            onChange={(e) => handleChange("search", e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                        />
                        <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                </div>

                {/* Filters Row 1: Basicos */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">

                    {/* Departamento */}
                    <div>
                        <label className={labelClasses}>Departamento</label>
                        <select
                            className={inputClasses}
                            value={localFilters.departamento || ""}
                            onChange={(e) => handleChange("departamento", e.target.value)}
                        >
                            <option value="">Todos los departamentos</option>
                            {options.departamentos.map((dept) => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>

                    {/* Estado */}
                    <div>
                        <label className={labelClasses}>Estado del Proceso</label>
                        <select
                            className={inputClasses}
                            value={localFilters.estado_proceso || ""}
                            onChange={(e) => handleChange("estado_proceso", e.target.value)}
                        >
                            <option value="">Todos los estados</option>
                            {options.estados.map((est) => (
                                <option key={est} value={est}>{est}</option>
                            ))}
                        </select>
                    </div>

                    {/* Categoría */}
                    <div>
                        <label className={labelClasses}>Categoría</label>
                        <select
                            className={inputClasses}
                            value={localFilters.categoria || ""}
                            onChange={(e) => handleChange("categoria", e.target.value)}
                        >
                            <option value="">Todas las categorías</option>
                            {options.objetos.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Periodo (Año/Mes) */}
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className={labelClasses}>Periodo</label>
                            <select
                                className={inputClasses}
                                value={localFilters.year || ""}
                                onChange={(e) => handleChange("year", e.target.value)}
                            >
                                <option value="">Año</option>
                                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i + 1).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className={`${labelClasses} invisible`}>Mes</label>
                            <select
                                className={inputClasses}
                                value={localFilters.mes || ""}
                                onChange={(e) => handleChange("mes", e.target.value)}
                            >
                                <option value="">Mes</option>
                                {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => (
                                    <option key={i} value={i + 1}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Row 2: Procedimiento & Avanzados */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Tipo de Procedimiento (NUEVO REQUERIMIENTO) */}
                <div className="lg:col-span-2">
                    <label className={labelClasses}>Tipo de Procedimiento</label>
                    <select
                        className={inputClasses}
                        value={localFilters.tipo_procedimiento || ""}
                        onChange={(e) => handleChange("tipo_procedimiento", e.target.value)}
                    >
                        <option value="">Todos los procedimientos</option>
                        {options.tipos_procedimiento.map((proc) => (
                            <option key={proc} value={proc}>{proc}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Filters Row 3: Avanzados (Expandible) */}
            {showAdvanced && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-top-2 duration-300">

                    {/* Ubicación Detallada */}
                    <div className="flex gap-2">
                        <div className="flex-1 hidden sm:block">
                            <label className={labelClasses}>Ubicación Detallada</label>
                            <input
                                type="text"
                                placeholder="Provincia"
                                className={inputClasses}
                                value={localFilters.provincia || ""}
                                onChange={(e) => handleChange("provincia", e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className={`${labelClasses} sm:invisible`}>Distrito</label>
                            <input
                                type="text"
                                placeholder="Distrito"
                                className={inputClasses}
                                value={localFilters.distrito || ""}
                                onChange={(e) => handleChange("distrito", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Tipo de Garantía */}
                    <div>
                        <label className={labelClasses}>Tipo de Garantía</label>
                        <select
                            className={inputClasses}
                            value={localFilters.tipo_garantia || ""}
                            onChange={(e) => handleChange("tipo_garantia", e.target.value)}
                        >
                            <option value="">Todos los tipos</option>
                            <option value="CARTA_FIANZA">Carta Fianza</option>
                            <option value="POLIZA_CAUCION">Póliza de Caución</option>
                            <option value="FIDEICOMISO">Fideicomiso</option>
                        </select>
                    </div>

                    {/* Aseguradora */}
                    <div>
                        <label className={labelClasses}>Aseguradora</label>
                        <select
                            className={inputClasses}
                            value={localFilters.aseguradora || ""}
                            onChange={(e) => handleChange("aseguradora", e.target.value)}
                        >
                            <option value="">Todas las aseguradoras</option>
                            {options.aseguradoras.map((seg) => (
                                <option key={seg} value={seg}>{seg}</option>
                            ))}
                        </select>
                    </div>

                    {/* Entidad o Consorcio */}
                    <div>
                        <label className={labelClasses}>Entidad o Consorcio</label>
                        <input
                            type="text"
                            placeholder="Todas las entidades"
                            className={inputClasses}
                            value={localFilters.entidad || ""}
                            onChange={(e) => handleChange("entidad", e.target.value)}
                        />
                    </div>

                </div>
            )}
        </div>
    );
};
