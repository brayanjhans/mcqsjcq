"use client";

import React, { useState } from "react";
import {
    ComposableMap,
    Geographies,
    Geography,
    ZoomableGroup
} from "react-simple-maps";

import { YearSelector } from "@/components/dashboard/YearSelector";

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

    // Create a map of department data for quick lookup
    const dataMap = new Map(
        departmentRanking.map(d => [d.name.toUpperCase(), d])
    );

    const handleMouseEnter = (geo: any) => {
        const deptName = geo.properties.NOMBDEP || geo.properties.NOMDEP || geo.properties.name;
        setHoveredDept(deptName);
    };

    const handleMouseLeave = () => {
        setHoveredDept(null);
    };

    const handleClick = (geo: any) => {
        const deptName = geo.properties.NOMBDEP || geo.properties.NOMDEP || geo.properties.name;

        if (selectedDept === deptName) {
            // If the same department is clicked, deselect it
            setSelectedDept(null);
            onDepartmentClick(null);
        } else {
            // Select Department
            if (deptName) { // Ensure deptName is not null/undefined before selecting
                setSelectedDept(deptName);
                onDepartmentClick(deptName);
            } else {
                // If deptName is null/undefined, deselect
                setSelectedDept(null);
                onDepartmentClick(null);
            }
        }
    };

    const handleToggleShowAll = () => {
        setShowAll(!showAll);
    };

    // Calculate how many items to display
    const itemsToDisplay = showAll ? departmentRanking.length : Math.min(10, departmentRanking.length);
    const displayData = departmentRanking.slice(0, itemsToDisplay);

    return (
        <div className="rounded-xl bg-white dark:bg-[#111c44] p-6 shadow-sm border border-slate-200 dark:border-white/5 h-full flex flex-col transition-colors duration-300">
            {/* Header */}
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-[#111c44]/50 z-20 flex items-center justify-center rounded-xl backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                </div>
            )}

            <div className="flex flex-row justify-between items-start mb-2 relative">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
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
                            `Distribución nacional de ${label.toLowerCase()}`
                        )}
                    </p>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                    >
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {menuOpen && (
                        <div className="absolute right-full top-0 mr-2 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 animate-in fade-in zoom-in-95 duration-100 p-1">
                            {!selectedDept && (
                                <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        handleToggleShowAll();
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-md transition-colors"
                                >
                                    {showAll ? 'Ver menos' : 'Ver más'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Map Container */}
            <div className="relative flex items-center justify-center rounded-xl h-[380px]">
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

                                    // Matched Design: Dark Slate Blue (#334155) for all, no heatmap
                                    const baseColor = "#334155";
                                    const activeColor = "#2563EB"; // Brand Blue for selection
                                    const hoverColor = "#475569"; // Lighter slate for hover

                                    // Selection takes priority over hover
                                    let defaultFill = isSelected ? activeColor : (isHovered ? hoverColor : baseColor);
                                    let hoverFill = isSelected ? activeColor : hoverColor; // If selected, keep activeColor even on hover

                                    return (
                                        <Geography
                                            key={`${geo.rsmKey}-${isSelected}`}
                                            geography={geo}
                                            onMouseEnter={() => handleMouseEnter(geo)}
                                            onMouseLeave={handleMouseLeave}
                                            onClick={() => handleClick(geo)}
                                            style={{
                                                default: {
                                                    fill: defaultFill,
                                                    stroke: "#FFFFFF",
                                                    strokeWidth: 0.5,
                                                    outline: "none",
                                                    transition: "all 200ms ease",
                                                },
                                                hover: {
                                                    fill: hoverFill,
                                                    stroke: "#FFFFFF",
                                                    strokeWidth: 1,
                                                    outline: "none",
                                                    cursor: "pointer",
                                                    zIndex: 10
                                                },
                                                pressed: {
                                                    fill: activeColor,
                                                    stroke: "#FFFFFF",
                                                    strokeWidth: 1,
                                                    outline: "none",
                                                },
                                            }}
                                        />
                                    );
                                });
                            }}
                        </Geographies>
                    </ZoomableGroup>
                </ComposableMap>
            </div>

            {/* List Section - Flex column to fill remaining space */}
            <div className="mt-2 flex-1 flex flex-col min-h-0">
                <h4 className="flex-shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    {selectedDept ? `Provincias de ${selectedDept}` : `Top ${itemsToDisplay} Departamentos`}
                </h4>

                <div className={`flex-1 overflow-y-auto min-h-0 space-y-3 pr-2 [&::-webkit-scrollbar]:hidden`}
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
                            <div key={index} className="flex flex-col gap-1.5">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        {/* Blue Badge for Rank */}
                                        <div className="flex-shrink-0 w-6 h-6 rounded bg-blue-500 text-white flex items-center justify-center font-bold text-[10px]">
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
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}

                    {selectedDept && provinceRanking.length === 0 && (
                        <div className="text-center py-4 text-slate-400 text-xs">
                            No hay datos de provincias disponibles
                        </div>
                    )}
                </div>

                <div className="flex-shrink-0 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        Mostrando {(selectedDept && provinceRanking.length > 0 ? provinceRanking : displayData).length} de {selectedDept && provinceRanking.length > 0 ? provinceRanking.length : departmentRanking.length} {selectedDept ? 'provincias' : 'departamentos'}
                    </p>
                </div>
            </div>
        </div>
    );
};
