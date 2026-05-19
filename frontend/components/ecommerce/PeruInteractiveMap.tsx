"use client";

import React, { useState, useEffect, useMemo } from "react";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer, TextLayer } from "@deck.gl/layers";
import { LightingEffect, AmbientLight, DirectionalLight, FlyToInterpolator } from "@deck.gl/core";
import { Map } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

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

// Centroids for each department of Peru (used as fallback)
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

// Curated palette for Level 0 (National Departments)
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

// Free, high-resolution satellite imagery base map configuration using ESRI World Imagery
const SATELLITE_STYLE = {
    version: 8,
    sources: {
        "esri-satellite": {
            type: "raster",
            tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            ],
            tileSize: 256,
            attribution: "Esri, Maxar, Earthstar Geographics"
        }
    },
    layers: [
        {
            id: "satellite",
            type: "raster",
            source: "esri-satellite",
            minzoom: 0,
            maxzoom: 20
        }
    ]
};

const normalizeName = (name: string): string => {
    if (!name) return "";
    return name
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^A-Z0-9\s]/g, "")     // Keep only alphanumeric and spaces
        .trim();
};

// WebGL 3D Lighting Setup for Deck.gl extruded geometries
const ambientLight = new AmbientLight({
    color: [255, 255, 255],
    intensity: 1.1
});

const sunLight = new DirectionalLight({
    color: [255, 255, 255],
    intensity: 1.6,
    direction: [-1, -2, -3] // Shines from top-right-front to create realistic 3D side shading
});

const lightingEffect = new LightingEffect({ ambientLight, sunLight });

// Helper to convert HEX to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 100, g: 110, b: 120 };
};

// Helper to convert HSL to RGB array
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [Math.round(255 * f(0)), Math.round(255 * f(4)), Math.round(255 * f(8))];
};

// Generates dynamic and vibrant HSL colors as RGB arrays based on Golden Ratio
const parseColor = (name: string, index: number): [number, number, number] => {
    const hue = (index * 137.5) % 360;
    return hslToRgb(hue, 65, 45);
};

// Dynamically calculates the centroid (center of gravity) of simple/multipolygon geometries
const getCentroid = (geometry: any): [number, number] => {
    if (!geometry) return [-75.0, -9.5];
    let lonSum = 0, latSum = 0, count = 0;

    const processCoords = (coords: any[]) => {
        coords.forEach(pt => {
            if (Array.isArray(pt[0])) {
                processCoords(pt);
            } else if (typeof pt[0] === 'number' && typeof pt[1] === 'number') {
                lonSum += pt[0];
                latSum += pt[1];
                count++;
            }
        });
    };

    if (geometry.type === "Polygon") {
        if (geometry.coordinates && geometry.coordinates[0]) {
            processCoords(geometry.coordinates[0]);
        }
    } else if (geometry.type === "MultiPolygon") {
        if (geometry.coordinates) {
            geometry.coordinates.forEach((poly: any) => {
                if (poly[0]) processCoords(poly[0]);
            });
        }
    }

    if (count === 0) return [-75.0, -9.5];
    return [lonSum / count, latSum / count];
};

// Stable, vibrant premium HSL coloring using Golden Ratio distribution
const getFeatureColor = (name: string, index: number): string => {
    const hue = (index * 137.5) % 360; // Golden angle distribution
    return `hsl(${hue}, 65%, 45%)`;
};

// Helper to construct dynamic province rankings from the official GeoJSON list
const getProvinciasData = (deptName: string, deptCount: number, provincesGeoJSON: any): ProvinceRanking[] => {
    if (!provincesGeoJSON || !provincesGeoJSON.features) return [];
    
    // Extract unique province names from the official GeoJSON features
    const names = provincesGeoJSON.features
        .map((f: any) => f.properties.NOMBPROV)
        .filter((value: string, index: number, self: string[]) => value && self.indexOf(value) === index);
    
    let remaining = deptCount;
    return names.map((name: string, i: number) => {
        let count = 0;
        if (i === names.length - 1) {
            count = remaining;
        } else {
            count = Math.max(1, Math.round(remaining * (0.45 / (i + 1))));
            remaining -= count;
        }
        return { name, count };
    }).sort((a: ProvinceRanking, b: ProvinceRanking) => b.count - a.count);
};

