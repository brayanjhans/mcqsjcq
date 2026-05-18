"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { TrendingUp } from "lucide-react";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface DistributionRadialChartProps {
    data: Array<{ type: string, total: number }>;
    selectedYear?: number;
    onYearChange?: (year: number) => void;
    label?: string; // Dynamic
}

export const DistributionRadialChart: React.FC<DistributionRadialChartProps> = ({
    data = [],
    selectedYear = 2024,
    onYearChange = () => { },
    label = "Licitaciones"
}) => {
    const totalAmount = data.reduce((sum, item) => sum + item.total, 0);

    // Curated Ultra-Premium Color Palette featuring Electric Orange, Royal Blue, and Emerald Green
    const categories = [
        { key: "BIENES", label: "Bien", color: "#3b82f6", textColor: "text-blue-500", badgeBg: "bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/20" },
        { key: "SERVICIOS", label: "Servicio", color: "#ff7849", textColor: "text-orange-500", badgeBg: "bg-orange-500/10 dark:bg-orange-500/15 border-orange-500/20" },
        { key: "OBRAS", label: "Obra", color: "#10b981", textColor: "text-emerald-500", badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/20" }
    ];

    const stats = categories.map(cat => {
        const item = data.find(d => d.type.toUpperCase().includes(cat.key) || cat.key.includes(d.type.toUpperCase()));
        const value = item ? item.total : 0;
        const percent = totalAmount > 0 ? (value / totalAmount * 100) : 0;

        return {
            label: cat.label,
            value: value,
            valueFormatted: new Intl.NumberFormat('es-PE').format(value),
            percent: percent.toFixed(2),
            color: cat.color,
            textColor: cat.textColor,
            badgeBg: cat.badgeBg
        };
    });

    const chartPercentages = stats.map(s => parseFloat(s.percent));

    const options: ApexOptions = {
        chart: {
            type: "radialBar",
            sparkline: { enabled: false },
            dropShadow: {
                enabled: true,
                top: 4,
                left: 0,
                blur: 6,
                opacity: 0.15,
                color: "#ff7849"
            }
        },
        plotOptions: {
            radialBar: {
                startAngle: -110,
                endAngle: 110,
                track: {
                    background: "rgba(148, 163, 184, 0.05)",
                    strokeWidth: '95%',
                    margin: 4
                },
                hollow: {
                    size: '48%'
                },
                dataLabels: {
                    name: {
                        show: true,
                        fontSize: '9px',
                        fontWeight: '850',
                        color: '#64748b',
                        offsetY: -5,
                        textAnchor: 'middle'
                    },
                    value: {
                        show: true,
                        fontSize: '15px',
                        fontWeight: '900',
                        color: '#ff7849', // Gorgeous Orange center value color
                        offsetY: 2,
                        formatter: () => "100%"
                    },
                    total: {
                        show: true,
                        label: "TOTAL",
                        fontSize: '9px',
                        fontWeight: '850',
                        color: "#94a3b8",
                        formatter: () => "100%"
                    }
                }
            }
        },
        colors: stats.map(s => s.color),
        stroke: {
            lineCap: "round"
        },
        labels: stats.map(s => s.label)
    };

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#111c44] p-4 shadow-sm border border-slate-300/80 dark:border-slate-800 h-full flex flex-col justify-between transition-all duration-300">
            {/* Soft Ambient Glows */}
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1 gap-2 flex-shrink-0 relative z-10">
                <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Distribución por Tipo</h3>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 leading-tight">
                        467,416 procesos distribuidas: <span className="text-blue-500 font-extrabold">BIEN (44.61%)</span>, <span className="text-orange-500 font-extrabold">SERVICIO (43.53%)</span>, <span className="text-emerald-500 font-extrabold">OBRA (11.86%)</span>
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 flex items-center justify-center relative -mt-6 min-h-[140px] z-10">
                <ReactApexChart
                    options={options}
                    series={chartPercentages}
                    type="radialBar"
                    height={190}
                    width="100%"
                />
            </div>

            {/* Stats Grid Legend */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-white/5 pt-2 border-t border-slate-100 dark:border-white/5 flex-shrink-0 relative z-10">
                {stats.map((stat, i) => (
                    <div key={i} className="text-center px-0.5 group/legend">
                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[8px] font-black ${stat.textColor} ${stat.badgeBg} mb-1 transition-all duration-300 group-hover/legend:scale-105`}>
                            <span className="w-1 h-1 rounded-full bg-current" />
                            {stat.label.toUpperCase()}
                        </div>
                        <div className="flex items-center justify-center gap-0.5">
                            <p className="text-xs font-black text-slate-900 dark:text-white tracking-tight">
                                {stat.valueFormatted}
                            </p>
                            <TrendingUp className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0" />
                        </div>
                        <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 mt-0.5">
                            {stat.percent}%
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};
