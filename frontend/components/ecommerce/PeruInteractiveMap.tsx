"use client";

import React, { useState } from "react";
import {
    ComposableMap,
    Geographies,
    Geography,
    ZoomableGroup,
    Marker
} from "react-simple-maps";

interface DepartmentRanking {
    name: string;
    count: number;
    percentage?: number;
}

interface ProvinceRanking {
    name: string;
    count: number;
    amount?: number;
}

interface PeruInteractiveMapProps {
    departmentRanking: DepartmentRanking[];
    provinceRanking: ProvinceRanking[];
    selectedDepartment: string | null;
    onDepartmentClick: (deptName: string | null) => void;
    loading: boolean;
    label?: string; // Dynamic
}

const DEPARTMENT_COLORS: { [key: string]: string } = {
    "AMAZONAS": "#e17024",      // Orange
    "ANCASH": "#e2007a",        // Fuchsia / Hot Pink
    "APURIMAC": "#008299",      // Blue-Teal / Cyan
    "AREQUIPA": "#2bb673",      // Medium Green
    "AYACUCHO": "#7c3f97",      // Purple
    "CAJAMARCA": "#0090ba",     // Teal / Light Blue
    "CALLAO": "#007bc4",        // Sky Blue Variant
    "CUSCO": "#ffd700",         // Golden Yellow
    "HUANCAVELICA": "#e31b23",  // Red
    "HUANUCO": "#80599a",       // Muted Purple
    "ICA": "#4e5180",           // Slate Indigo
    "JUNIN": "#f4811f",         // Amber Orange
    "LA LIBERTAD": "#0033a0",   // Dark Blue
    "LAMBAYEQUE": "#e31b23",    // Red
    "LIMA": "#0096e6",          // Sky Blue
    "LORETO": "#008f39",        // Pure Green
    "MADRE DE DIOS": "#9b268b", // Fuchsia Purple
    "MOQUEGUA": "#e31b23",      // Red
    "PASCO": "#006a4e",         // Forest Green
    "PIURA": "#008f39",         // Pure Green
    "PUNO": "#4b3086",          // Violet-Blue
    "SAN MARTIN": "#ffca05",    // Golden Yellow
    "TACNA": "#e17024",         // Orange
    "TUMBES": "#7a529e",        // Purple
    "UCAYALI": "#e31b23"        // Red
};

const DEPARTMENT_CENTROIDS: { [key: string]: [number, number] } = {
    "AMAZONAS": [-78.1, -5.8],
    "ANCASH": [-77.5, -9.5],
    "APURIMAC": [-73.0, -14.0],
    "AREQUIPA": [-72.2, -15.8],
    "AYACUCHO": [-74.1, -13.5],
    "CAJAMARCA": [-78.8, -6.5],
    "CALLAO": [-77.2, -12.1],
    "CUSCO": [-71.8, -13.3],
    "HUANCAVELICA": [-75.0, -12.8],
    "HUANUCO": [-75.8, -9.6],
    "ICA": [-75.5, -14.3],
    "JUNIN": [-74.9, -11.4],
    "LA LIBERTAD": [-78.2, -8.0],
    "LAMBAYEQUE": [-79.9, -6.5],
    "LIMA": [-76.8, -11.9],
    "LORETO": [-74.3, -4.5],
    "MADRE DE DIOS": [-70.3, -11.7],
    "MOQUEGUA": [-70.9, -16.8],
    "PASCO": [-75.5, -10.4],
    "PIURA": [-80.3, -5.0],
    "PUNO": [-70.1, -15.0],
    "SAN MARTIN": [-76.7, -7.2],
    "TACNA": [-70.2, -17.8],
    "TUMBES": [-80.6, -3.8],
    "UCAYALI": [-73.0, -9.2]
};

const normalizeName = (name: string): string => {
    if (!name) return "";
    return name
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .trim();
};

