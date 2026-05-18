"use client";

import React, { useState, useEffect, useMemo } from "react";
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
    label?: string; // Dynamic label e.g., "Licitaciones"
}

// Centroids for each department of Peru
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

// Department Colors from reference image
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

const normalizeName = (name: string): string => {
    if (!name) return "";
    return name
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .trim();
};

// Genera provincias de forma realista o simulada
const getProvinciasData = (deptName: string, deptCount: number): ProvinceRanking[] => {
    const norm = normalizeName(deptName);
    let names: string[] = [];

    if (norm === "HUANUCO") {
        names = ["Leoncio Prado", "Marañón", "Huacaybamba", "Huamalíes", "Dos de Mayo", "Yarowilca", "Huánuco", "Pachitea", "Lauricocha", "Ambo", "Puerto Inca"];
    } else if (norm === "LIMA") {
        names = ["Lima", "Barranca", "Canta", "Cañete", "Huaral", "Huarochirí", "Huaura", "Oyón", "Yauyos"];
    } else if (norm === "AREQUIPA") {
        names = ["Arequipa", "Camaná", "Caravelí", "Castilla", "Caylloma", "Condesuyos", "Islay", "La Unión"];
    } else if (norm === "CUSCO") {
        names = ["Cusco", "Acomayo", "Anta", "Calca", "Canas", "Canchis", "Chumbivilcas", "Espinar", "La Convención", "Paruro", "Paucartambo", "Urubamba"];
    } else if (norm === "LORETO") {
        names = ["Maynas", "Alto Amazonas", "Loreto", "Mariscal Ramón Castilla", "Requena", "Ucayali", "Datem del Marañón", "Putumayo"];
    } else {
        names = [
            `${deptName} Centro`,
            `${deptName} Norte`,
            `${deptName} Sur`,
            `${deptName} Este`,
            `${deptName} Oeste`
        ];
    }

    // Distribuir de forma realista
    let remaining = deptCount;
    return names.map((name, i) => {
        let count = 0;
        if (i === names.length - 1) {
            count = remaining;
        } else {
            count = Math.max(1, Math.round(remaining * (0.4 / (i + 1))));
            remaining -= count;
        }
        return { name, count };
    }).sort((a, b) => b.count - a.count);
};

// Genera distritos simulados
const getDistritosData = (provName: string, provCount: number): ProvinceRanking[] => {
    const names = [
        `${provName} Cercado`,
        `${provName} Industrial`,
        `${provName} Residencial`,
        `${provName} El Prado`,
        `${provName} San Pedro`,
        `${provName} Las Lomas`
    ];

    let remaining = provCount;
    return names.map((name, i) => {
        let count = 0;
        if (i === names.length - 1) {
            count = remaining;
        } else {
            count = Math.max(1, Math.round(remaining * (0.35 / (i + 1))));
            remaining -= count;
        }
        return { name, count };
    }).sort((a, b) => b.count - a.count);
};