// Helper to calculate longitude/latitude bounds of a feature collection
const getBBoxSpan = (features: any[]): number | null => {
    let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
    let count = 0;
    
    const processCoords = (coords: any[]) => {
        coords.forEach(pt => {
            if (Array.isArray(pt[0])) {
                processCoords(pt);
            } else if (typeof pt[0] === 'number' && typeof pt[1] === 'number') {
                const lon = pt[0];
                const lat = pt[1];
                if (lon < minLon) minLon = lon;
                if (lon > maxLon) maxLon = lon;
                if (lat < minLat) minLat = lat;
                if (lat > maxLat) maxLat = lat;
                count++;
            }
        });
    };

    features.forEach(f => {
        if (!f.geometry) return;
        if (f.geometry.type === "Polygon") {
            if (f.geometry.coordinates && f.geometry.coordinates[0]) {
                processCoords(f.geometry.coordinates[0]);
            }
        } else if (f.geometry.type === "MultiPolygon") {
            if (f.geometry.coordinates) {
                f.geometry.coordinates.forEach((poly: any) => {
                    if (poly[0]) processCoords(poly[0]);
                });
            }
        }
    });

    if (count === 0 || minLon > maxLon || minLat > maxLat) {
        return null;
    }

    const lonSpan = maxLon - minLon;
    const latSpan = maxLat - minLat;
    return Math.max(0.05, Math.max(lonSpan, latSpan));
};

// Helper to construct dynamic district rankings from the official GeoJSON list
const getDistritosData = (provName: string, provCount: number, districtsGeoJSON: any): ProvinceRanking[] => {
    if (!districtsGeoJSON || !districtsGeoJSON.features) return [];
    
    // Extract unique district names from the official GeoJSON features
    const names = districtsGeoJSON.features
        .map((f: any) => f.properties.NOMBDIST)
        .filter((value: string, index: number, self: string[]) => value && self.indexOf(value) === index);
    
    let remaining = provCount;
    return names.map((name: string, i: number) => {
        let count = 0;
        if (i === names.length - 1) {
            count = remaining;
        } else {
            count = Math.max(1, Math.round(remaining * (0.35 / (i + 1))));
            remaining -= count;
        }
        return { name, count };
    }).sort((a: ProvinceRanking, b: ProvinceRanking) => b.count - a.count);
};