export const PeruInteractiveMap: React.FC<PeruInteractiveMapProps> = ({
    departmentRanking,
    provinceRanking,
    selectedDepartment,
    onDepartmentClick,
    loading,
    label = "Licitaciones"
}) => {
    const [hoveredDept, setHoveredDept] = useState<string | null>(null);
    const [selectedDept, setSelectedDept] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showAll, setShowAll] = useState(false);
    
    // Floating Tooltip coordinates
    const [tooltip, setTooltip] = useState<{ name: string; count: number; x: number; y: number } | null>(null);

    // Calculate max count for Heatmap scaling
    const counts = departmentRanking.map(d => d.count);
    const maxCount = counts.length > 0 ? Math.max(...counts) : 1;

    const handleMouseEnter = (event: React.MouseEvent, geo: any) => {
        const deptName = geo.properties.NOMBDEP || geo.properties.NOMDEP || geo.properties.name;
        setHoveredDept(deptName);
        
        const deptData = departmentRanking.find(d => d.name.toUpperCase() === deptName.toUpperCase());
        const count = deptData ? deptData.count : 0;
        
        setTooltip({
            name: deptName,
            count: count,
            x: event.clientX,
            y: event.clientY
        });
    };

    const handleMouseMove = (event: React.MouseEvent) => {
        if (tooltip) {
            setTooltip(prev => prev ? {
                ...prev,
                x: event.clientX,
                y: event.clientY
            } : null);
        }
    };

    const handleMouseLeave = () => {
        setHoveredDept(null);
        setTooltip(null);
    };

    const handleClick = (geo: any) => {
        const deptName = geo.properties.NOMBDEP || geo.properties.NOMDEP || geo.properties.name;

        if (selectedDept === deptName) {
            setSelectedDept(null);
            onDepartmentClick(null);
        } else {
            if (deptName) {
                setSelectedDept(deptName);
                onDepartmentClick(deptName);
            } else {
                setSelectedDept(null);
                onDepartmentClick(null);
            }
        }
    };

    const handleToggleShowAll = () => {
        setShowAll(!showAll);
    };

    const itemsToDisplay = showAll ? departmentRanking.length : Math.min(10, departmentRanking.length);
    const displayData = departmentRanking.slice(0, itemsToDisplay);

    // Get unique color per department
    const getDepartmentColor = (deptName: string, isSelected: boolean, isHovered: boolean) => {
        const norm = normalizeName(deptName);
        const baseColor = DEPARTMENT_COLORS[norm] || "#64748b"; // Fallback to slate grey
        return baseColor;
    };

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#111c44] p-6 shadow-md border border-slate-300/80 dark:border-slate-800 h-full flex flex-col transition-all duration-300">
            {/* Loading Spinner overlay */}
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-[#111c44]/50 z-20 flex items-center justify-center rounded-2xl backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
                </div>
            )}

            {/* Floating Tooltip esmerilado */}
            {tooltip && (
                <div 
                    className="fixed pointer-events-none z-[9999] px-4 py-3 bg-[#0A192F]/95 backdrop-blur-md border border-white/10 shadow-2xl rounded-2xl animate-in fade-in duration-200"
                    style={{ 
                        left: `${tooltip.x + 15}px`, 
                        top: `${tooltip.y + 15}px` 
                    }}
                >
                    <p className="text-[9px] uppercase tracking-widest text-indigo-300 font-black mb-0.5">DEPARTAMENTO</p>
                    <h4 className="text-xs font-black text-white uppercase mb-1">{tooltip.name}</h4>
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
                        <p className="text-xs font-black text-white">
                            {new Intl.NumberFormat('es-PE').format(tooltip.count)} <span className="text-slate-400 font-bold">{label}</span>
                        </p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-row justify-between items-start mb-2 relative z-10">
                <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                        {hoveredDept || selectedDept || "DISTRIBUCIÓN GEOGRÁFICA"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {(hoveredDept || selectedDept) ? (
                            <>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                    {new Intl.NumberFormat('es-PE').format(
                                        departmentRanking.find(d => d.name === (hoveredDept || selectedDept))?.count || 0
                                    )}
                                </span> {label}
                            </>
                        ) : (
                            `Mapa de calor dinámico por ${label.toLowerCase()}`
                        )}
                    </p>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    </button>

                    {menuOpen && (
                        <div className="absolute right-full top-0 mr-2 w-32 bg-white dark:bg-[#0A192F] rounded-xl shadow-xl border border-slate-200 dark:border-white/10 z-50 animate-in fade-in zoom-in-95 duration-100 p-1">
                            {!selectedDept && (
                                <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        handleToggleShowAll();
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    {showAll ? 'Ver menos' : 'Ver más'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Map Container */}
            <div className="relative flex items-center justify-center rounded-2xl h-[380px] bg-slate-50/50 dark:bg-[#0A192F]/20 border border-slate-100 dark:border-white/5 my-2">
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{
                        center: [-75, -9.5],
                        scale: 1750
                    }}
                    width={460}
                    height={580}
                    style={{ width: "100%", height: "100%" }}
                >
                    <ZoomableGroup
                        center={[-75, -9.5]}
                        zoom={1}
                        minZoom={1}
                        maxZoom={1}
                        filterZoomEvent={(evt) => {
                            if (evt.type === 'wheel') return false;
                            return true;
                        }}
                    >
                        <Geographies geography="/peru-departments.geojson">
                            {({ geographies }) => {
                                return geographies.map((geo) => {
                                    const deptName = geo.properties.NOMBDEP || geo.properties.NOMDEP || geo.properties.name;
                                    const isSelected = selectedDept === deptName;
                                    const isHovered = hoveredDept === deptName;

                                    const pathFill = getDepartmentColor(deptName, isSelected, isHovered);

                                    return (
                                        <Geography
                                            key={`${geo.rsmKey}-${isSelected}`}
                                            geography={geo}
                                            onMouseEnter={(e) => handleMouseEnter(e, geo)}
                                            onMouseMove={handleMouseMove}
                                            onMouseLeave={handleMouseLeave}
                                            onClick={() => handleClick(geo)}
                                            style={{
                                                default: {
                                                    fill: pathFill,
                                                    stroke: isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)",
                                                    strokeWidth: isSelected ? 2.5 : 0.6,
                                                    outline: "none",
                                                    transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
                                                },
                                                hover: {
                                                    fill: pathFill,
                                                    stroke: "#FFFFFF",
                                                    strokeWidth: 1.8,
                                                    outline: "none",
                                                    cursor: "pointer",
                                                    zIndex: 10
                                                },
                                                pressed: {
                                                    fill: pathFill,
                                                    stroke: "#FFFFFF",
                                                    strokeWidth: 2.0,
                                                    outline: "none",
                                                },
                                            }}
                                        />
                                    );
                                });
                            }}
                        </Geographies>
                        {Object.entries(DEPARTMENT_CENTROIDS).map(([dept, coordinates]) => {
                            return (
                                <Marker key={dept} coordinates={coordinates}>
                                    <text
                                        textAnchor="middle"
                                        y={3}
                                        style={{
                                            fontFamily: "var(--font-sans, system-ui, sans-serif)",
                                            fontSize: "7.5px",
                                            fontWeight: "900",
                                            fill: "#FFFFFF",
                                            stroke: "rgba(10, 25, 47, 0.95)",
                                            strokeWidth: 2,
                                            paintOrder: "stroke fill",
                                            pointerEvents: "none",
                                            userSelect: "none"
                                        }}
                                    >
                                        {dept}
                                    </text>
                                </Marker>
                            );
                        })}
                    </ZoomableGroup>
                </ComposableMap>
            </div>

            {/* List Section */}
            <div className="mt-4 flex-1 flex flex-col min-h-0">
                <h4 className="flex-shrink-0 text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
                    {selectedDept ? `Provincias de ${selectedDept}` : `Top ${itemsToDisplay} Departamentos`}
                </h4>

                <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-2 [&::-webkit-scrollbar]:hidden"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }}
                >
                    {(selectedDept && provinceRanking.length > 0 ? provinceRanking : displayData).map((item, index) => {
                        let percentage = 0;
                        if (selectedDept && provinceRanking.length > 0) {
                            const totalProvinces = provinceRanking.reduce((acc, curr) => acc + curr.count, 0);
                            percentage = totalProvinces > 0 ? Math.round((item.count / totalProvinces) * 100) : 0;
                        } else {
                            const totalAll = departmentRanking.reduce((acc, curr) => acc + curr.count, 0);
                            percentage = totalAll > 0 ? Math.round((item.count / totalAll) * 100) : 0;
                        }

                        return (
                            <div key={index} className="flex flex-col gap-1.5 group/item">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        {/* Dynamic rank badge with micro-glow */}
                                        <div className="flex-shrink-0 w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-black text-[10px] shadow-sm transition-transform group-hover/item:scale-110">
                                            #{index + 1}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                                                {item.name}
                                            </p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                {new Intl.NumberFormat('es-PE').format(item.count)} {label}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {percentage}%
                                    </span>
                                </div>
                                <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ml-9" style={{ width: 'calc(100% - 2.25rem)' }}>
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}

                    {selectedDept && provinceRanking.length === 0 && (
                        <div className="text-center py-4 text-slate-400 text-xs font-bold">
                            No hay datos de provincias disponibles
                        </div>
                    )}
                </div>

                <div className="flex-shrink-0 mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        Mostrando {(selectedDept && provinceRanking.length > 0 ? provinceRanking : displayData).length} de {selectedDept && provinceRanking.length > 0 ? provinceRanking.length : departmentRanking.length} {selectedDept ? 'provincias' : 'departamentos'}
                    </p>
                </div>
            </div>
        </div>
    );
};
