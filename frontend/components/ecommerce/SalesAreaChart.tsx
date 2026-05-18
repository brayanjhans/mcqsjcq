"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface SalesAreaChartProps {
    data: Array<{ month: string; total: number }>;
    selectedYear: number;
    onYearChange: (year: number) => void;
    label?: string; // Dynamic
}

export const SalesAreaChart: React.FC<SalesAreaChartProps> = ({ data = [], selectedYear, onYearChange, label = "Licitaciones" }) => {
    const allMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    // Create a map for quick lookup
    const dataMap = new Map(data.map(item => [item.month, item.total]));

    // Generate complete 12-month arrays
    const categories = allMonths;
    const seriesData = allMonths.map(m => dataMap.get(m) || 0);

    const options: ApexOptions = {
        chart: {
            type: "area",
            toolbar: { show: false },
            background: 'transparent',
            fontFamily: 'inherit',
            animations: { enabled: true },
            // Ultra-Premium dropShadow creating a neon glowing trace effect under the curve line
            dropShadow: {
                enabled: true,
                top: 8,
                left: 0,
                blur: 10,
                color: '#10b981', // Gorgeous Electric Emerald Green glow
                opacity: 0.24
            }
        },
        stroke: {
            curve: "smooth",
            width: 4.5,
            colors: ["#10b981"] // Electric Emerald Green line stroke
        },
        colors: ["#10b981"],
        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                type: 'vertical',
                colorStops: [
                    {
                        offset: 0,
                        color: "#10b981",
                        opacity: 0.38
                    },
                    {
                        offset: 100,
                        color: "#06b6d4",
                        opacity: 0.002
                    }
                ]
            }
        },
        xaxis: {
            categories: categories,
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                style: { colors: "rgba(148, 163, 184, 0.5)", fontSize: '10px', fontWeight: 700 },
                offsetY: 2
            },
            tooltip: { enabled: false }
        },
        yaxis: {
            show: true,
            labels: {
                style: { colors: "rgba(148, 163, 184, 0.5)", fontSize: '10px', fontWeight: 700 },
                offsetX: -10,
                formatter: (value) => new Intl.NumberFormat('es-PE').format(value)
            },
            min: undefined, // Dynamic scaling so the curve is "alive" and showing realistic variations
            forceNiceScale: true
        },
        grid: {
            show: true,
            borderColor: "rgba(148, 163, 184, 0.04)", // Extremely subtle grid lines for absolute clean aesthetic
            strokeDashArray: 4,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } },
            padding: { top: 10, right: 15, bottom: 0, left: 15 }
        },
        dataLabels: { enabled: false },
        tooltip: {
            theme: 'dark',
            custom: function ({ series, seriesIndex, dataPointIndex, w }: any) {
                if (!series || !series[seriesIndex] || series[seriesIndex][dataPointIndex] === undefined) {
                    return '';
                }

                const value = new Intl.NumberFormat('es-PE').format(series[seriesIndex][dataPointIndex]);
                const month = allMonths[dataPointIndex] ?? '';

                return `
                    <div class="px-4 py-3 bg-[#0A192F]/90 backdrop-blur-md border border-white/10 shadow-2xl rounded-2xl animate-in fade-in duration-300">
                        <div class="text-[10px] uppercase tracking-widest text-emerald-300 font-extrabold mb-1.5">${month}</div>
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
                            <span class="text-xs font-black text-white">${value} <span class="text-slate-400 font-bold">${label}</span></span>
                        </div>
                    </div>
                `;
            },
            y: {
                formatter: function (val) {
                    return new Intl.NumberFormat('es-PE').format(val) + " " + label;
                }
            },
            marker: { show: false },
        },
        markers: {
            size: 0,
            colors: ["#10b981"],
            strokeColors: "#fff",
            strokeWidth: 2.5,
            hover: {
                size: 6,
                sizeOffset: 3
            }
        }
    };

    const series = [
        { name: label, data: seriesData },
    ];

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#111c44] p-4 shadow-sm border border-slate-300/80 dark:border-slate-800 transition-all duration-300 h-full flex flex-col justify-between">
            {/* Soft Ambient Glows */}
            <div className="absolute -top-10 -left-10 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2 shrink-0 relative z-10">
                <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Estadísticas</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">Total de {label.toLowerCase()} por mes</p>
                </div>
            </div>
            <div className="flex-1 w-full -ml-2 min-h-0 relative z-10">
                <ReactApexChart options={options} series={series} type="area" height="100%" />
            </div>
        </div>
    );
};