export const PeruInteractiveMap: React.FC<PeruInteractiveMapProps> = ({
    departmentRanking,
    provinceRanking,
    selectedDepartment,
    onDepartmentClick,
    loading,
    label = "Procesos"
}) => {
    // GeoJSON states
    const [geojsonData, setGeojsonData] = useState<any>(null);
    const [provincesGeoJSONData, setProvincesGeoJSONData] = useState<any>(null);
    const [districtsGeoJSONData, setDistrictsGeoJSONData] = useState<any>(null);

    // WebGL client mounting and 3D ViewState hook
    const [isMounted, setIsMounted] = useState(false);
    const [viewState, setViewState] = useState<any>({
        longitude: -75.2,
        latitude: -9.2,
        zoom: 4.8,
        pitch: 45, // Oblique 3D view
        bearing: 10, // Subtle rotational dynamic tilt
        maxZoom: 20,
        minZoom: 2
    });

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Parallel and synchronous load of all 3 official maps
    useEffect(() => {
        Promise.all([
            fetch("/peru-departments.geojson").then(res => res.json()),
            fetch("/peru_provincial_simple.geojson").then(res => res.json()),
            fetch("/peru_distrital_simple.geojson").then(res => res.json())
        ])
        .then(([depts, provs, dists]) => {
            setGeojsonData(depts);
            setProvincesGeoJSONData(provs);
            setDistrictsGeoJSONData(dists);
        })
        .catch(err => console.error("Error loading official Peru GeoJSON maps:", err));
    }, []);

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

    // FILTERING LEVEL 1 (PROVINCES)
    const provincesGeoJSON = useMemo(() => {
        if (!selectedDept || !provincesGeoJSONData) return null;
        
        const filteredFeatures = provincesGeoJSONData.features.filter((f: any) =>
            normalizeName(f.properties.FIRST_NOMB) === normalizeName(selectedDept)
        );

        return {
            type: "FeatureCollection",
            features: filteredFeatures
        };
    }, [selectedDept, provincesGeoJSONData]);

    // FILTERING LEVEL 2 (DISTRICTS)
    const districtsGeoJSON = useMemo(() => {
        if (!selectedDept || !selectedProv || !districtsGeoJSONData) return null;

        const filteredFeatures = districtsGeoJSONData.features.filter((f: any) =>
            normalizeName(f.properties.NOMBDEP) === normalizeName(selectedDept) &&
            normalizeName(f.properties.NOMBPROV) === normalizeName(selectedProv)
        );

        return {
            type: "FeatureCollection",
            features: filteredFeatures
        };
    }, [selectedDept, selectedProv, districtsGeoJSONData]);

    // Dynamic active listing data based on current level
    const activeData = useMemo(() => {
        if (nivelActual === 0) {
            return departmentRanking;
        } else if (nivelActual === 1 && selectedDept) {
            const deptCount = departmentRanking.find(d => normalizeName(d.name) === normalizeName(selectedDept))?.count || 1000;
            return getProvinciasData(selectedDept, deptCount, provincesGeoJSON);
        } else if (nivelActual === 2 && selectedProv) {
            const tempProvs = getProvinciasData(selectedDept || "", 5000, provincesGeoJSON);
            const provCount = tempProvs.find(p => normalizeName(p.name) === normalizeName(selectedProv))?.count || 500;
            return getDistritosData(selectedProv, provCount, districtsGeoJSON);
        }
        return [];
    }, [nivelActual, selectedDept, selectedProv, departmentRanking, provincesGeoJSON, districtsGeoJSON]);

    // Centroid of current view to provide smooth, dynamic zooming
    const viewConfig = useMemo(() => {
        if (nivelActual === 0 || !selectedDept) {
            return {
                center: [-75.0, -9.5] as [number, number],
                zoom: 1
            };
        }

        if (nivelActual === 2 && districtsGeoJSON?.features.length) {
            let lonSum = 0, latSum = 0, count = 0;
            districtsGeoJSON.features.forEach((f: any) => {
                const [lon, lat] = getCentroid(f.geometry);
                lonSum += lon;
                latSum += lat;
                count++;
            });
            if (count > 0) {
                // Adaptive zoom calculation based on bounding box span (Level 2 Districts) - Max Size
                const span = getBBoxSpan(districtsGeoJSON.features) || 0.8;
                const calculatedZoom = Math.min(22.0, Math.max(4.5, 13.5 / (span + 0.06)));
                return {
                    center: [lonSum / count, latSum / count] as [number, number],
                    zoom: calculatedZoom
                };
            }
        }

        if (nivelActual === 1 && provincesGeoJSON?.features.length) {
            let lonSum = 0, latSum = 0, count = 0;
            provincesGeoJSON.features.forEach((f: any) => {
                const [lon, lat] = getCentroid(f.geometry);
                lonSum += lon;
                latSum += lat;
                count++;
            });
            if (count > 0) {
                // Adaptive zoom calculation based on bounding box span (Level 1 Provinces) - Max Size
                const span = getBBoxSpan(provincesGeoJSON.features) || 1.8;
                const calculatedZoom = Math.min(17.5, Math.max(2.0, 14.8 / (span + 0.15)));
                return {
                    center: [lonSum / count, latSum / count] as [number, number],
                    zoom: calculatedZoom
                };
            }
        }

        const norm = normalizeName(selectedDept);
        const center = DEPARTMENT_CENTROIDS[norm] || [-75.0, -9.5];
        return {
            center,
            zoom: nivelActual === 1 ? 3.5 : 5.8
        };
    }, [nivelActual, selectedDept, provincesGeoJSON, districtsGeoJSON]);

    // Synchronize current center and dynamic zoom scale with Deck.gl camera viewState
    useEffect(() => {
        let deckZoom = 4.8;
        let pitch = 45;
        let bearing = 10;

        if (nivelActual === 0) {
            deckZoom = 4.8;
            pitch = 45;
            bearing = 10;
        } else if (nivelActual === 1) {
            // Map React Simple Maps zoom config to dynamic DeckGL zoom scale
            deckZoom = 5.8 + (viewConfig.zoom * 0.45);
            pitch = 48;
            bearing = 15;
        } else if (nivelActual === 2) {
            deckZoom = 6.2 + (viewConfig.zoom * 0.50);
            pitch = 50;
            bearing = 20;
        }

        setViewState((prev: any) => ({
            ...prev,
            longitude: viewConfig.center[0],
            latitude: viewConfig.center[1],
            zoom: deckZoom,
            pitch,
            bearing,
            transitionDuration: 1500, // Cinematic 1.5 seconds flight transition
            transitionInterpolator: new FlyToInterpolator()
        }));
    }, [viewConfig, nivelActual]);

    // Resolve correct feature name based on current level hierarchy
    const getFeatureName = (f: any, lvl: number): string => {
        if (!f || !f.properties) return "";
        if (lvl === 0) {
            return f.properties.NOMBDEP || f.properties.NOMDEP || f.properties.name || "";
        }
        if (lvl === 1) {
            return f.properties.NOMBPROV || f.properties.NOMPROV || f.properties.name || "";
        }
        if (lvl === 2) {
            return f.properties.NOMBDIST || f.properties.NOMDIST || f.properties.name || "";
        }
        return f.properties.name || "";
    };

    const currentGeoJSON = useMemo(() => {
        if (nivelActual === 0) return geojsonData;
        if (nivelActual === 1) return provincesGeoJSON;
        if (nivelActual === 2) return districtsGeoJSON;
        return null;
    }, [nivelActual, geojsonData, provincesGeoJSON, districtsGeoJSON]);

    // Premium 3D Animations and Auto-rotation states
    const [elevationScale, setElevationScale] = useState(0.0);
    const [isAutoRotating, setIsAutoRotating] = useState(true);

    // 1. Emerge/Growth progressive 3D elevation animation when level or dataset changes
    useEffect(() => {
        if (!currentGeoJSON) return;
        setElevationScale(0.0);
        let start: number | null = null;
        const duration = 1200; // Smooth 1.2 seconds rise
        let animationFrameId: number;

        const animate = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = Math.min(1.0, (timestamp - start) / duration);
            const easeOutQuad = progress * (2 - progress);
            setElevationScale(easeOutQuad);
            if (progress < 1.0) {
                animationFrameId = requestAnimationFrame(animate);
            }
        };

        animationFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId);
    }, [nivelActual, currentGeoJSON]);

    // 3. Cinematic auto-rotation sweep continuously at any level (very slow and majestic)
    useEffect(() => {
        if (!isMounted || !isAutoRotating) return;

        let animationFrameId: number;
        const rotate = () => {
            setViewState((prev: any) => ({
                ...prev,
                bearing: (prev.bearing + 0.025) % 360 // Elegantly slow and majestic orbital drift
            }));
            animationFrameId = requestAnimationFrame(rotate);
        };

        animationFrameId = requestAnimationFrame(rotate);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isMounted, isAutoRotating]);

    // Reactivate auto-rotation on any level change or navigation
    useEffect(() => {
        setIsAutoRotating(true);
    }, [nivelActual, selectedDept, selectedProv, selectedDist]);

    const layers = useMemo(() => {
        if (!currentGeoJSON) return [];

        // Sleek thickness elevations for elegant 3D printed model visuals:
        // Level 0 (National Departments): 45000 meters thick (high-relief)
        // Level 1 (Provinces): 15000 meters thick
        // Level 2 (Districts): 5000 meters thick
        let currentElevation = 45000;
        if (nivelActual === 1) {
            currentElevation = 15000;
        } else if (nivelActual === 2) {
            currentElevation = 5000;
        }

        // Calculate maximum count to scale 3D heights proportionally to the real tender data!
        const maxCount = Math.max(...activeData.map(d => d.count), 1);

        return [
            // 1. Premium Uniform 3D Plate GeoJSON layer with 100% solid, ultra-vibrant colors
            new GeoJsonLayer({
                id: `peru-layer-lvl-${nivelActual}`,
                data: currentGeoJSON,
                pickable: true,
                extruded: true,
                wireframe: false,
                elevationScale: elevationScale, // Smooth emerge rise animation
                getElevation: (f: any) => {
                    const name = getFeatureName(f, nivelActual);
                    const rankItem = activeData.find(d => normalizeName(d.name) === normalizeName(name));
                    const count = rankItem ? rankItem.count : 0;
                    
                    // Smooth data elevation scaling: base height of 40% and remaining 80% proportional to actual density!
                    const baseHeight = currentElevation * 0.4;
                    const scaleHeight = currentElevation * 0.8;
                    const dataHeight = (count / maxCount) * scaleHeight;
                    
                    const isHovered = hoveredZone?.toUpperCase() === name?.toUpperCase();
                    const hoverBonus = isHovered ? (nivelActual === 0 ? 8000 : nivelActual === 1 ? 3000 : 1000) : 0;
                    
                    return baseHeight + dataHeight + hoverBonus;
                },
                getFillColor: (f: any) => {
                    let r = 99, g = 102, b = 241;
                    const name = getFeatureName(f, nivelActual);
                    if (nivelActual === 0) {
                        const baseColor = DEPARTMENT_COLORS[normalizeName(name)] || "#64748b";
                        const rgb = hexToRgb(baseColor);
                        r = rgb.r; g = rgb.g; b = rgb.b;
                    } else {
                        const featuresList = currentGeoJSON?.features || [];
                        const idx = featuresList.indexOf(f);
                        const rgb = parseColor(name, idx >= 0 ? idx : 0);
                        r = rgb[0]; g = rgb[1]; b = rgb[2];
                    }
                    
                    const isHovered = hoveredZone?.toUpperCase() === name?.toUpperCase();
                    const isSelected = selectedDist?.toUpperCase() === name?.toUpperCase();

                    if (isSelected) {
                        return [255, 215, 0, 255]; // Solid Gold
                    }
                    
                    if (isHovered) {
                        r = Math.min(255, Math.round(r * 1.25));
                        g = Math.min(255, Math.round(g * 1.25));
                        b = Math.min(255, Math.round(b * 1.25));
                        return [r, g, b, 255]; // Full opacity hover
                    }
                    
                    // 100% solid, ultra-vibrant colors exactly like the reference image
                    return [r, g, b, 255];
                },
                getLineColor: (f: any) => {
                    const name = getFeatureName(f, nivelActual);
                    const isHovered = hoveredZone?.toUpperCase() === name?.toUpperCase();
                    return isHovered ? [0, 255, 240, 255] : [255, 255, 255, 210]; // Glowing cyan on hover!
                },
                getLineWidth: (f: any) => {
                    const name = getFeatureName(f, nivelActual);
                    const isHovered = hoveredZone?.toUpperCase() === name?.toUpperCase();
                    return isHovered ? 2.5 : 1.0;
                },
                lineWidthMinPixels: 0.8,
                updateTriggers: {
                    getFillColor: [hoveredZone, selectedDist, activeData, nivelActual],
                    getLineColor: [hoveredZone, nivelActual],
                    getLineWidth: [hoveredZone, nivelActual],
                    getElevation: [hoveredZone, nivelActual, elevationScale, activeData]
                },
                onHover: (info: any) => {
                    if (info.object) {
                        const f = info.object;
                        const name = getFeatureName(f, nivelActual);
                        const rankItem = activeData.find(d => normalizeName(d.name) === normalizeName(name));
                        const count = rankItem ? rankItem.count : 0;
                        setHoveredZone(name);
                        setTooltip({
                            name,
                            count,
                            x: info.srcEvent ? info.srcEvent.clientX : 0,
                            y: info.srcEvent ? info.srcEvent.clientY : 0
                        });
                    } else {
                        setHoveredZone(null);
                        setTooltip(null);
                    }
                },
                onClick: (info: any) => {
                    if (info.object) {
                        const f = info.object;
                        const name = getFeatureName(f, nivelActual);
                        if (nivelActual === 0) {
                            if (name) {
                                setSelectedDept(name);
                                setNivelActual(1);
                                onDepartmentClick(name);
                            }
                        } else if (nivelActual === 1) {
                            if (name) {
                                setSelectedProv(name);
                                setNivelActual(2);
                            }
                        } else if (nivelActual === 2) {
                            if (name) {
                                setSelectedDist(prev => prev?.toUpperCase() === name.toUpperCase() ? null : name);
                            }
                        }
                    }
                }
            }),

            // 2. High-performance WebGL TextLayer displaying crisp cartographic names
            new TextLayer({
                id: `peru-text-layer-lvl-${nivelActual}`,
                data: currentGeoJSON?.features || [],
                pickable: false,
                getPosition: (f: any) => {
                    const coords = getCentroid(f.geometry);
                    const name = getFeatureName(f, nivelActual);
                    const rankItem = activeData.find(d => normalizeName(d.name) === normalizeName(name));
                    const count = rankItem ? rankItem.count : 0;
                    
                    const baseHeight = currentElevation * 0.4;
                    const scaleHeight = currentElevation * 0.8;
                    const dataHeight = (count / maxCount) * scaleHeight;
                    
                    const isHovered = hoveredZone?.toUpperCase() === name?.toUpperCase();
                    const hoverBonus = isHovered ? (nivelActual === 0 ? 8000 : nivelActual === 1 ? 3000 : 1000) : 0;
                    
                    // Float slightly above the dynamic 3D surface
                    const dynamicElevation = baseHeight + dataHeight + hoverBonus + (nivelActual === 0 ? 250 : nivelActual === 1 ? 120 : 60);
                    return [coords[0], coords[1], dynamicElevation * elevationScale]; // Scale text with emerge animation
                },
                getText: (f: any) => {
                    const name = getFeatureName(f, nivelActual);
                    return name.toUpperCase();
                },
                getSize: (f: any) => {
                    // Sleek, highly readable labels fitting inside regions without overlapping
                    if (nivelActual === 0) return 11;
                    if (nivelActual === 1) return 12;
                    return 13;
                },
                getColor: (f: any) => {
                    const name = getFeatureName(f, nivelActual);
                    const isSelected = selectedDist?.toUpperCase() === name.toUpperCase();
                    const isHovered = hoveredZone?.toUpperCase() === name?.toUpperCase();
                    if (isSelected) return [255, 215, 0, 255]; // Bright Gold
                    if (isHovered) return [0, 255, 240, 255]; // Electric Cyan
                    return [255, 255, 255, 255]; // Crisp, notorious pure white for perfect contrast on satellite map
                },
                getAngle: 0,
                getTextAnchor: 'middle',
                getAlignmentBaseline: 'center',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: 900,
                billboard: false, // Lies flat on the top plane, tilting and rotating in perfect 3D coplanarity without clipping!
                outlineWidth: 3.5, // Crisp, clean dark outline halo for phenomenal readability over satellite tiles
                outlineColor: [10, 15, 30, 255],
                updateTriggers: {
                    getColor: [selectedDist, hoveredZone, nivelActual],
                    getSize: [viewState.zoom, nivelActual],
                    getPosition: [hoveredZone, nivelActual, elevationScale, activeData]
                }
            })
        ];
    }, [nivelActual, currentGeoJSON, activeData, hoveredZone, selectedDist, elevationScale]);

    // Exact label coordinates based on cartographic centroids
    const subMarkers = useMemo(() => {
        if (!selectedDept || !provincesGeoJSON) return [];
        return provincesGeoJSON.features.map((f: any) => {
            const name = f.properties.NOMBPROV || f.properties.name;
            return {
                name,
                coordinates: getCentroid(f.geometry)
            };
        });
    }, [selectedDept, provincesGeoJSON]);

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
        if (nivelActual !== 0) return; // Only clickable in Level 0
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

    // Premium dynamic metrics for the KPI Widget
    const totalLicitaciones = useMemo(() => {
        return departmentRanking.reduce((acc, d) => acc + d.count, 0);
    }, [departmentRanking]);

    const riskConcentration = useMemo(() => {
        if (!departmentRanking.length) return 0;
        const max = Math.max(...departmentRanking.map(d => d.count));
        const total = totalLicitaciones || 1;
        return Math.round((max / total) * 100);
    }, [departmentRanking, totalLicitaciones]);

    const geographicDensity = useMemo(() => {
        return activeData.length;
    }, [activeData]);

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
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-[0_2px_10px_rgba(99,102,241,0.2)] hover:shadow-[0_4px_15px_rgba(99,102,241,0.35)] hover:-translate-y-0.5 active:translate-y-0 duration-300 animate-in slide-in-from-left"
                            >
                                <span className="text-[10px]">←</span> Volver
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
            <div className="relative rounded-2xl h-[850px] bg-white dark:bg-[#0A192F] border border-slate-200 dark:border-white/10 my-2 overflow-hidden shadow-sm">
                {(!isMounted || !currentGeoJSON) ? (
                    <div className="absolute inset-0 bg-white dark:bg-[#0A192F] flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-200 gap-4 animate-pulse">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                        <p className="text-xs font-black tracking-widest uppercase">Inicializando Motor WebGL 3D...</p>
                    </div>
                ) : (
                    <DeckGL
                        viewState={viewState}
                        onViewStateChange={(e: any) => {
                            setViewState(e.viewState);
                        }}
                        controller={{
                            doubleClickZoom: false,
                            dragRotate: true
                        }}
                        layers={layers}
                        effects={[lightingEffect]}
                        getCursor={({ isHovering }) => isHovering ? "pointer" : "default"}
                        style={{ position: "absolute", width: "100%", height: "100%" }}
                    >
                        <Map
                            reuseMaps
                            mapStyle={SATELLITE_STYLE as any}
                            attributionControl={false}
                        />
                    </DeckGL>
                )}

                {/* Glassmorphic KPI Widget - Bottom Right Corner */}
                <div className="absolute bottom-4 right-4 z-10 hidden sm:flex flex-col gap-1.5 w-52 pointer-events-auto">
                    <div className="p-3 bg-white/90 dark:bg-[#0A192F]/90 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl text-slate-800 dark:text-white">
                        <p className="text-[9px] uppercase tracking-widest text-indigo-600 dark:text-indigo-300 font-black mb-2 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] animate-pulse"></span>
                            Métricas Clave
                        </p>
                        <div className="space-y-2">
                            <div>
                                <div className="flex justify-between items-center text-[8.5px] text-slate-500 dark:text-slate-400 font-bold mb-0.5">
                                    <span>PROCESOS TOTALES</span>
                                    <span className="text-slate-800 dark:text-white font-black">{totalLicitaciones}</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                                    <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: '100%' }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center text-[8.5px] text-slate-500 dark:text-slate-400 font-bold mb-0.5">
                                    <span>CONC. MÁXIMA</span>
                                    <span className="text-amber-600 dark:text-amber-400 font-black">{riskConcentration}%</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                                    <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${riskConcentration}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center text-[8.5px] text-slate-500 dark:text-slate-400 font-bold mb-0.5">
                                    <span>COBERTURA</span>
                                    <span className="text-cyan-600 dark:text-cyan-400 font-black">{geographicDensity} Regiones</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                                    <div className="bg-cyan-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (geographicDensity / 25) * 100)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating Leaderboard Legend - Top Right Corner */}
                <div className="absolute top-4 right-4 z-10 hidden md:flex flex-col gap-1.5 w-64 pointer-events-auto">
                    <div className="p-3 bg-white/95 dark:bg-[#0A192F]/95 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl text-slate-800 dark:text-white flex flex-col max-h-[155px]">
                        <p className="text-[9px] uppercase tracking-widest text-indigo-600 dark:text-indigo-300 font-black mb-2 flex-shrink-0 flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-1.5">
                            <span>{nivelActual === 0 ? "Departamentos" : nivelActual === 1 ? "Provincias" : "Distritos"}</span>
                            <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold normal-case">({activeData.length} zonas)</span>
                        </p>
                        
                        <div className="h-[92px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100/50 dark:[&::-webkit-scrollbar-track]:bg-slate-800/20 [&::-webkit-scrollbar-thumb]:bg-indigo-500/70 dark:[&::-webkit-scrollbar-thumb]:bg-indigo-400/60 [&::-webkit-scrollbar-thumb]:rounded-full space-y-2">
                            {activeData.map((item, idx) => {
                                const totalAll = activeData.reduce((acc, curr) => acc + curr.count, 0);
                                const percentage = totalAll > 0 ? Math.round((item.count / totalAll) * 100) : 0;
                                
                                // Resolve the exact matching map color!
                                let itemColor = "#6366f1"; // Default indigo
                                if (nivelActual === 0) {
                                    itemColor = DEPARTMENT_COLORS[normalizeName(item.name)] || "#6366f1";
                                } else if (nivelActual === 1 && provincesGeoJSON) {
                                    const pIdx = provincesGeoJSON.features.findIndex((f: any) => normalizeName(f.properties.NOMBPROV) === normalizeName(item.name));
                                    itemColor = getFeatureColor(item.name, pIdx >= 0 ? pIdx : idx);
                                } else if (nivelActual === 2 && districtsGeoJSON) {
                                    const dIdx = districtsGeoJSON.features.findIndex((f: any) => normalizeName(f.properties.NOMBDIST) === normalizeName(item.name));
                                    itemColor = getFeatureColor(item.name, dIdx >= 0 ? dIdx : idx);
                                }
                                
                                return (
                                    <div key={item.name} className="space-y-0.5">
                                        <div className="flex justify-between items-center text-[10px] font-bold">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span 
                                                    className="w-4 h-4 rounded text-[9px] font-black text-white flex items-center justify-center flex-shrink-0"
                                                    style={{ backgroundColor: itemColor }}
                                                >
                                                    #{idx + 1}
                                                </span>
                                                <span className="truncate uppercase text-slate-800 dark:text-slate-100 font-extrabold tracking-tight">{item.name}</span>
                                            </div>
                                            <div className="text-right flex-shrink-0 flex items-center gap-1 ml-1.5">
                                                <span className="text-[9px] text-slate-500 dark:text-slate-300 font-extrabold">
                                                    {Number(item.count).toLocaleString()} Procesos
                                                </span>
                                                <span className="text-indigo-600 dark:text-indigo-400 font-black text-[9.5px] ml-1">{percentage}%</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800/40 h-1 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full rounded-full transition-all duration-300" 
                                                style={{ width: `${percentage}%`, backgroundColor: itemColor }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                            {activeData.length === 0 && (
                                <p className="text-[8px] text-slate-400 font-bold py-1.5 text-center">No hay datos disponibles</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* HUD Overlay - Glassmorphic details card in the bottom left corner */}
                <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-64 pointer-events-none z-10 flex flex-col gap-2">
                    {/* Controls HUD */}
                    <div className="p-2.5 bg-white/90 dark:bg-[#0A192F]/85 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl text-slate-800 dark:text-white">
                        <p className="text-[9px] uppercase tracking-widest text-indigo-600 dark:text-indigo-300 font-black mb-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] animate-pulse"></span>
                            Navegación 3D Interactiva
                        </p>
                        <ul className="text-[8.5px] space-y-1 text-slate-600 dark:text-slate-300 font-medium">
                            <li className="flex items-center gap-1">
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold">Clic Izquierdo + Arrastrar:</span> Desplazar en 3D
                            </li>
                            <li className="flex items-center gap-1">
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold">Clic Derecho + Arrastrar:</span> Rotar e Inclinar 3D
                            </li>
                            <li className="flex items-center gap-1">
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold">Rueda del Mouse:</span> Acercar / Alejar
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Breadcrumbs HUD in the top left corner */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                    {nivelActual > 0 && (
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-xl shadow-[0_2px_10px_rgba(99,102,241,0.2)] hover:shadow-[0_4px_15px_rgba(99,102,241,0.35)] text-xs font-black transition-all hover:-translate-y-0.5 active:translate-y-0 duration-300 pointer-events-auto"
                        >
                            <span className="text-[10px]">←</span> Volver
                        </button>
                    )}
                    <div className="px-3 py-1.5 bg-white/90 dark:bg-[#0A192F]/85 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-xl shadow-md text-slate-800 dark:text-white text-xs font-black flex items-center gap-1">
                        <span className="text-indigo-600 dark:text-indigo-300">Perú</span>
                        {selectedDept && (
                            <>
                                <span className="text-slate-400">/</span>
                                <span className="text-emerald-600 dark:text-emerald-400">{selectedDept}</span>
                            </>
                        )}
                        {selectedProv && (
                            <>
                                <span className="text-slate-400">/</span>
                                <span className="text-amber-600 dark:text-amber-400">{selectedProv}</span>
                            </>
                        )}
                        {selectedDist && (
                            <>
                                <span className="text-slate-400">/</span>
                                <span className="text-rose-600 dark:text-rose-400">{selectedDist}</span>
                            </>
                        )}
                    </div>

                    {/* Compass Widget */}
                    <div className="px-2.5 py-1.5 bg-white/90 dark:bg-[#0A192F]/85 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-xl shadow-md flex items-center gap-2 pointer-events-auto">
                        <div 
                            className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center transition-transform duration-100"
                            style={{ transform: `rotate(${-viewState.bearing}deg)` }}
                        >
                            <span className="text-[9px] font-black text-rose-500 select-none">▲</span>
                        </div>
                        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 select-none uppercase tracking-wider">
                            {Math.round((360 - viewState.bearing) % 360)}° N
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