export const PeruInteractiveMap: React.FC<PeruInteractiveMapProps> = ({
    departmentRanking,
    provinceRanking: initialProvinceRanking,
    selectedDepartment,
    onDepartmentClick,
    loading,
    label = "Procesos"
}) => {
    // DRILL-DOWN STATES
    const [nivelActual, setNivelActual] = useState<number>(0);
    const [selectedDept, setSelectedDept] = useState<string | null>(null);
    const [selectedProv, setSelectedProv] = useState<string | null>(null);
    const [selectedDist, setSelectedDist] = useState<string | null>(null);

    const [hoveredZone, setHoveredZone] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showAll, setShowAll] = useState(false);

    // Floating Tooltip coordinates
    const [tooltip, setTooltip] = useState<{ name: string; count: number; x: number; y: number } | null>(null);

    // Sync selection with parent
    useEffect(() => {
        if (!selectedDepartment) {
            setSelectedDept(null);
            setSelectedProv(null);
            setSelectedDist(null);
            setNivelActual(0);
        } else {
            setSelectedDept(selectedDepartment);
            if (nivelActual === 0) {
                setNivelActual(1);
            }
        }
    }, [selectedDepartment]);

    // Calcular datos dinámicos según el nivel
    const activeData = useMemo(() => {
        if (nivelActual === 0) {
            return departmentRanking;
        } else if (nivelActual === 1 && selectedDept) {
            const deptCount = departmentRanking.find(d => d.name.toUpperCase() === selectedDept.toUpperCase())?.count || 1000;
            return getProvinciasData(selectedDept, deptCount);
        } else if (nivelActual === 2 && selectedProv) {
            const prevProvinces = getProvinciasData(selectedDept || "", 5000);
            const provCount = prevProvinces.find(p => p.name.toUpperCase() === selectedProv.toUpperCase())?.count || 500;
            return getDistritosData(selectedProv, provCount);
        }
        return [];
    }, [nivelActual, selectedDept, selectedProv, departmentRanking]);

    // Centroid of current view
    const viewConfig = useMemo(() => {
        if (nivelActual === 0 || !selectedDept) {
            return {
                center: [-75.0, -9.5] as [number, number],
                zoom: 1
            };
        }
        const norm = normalizeName(selectedDept);
        const center = DEPARTMENT_CENTROIDS[norm] || [-75.0, -9.5];

        if (nivelActual === 1) {
            return {
                center,
                zoom: 3.2 // Zoom focused into the department
            };
        } else {
            // Nivel 2: Zoom deeper
            return {
                center,
                zoom: 5.5
            };
        }
    }, [nivelActual, selectedDept]);

    // DYNAMIC IN-MEMORY GEOJSON FOR PROVINCES & DISTRICTS (SLICED GRID CELLS CLIPPED TO DEPARTMENT)
    const provincesGeoJSON = useMemo(() => {
        if (!selectedDept) return null;
        const norm = normalizeName(selectedDept);
        const [lon, lat] = DEPARTMENT_CENTROIDS[norm] || [-75.0, -9.5];
        const provinces = getProvinciasData(selectedDept, 1000);

        const N = provinces.length;
        let cols = Math.ceil(Math.sqrt(N));
        let rows = Math.ceil(N / cols);

        const features = provinces.map((prov, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;

            // Define overlapping grid coordinates centered on department centroid
            const minLon = lon - 1.2 + col * (2.4 / cols);
            const maxLon = lon - 1.2 + (col + 1) * (2.4 / cols);
            const minLat = lat - 1.5 + row * (3.0 / rows);
            const maxLat = lat - 1.5 + (row + 1) * (3.0 / rows);

            return {
                type: "Feature",
                id: `prov-${prov.name}`,
                properties: {
                    name: prov.name,
                    count: prov.count
                },
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        [minLon, minLat],
                        [maxLon, minLat],
                        [maxLon, maxLat],
                        [minLon, maxLat],
                        [minLon, minLat]
                    ]]
                }
            };
        });

        return {
            type: "FeatureCollection",
            features
        };
    }, [selectedDept]);

    const districtsGeoJSON = useMemo(() => {
        if (!selectedDept || !selectedProv) return null;
        const normDept = normalizeName(selectedDept);
        const [lon, lat] = DEPARTMENT_CENTROIDS[normDept] || [-75.0, -9.5];

        const provinces = getProvinciasData(selectedDept, 1000);
        const provIndex = provinces.findIndex(p => p.name.toUpperCase() === selectedProv.toUpperCase());
        const provCount = provinces[provIndex]?.count || 100;

        const N_provs = provinces.length;
        let p_cols = Math.ceil(Math.sqrt(N_provs));
        const p_row = Math.floor(provIndex / p_cols);
        const p_col = provIndex % p_cols;

        // Bounding box center of parent province
        const p_lon = lon - 1.2 + p_col * (2.4 / p_cols) + (1.2 / p_cols);
        const p_lat = lat - 1.5 + p_row * (3.0 / p_cols) + (1.5 / p_cols);

        const districts = getDistritosData(selectedProv, provCount);
        const N = districts.length;
        let cols = Math.ceil(Math.sqrt(N));
        let rows = Math.ceil(N / cols);

        const features = districts.map((dist, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;

            const w = (2.4 / p_cols) / cols;
            const h = (3.0 / p_cols) / rows;

            const minLon = p_lon - (1.2 / p_cols) + col * w;
            const maxLon = p_lon - (1.2 / p_cols) + (col + 1) * w;
            const minLat = p_lat - (1.5 / p_cols) + row * h;
            const maxLat = p_lat - (1.5 / p_cols) + (row + 1) * h;

            return {
                type: "Feature",
                id: `dist-${dist.name}`,
                properties: {
                    name: dist.name,
                    count: dist.count
                },
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        [minLon, minLat],
                        [maxLon, minLat],
                        [maxLon, maxLat],
                        [minLon, maxLat],
                        [minLon, minLat]
                    ]]
                }
            };
        });

        return {
            type: "FeatureCollection",
            features
        };
    }, [selectedDept, selectedProv]);

    // Coordinates of markers for labeling inside cells
    const subMarkers = useMemo(() => {
        if (!provincesGeoJSON) return [];
        return provincesGeoJSON.features.map(f => {
            const coords = f.geometry.coordinates[0];
            const cLon = (coords[0][0] + coords[2][0]) / 2;
            const cLat = (coords[0][1] + coords[2][1]) / 2;
            return {
                name: f.properties.name,
                count: f.properties.count,
                coordinates: [cLon, cLat] as [number, number]
            };
        });
    }, [provincesGeoJSON]);

    const handleMouseEnter = (event: React.MouseEvent, name: string, count: number) => {
        setHoveredZone(name);
        setTooltip({
            name,
            count,
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
        setHoveredZone(null);
        setTooltip(null);
    };

    const handleGeographyClick = (geo: any) => {
        if (nivelActual !== 0) return; // Sólo clicable en nivel nacional
        const deptName = geo.properties.NOMBDEP || geo.properties.NOMDEP || geo.properties.name;
        if (deptName) {
            setSelectedDept(deptName);
            setNivelActual(1);
            onDepartmentClick(deptName);
        }
    };

    const handleProvinceClick = (provName: string) => {
        if (nivelActual !== 1) return;
        setSelectedProv(provName);
        setNivelActual(2);
    };

    const handleBack = () => {
        setTooltip(null);
        if (nivelActual === 2) {
            setSelectedDist(null);
            setSelectedProv(null);
            setNivelActual(1);
        } else if (nivelActual === 1) {
            setSelectedDept(null);
            setNivelActual(0);
            onDepartmentClick(null);
        }
    };

    const handleToggleShowAll = () => {
        setShowAll(!showAll);
    };

    const itemsToDisplay = showAll ? activeData.length : Math.min(10, activeData.length);
    const displayData = activeData.slice(0, itemsToDisplay);

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#111c44] p-6 shadow-md border border-slate-300/80 dark:border-slate-800 h-full flex flex-col transition-all duration-300">
            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-[#111c44]/50 z-20 flex items-center justify-center rounded-2xl backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
                </div>
            )}

            {/* Premium Glassmorphic Tooltip */}
            {tooltip && (
                <div 
                    className="fixed pointer-events-none z-[9999] px-4 py-3 bg-[#0A192F]/95 backdrop-blur-md border border-white/10 shadow-2xl rounded-2xl animate-in fade-in duration-200"
                    style={{ 
                        left: `${tooltip.x + 15}px`, 
                        top: `${tooltip.y + 15}px` 
                    }}
                >
                    <p className="text-[9px] uppercase tracking-widest text-indigo-300 font-black mb-0.5">
                        {nivelActual === 0 ? "DEPARTAMENTO" : nivelActual === 1 ? "PROVINCIA" : "DISTRITO"}
                    </p>
                    <h4 className="text-xs font-black text-white uppercase mb-1">{tooltip.name}</h4>
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
                        <p className="text-xs font-black text-white">
                            {new Intl.NumberFormat('es-PE').format(tooltip.count)} <span className="text-slate-400 font-bold">{label}</span>
                        </p>
                    </div>
                </div>
            )}

            {/* Header / Controls */}
            <div className="flex flex-row justify-between items-start mb-2 relative z-10">
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        {nivelActual > 0 && (
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-black rounded-lg transition-all border border-indigo-500/20 animate-in slide-in-from-left duration-200"
                            >
                                ⬅ Volver
                            </button>
                        )}
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                            {hoveredZone || selectedDist || selectedProv || selectedDept || "DISTRIBUCIÓN GEOGRÁFICA"}
                        </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {nivelActual === 0 
                            ? "Mapa interactivo nacional. Clic en un departamento para profundizar." 
                            : nivelActual === 1 
                            ? `Provincias de ${selectedDept}. Clic en una provincia para ver distritos.`
                            : `Distritos de ${selectedProv} en ${selectedDept}. Clic en un distrito para seleccionarlo.`}
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
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    handleToggleShowAll();
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                {showAll ? 'Ver menos' : 'Ver más'}
                            </button>
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
                    {/* SVG Clip Path Definitions */}
                    <defs>
                        {nivelActual > 0 && selectedDept && (
                            <clipPath id="dept-clip">
                                <Geographies geography="/peru-departments.geojson">
                                    {({ geographies }: { geographies: any[] }) => {
                                        const selectedGeo = geographies.find((geo: any) => {
                                            const name = geo.properties.NOMBDEP || geo.properties.NOMDEP || geo.properties.name;
                                            return normalizeName(name) === normalizeName(selectedDept);
                                        });
                                        return selectedGeo ? (
                                            <Geography geography={selectedGeo} />
                                        ) : null;
                                    }}
                                </Geographies>
                            </clipPath>
                        )}
                    </defs>

                    <ZoomableGroup
                        center={viewConfig.center}
                        zoom={viewConfig.zoom}
                        minZoom={1}
                        maxZoom={10}
                        filterZoomEvent={(evt: any) => {
                            if (evt.type === 'wheel') return false;
                            return true;
                        }}
                    >
                        {/* 1. NATIONAL GEOGRAPHIES (DEPARTMENTS) */}
                        <Geographies geography="/peru-departments.geojson">
                            {({ geographies }: { geographies: any[] }) => {
                                return geographies.map((geo: any) => {
                                    const deptName = geo.properties.NOMBDEP || geo.properties.NOMDEP || geo.properties.name;
                                    const isSelected = selectedDept?.toUpperCase() === deptName?.toUpperCase();
                                    const isHovered = hoveredZone?.toUpperCase() === deptName?.toUpperCase();

                                    const baseColor = DEPARTMENT_COLORS[normalizeName(deptName)] || "#64748b";
                                    
                                    let fill = baseColor;
                                    let stroke = "rgba(255, 255, 255, 0.6)";
                                    let strokeWidth = 0.6;
                                    let opacity = 1.0;

                                    if (nivelActual > 0) {
                                        if (isSelected) {
                                            fill = "#0f172a"; // Dark placeholder fill for clipping parent
                                            stroke = baseColor;
                                            strokeWidth = 2.0;
                                        } else {
                                            fill = "rgba(148, 163, 184, 0.05)";
                                            stroke = "rgba(255, 255, 255, 0.05)";
                                            strokeWidth = 0.2;
                                            opacity = 0.15;
                                        }
                                    } else {
                                        if (isHovered) {
                                            stroke = "#FFFFFF";
                                            strokeWidth = 1.8;
                                        }
                                    }

                                    return (
                                        <Geography
                                            key={`${geo.rsmKey}-${isSelected}`}
                                            geography={geo}
                                            onMouseEnter={(e: any) => {
                                                if (nivelActual === 0) {
                                                    const deptData = departmentRanking.find(d => d.name.toUpperCase() === deptName.toUpperCase());
                                                    handleMouseEnter(e, deptName, deptData ? deptData.count : 0);
                                                }
                                            }}
                                            onMouseMove={handleMouseMove}
                                            onMouseLeave={handleMouseLeave}
                                            onClick={() => handleGeographyClick(geo)}
                                            style={{
                                                default: {
                                                    fill,
                                                    stroke,
                                                    strokeWidth,
                                                    opacity,
                                                    outline: "none",
                                                    transition: "all 300ms ease",
                                                },
                                                hover: {
                                                    fill: nivelActual === 0 ? baseColor : fill,
                                                    stroke: nivelActual === 0 ? "#FFFFFF" : stroke,
                                                    strokeWidth: nivelActual === 0 ? 1.8 : strokeWidth,
                                                    opacity,
                                                    outline: "none",
                                                    cursor: nivelActual === 0 ? "pointer" : "default",
                                                },
                                                pressed: {
                                                    fill,
                                                    stroke,
                                                    strokeWidth,
                                                    outline: "none",
                                                },
                                            }}
                                        />
                                    );
                                });
                            }}
                        </Geographies>

                        {/* 2. LEVEL 1: PROVINCES AS Contiguous Polygons clipped to selected department path */}
                        {nivelActual === 1 && provincesGeoJSON && (
                            <g clipPath="url(#dept-clip)" className="animate-in fade-in duration-300">
                                <Geographies geography={provincesGeoJSON}>
                                    {({ geographies }: { geographies: any[] }) => {
                                        return geographies.map((geo: any) => {
                                            const name = geo.properties.name;
                                            const count = geo.properties.count;
                                            const isHovered = hoveredZone?.toUpperCase() === name.toUpperCase();

                                            // Curated palette per province using hash string
                                            const colorKeys = Object.keys(DEPARTMENT_COLORS);
                                            const colorIndex = Math.abs(name.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0)) % colorKeys.length;
                                            const provinceColor = DEPARTMENT_COLORS[colorKeys[colorIndex]];

                                            return (
                                                <Geography
                                                    key={geo.rsmKey}
                                                    geography={geo}
                                                    onMouseEnter={(e: any) => handleMouseEnter(e, name, count)}
                                                    onMouseMove={handleMouseMove}
                                                    onMouseLeave={handleMouseLeave}
                                                    onClick={() => handleProvinceClick(name)}
                                                    style={{
                                                        default: {
                                                            fill: provinceColor,
                                                            stroke: "rgba(255, 255, 255, 0.8)",
                                                            strokeWidth: isHovered ? 1.8 : 0.6,
                                                            outline: "none",
                                                            transition: "all 200ms ease"
                                                        },
                                                        hover: {
                                                            fill: provinceColor,
                                                            stroke: "#FFFFFF",
                                                            strokeWidth: 1.8,
                                                            outline: "none",
                                                            cursor: "pointer"
                                                        },
                                                        pressed: {
                                                            fill: provinceColor,
                                                            stroke: "#FFFFFF",
                                                            strokeWidth: 2.0,
                                                            outline: "none"
                                                        }
                                                    }}
                                                />
                                            );
                                        });
                                    }}
                                </Geographies>
                            </g>
                        )}

                        {/* 3. LEVEL 2: DISTRICTS AS Contiguous Polygons clipped to selected department path */}
                        {nivelActual === 2 && districtsGeoJSON && (
                            <g clipPath="url(#dept-clip)" className="animate-in fade-in duration-300">
                                <Geographies geography={districtsGeoJSON}>
                                    {({ geographies }: { geographies: any[] }) => {
                                        return geographies.map((geo: any) => {
                                            const name = geo.properties.name;
                                            const count = geo.properties.count;
                                            const isSelected = selectedDist?.toUpperCase() === name.toUpperCase();
                                            const isHovered = hoveredZone?.toUpperCase() === name.toUpperCase();

                                            // Assign curated pastel color
                                            const colorKeys = Object.keys(DEPARTMENT_COLORS);
                                            const colorIndex = Math.abs(name.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0)) % colorKeys.length;
                                            const districtColor = DEPARTMENT_COLORS[colorKeys[colorIndex]];

                                            return (
                                                <Geography
                                                    key={geo.rsmKey}
                                                    geography={geo}
                                                    onMouseEnter={(e: any) => handleMouseEnter(e, name, count)}
                                                    onMouseMove={handleMouseMove}
                                                    onMouseLeave={handleMouseLeave}
                                                    onClick={() => setSelectedDist(isSelected ? null : name)}
                                                    style={{
                                                        default: {
                                                            fill: isSelected ? "#0f172a" : districtColor,
                                                            stroke: isSelected ? "#ffd700" : "rgba(255, 255, 255, 0.7)",
                                                            strokeWidth: isSelected ? 2.5 : 0.6,
                                                            outline: "none",
                                                            transition: "all 200ms ease"
                                                        },
                                                        hover: {
                                                            fill: isSelected ? "#0f172a" : districtColor,
                                                            stroke: "#FFFFFF",
                                                            strokeWidth: 1.8,
                                                            outline: "none",
                                                            cursor: "pointer"
                                                        },
                                                        pressed: {
                                                            fill: districtColor,
                                                            stroke: "#FFFFFF",
                                                            strokeWidth: 2.2,
                                                            outline: "none"
                                                        }
                                                    }}
                                                />
                                            );
                                        });
                                    }}
                                </Geographies>
                            </g>
                        )}

                        {/* 4. LABELS FOR REGIONS */}
                        {nivelActual === 0 && Object.entries(DEPARTMENT_CENTROIDS).map(([dept, coordinates]) => {
                            return (
                                <Marker key={`lbl-${dept}`} coordinates={coordinates}>
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

                        {/* Labels for Provinces in Level 1 */}
                        {nivelActual === 1 && subMarkers.map((marker) => {
                            return (
                                <Marker key={`lbl-prov-${marker.name}`} coordinates={marker.coordinates}>
                                    <text
                                        textAnchor="middle"
                                        y={1.5}
                                        style={{
                                            fontFamily: "var(--font-sans, system-ui, sans-serif)",
                                            fontSize: "5.5px",
                                            fontWeight: "900",
                                            fill: "#FFFFFF",
                                            stroke: "rgba(10, 25, 47, 0.95)",
                                            strokeWidth: 1.5,
                                            paintOrder: "stroke fill",
                                            pointerEvents: "none",
                                            userSelect: "none"
                                        }}
                                    >
                                        {marker.name.toUpperCase()}
                                    </text>
                                </Marker>
                            );
                        })}

                        {/* Labels for Districts in Level 2 */}
                        {nivelActual === 2 && districtsGeoJSON && districtsGeoJSON.features.map((feature: any) => {
                            const coords = feature.geometry.coordinates[0];
                            const cLon = (coords[0][0] + coords[2][0]) / 2;
                            const cLat = (coords[0][1] + coords[2][1]) / 2;
                            const isSelected = selectedDist?.toUpperCase() === feature.properties.name.toUpperCase();

                            return (
                                <Marker key={`lbl-dist-${feature.properties.name}`} coordinates={[cLon, cLat]}>
                                    <text
                                        textAnchor="middle"
                                        y={1.5}
                                        style={{
                                            fontFamily: "var(--font-sans, system-ui, sans-serif)",
                                            fontSize: "4.5px",
                                            fontWeight: "900",
                                            fill: isSelected ? "#ffd700" : "#FFFFFF",
                                            stroke: "rgba(10, 25, 47, 0.95)",
                                            strokeWidth: 1.2,
                                            paintOrder: "stroke fill",
                                            pointerEvents: "none",
                                            userSelect: "none"
                                        }}
                                    >
                                        {feature.properties.name.toUpperCase()}
                                    </text>
                                </Marker>
                            );
                        })}
                    </ZoomableGroup>
                </ComposableMap>
            </div>

            {/* List / Info Panel Section */}
            <div className="mt-4 flex-1 flex flex-col min-h-0">
                <h4 className="flex-shrink-0 text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider flex items-center justify-between">
                    <span>
                        {nivelActual === 0 
                            ? `Top ${itemsToDisplay} Departamentos` 
                            : nivelActual === 1 
                            ? `Provincias de ${selectedDept}` 
                            : `Distritos de ${selectedProv}`}
                    </span>
                    <span className="text-[10px] text-slate-400 font-black normal-case">
                        Nivel {nivelActual} ({nivelActual === 0 ? "Nacional" : nivelActual === 1 ? "Departamental" : "Provincial"})
                    </span>
                </h4>

                <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-2 [&::-webkit-scrollbar]:hidden"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }}
                >
                    {displayData.map((item, index) => {
                        const totalAll = activeData.reduce((acc, curr) => acc + curr.count, 0);
                        const percentage = totalAll > 0 ? Math.round((item.count / totalAll) * 100) : 0;
                        
                        const isHovered = hoveredZone?.toUpperCase() === item.name.toUpperCase();
                        const isSelected = selectedDist?.toUpperCase() === item.name.toUpperCase();

                        // Get matching curated color from palette
                        const colorKeys = Object.keys(DEPARTMENT_COLORS);
                        const colorIndex = Math.abs(item.name.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0)) % colorKeys.length;
                        const barColor = isSelected ? "#ffd700" : DEPARTMENT_COLORS[colorKeys[colorIndex]];

                        return (
                            <div 
                                key={index} 
                                className={`flex flex-col gap-1.5 group/item p-2 rounded-xl transition-all duration-200 border ${
                                    isHovered || isSelected
                                        ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700" 
                                        : "border-transparent"
                                }`}
                                onMouseEnter={(e) => {
                                    if (nivelActual === 0 || nivelActual === 1 || nivelActual === 2) {
                                        setHoveredZone(item.name);
                                    }
                                }}
                                onMouseLeave={() => {
                                    if (nivelActual === 0 || nivelActual === 1 || nivelActual === 2) {
                                        setHoveredZone(null);
                                    }
                                }}
                                onClick={() => {
                                    if (nivelActual === 0) {
                                        setSelectedDept(item.name);
                                        setNivelActual(1);
                                        onDepartmentClick(item.name);
                                    } else if (nivelActual === 1) {
                                        handleProvinceClick(item.name);
                                    } else if (nivelActual === 2) {
                                        setSelectedDist(isSelected ? null : item.name);
                                    }
                                }}
                                style={{ cursor: "pointer" }}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center font-black text-[10px] shadow-sm text-white transition-transform group-hover/item:scale-110"
                                            style={{ backgroundColor: isSelected ? "#0f172a" : barColor }}
                                        >
                                            #{index + 1}
                                        </div>
                                        <div>
                                            <p className={`text-xs font-bold uppercase tracking-tight ${isSelected ? "text-amber-500" : "text-slate-800 dark:text-slate-200"}`}>
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
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ 
                                            width: `${percentage}%`,
                                            backgroundColor: isSelected ? "#ffd700" : barColor
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}

                    {activeData.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-xs font-bold">
                            Cargando datos regionales de {label.toLowerCase()}...
                        </div>
                    )}
                </div>

                <div className="flex-shrink-0 mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        Mostrando {displayData.length} de {activeData.length} {nivelActual === 0 ? 'departamentos' : nivelActual === 1 ? 'provincias' : 'distritos'}
                    </p>
                </div>
            </div>
        </div>
    );
};
