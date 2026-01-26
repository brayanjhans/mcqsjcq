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

    const categories = [
        { key: "BIENES", label: "Bien", color: "#3B82F6", textColor: "text-blue-600" },
        { key: "SERVICIOS", label: "Servicio", color: "#EAB308", textColor: "text-yellow-600" },
        { key: "OBRAS", label: "Obra", color: "#10B981", textColor: "text-emerald-600" }
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
            textColor: cat.textColor
        };
    });

    // Calcular porcentajes para el gráfico (solo los que tienen valores)
    const chartPercentages = stats.map(s => parseFloat(s.percent));

    const options: ApexOptions = {
        chart: {
            type: "radialBar",
            sparkline: { enabled: false }
        },
        plotOptions: {
            radialBar: {
                startAngle: -90,
                endAngle: 90,
                track: {
                    background: "#E5E7EB",
                    strokeWidth: '100%',
                    margin: 8
                },
                hollow: {
                    size: '60%'
                },
                dataLabels: {
                    name: {
                        show: true,
                        fontSize: '14px',
                        color: '#64748B',
                        offsetY: -10
                    },
                    value: {
                        show: true,
                        fontSize: '32px',
                        fontWeight: 700,
                        color: '#1E293B',
                        offsetY: 5,
                        formatter: () => "100%"
                    },
                    total: {
                        show: true,
                        label: "Total",
                        fontSize: '14px',
                        color: "#64748B",
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

    const years = [2024, 2025, 2026];

    return (
        <div className="rounded-2xl bg-white dark:bg-[#111c44] p-6 shadow-sm border border-slate-100 dark:border-white/5 h-full flex flex-col justify-between">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Distribución por Tipo</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label} por categoría</p>
                </div>
                {/* YearSelector removed */}
            </div>

            {/* Chart */}
            <div className="flex-1 flex items-center justify-center relative -mt-6">
                <ReactApexChart
                    options={options}
                    series={chartPercentages}
                    type="radialBar"
                    height={250}
                    width="100%"
                />
            </div>

            {/* Footer Summary */}
            <div className="text-center mb-8">
                <p className="text-[13px] text-slate-500 dark:text-slate-400 max-w-[80%] mx-auto leading-relaxed">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{new Intl.NumberFormat('es-PE').format(totalAmount)}</span> {label.toLowerCase()} distribuidas:
                    {stats.map((stat, idx) => (
                        <span key={idx}>
                            {' '}<span className={`${stat.textColor} font-semibold`}>{stat.label.toUpperCase()}</span> ({stat.percent}%)
                            {idx < stats.length - 1 ? ',' : '.'}
                        </span>
                    ))}
                </p>
            </div>

            {/* Stats Grid Legend */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-white/10 pt-2 border-t border-slate-50 dark:border-white/5">
                {stats.map((stat, i) => (
                    <div key={i} className="text-center px-1">
                        <p className={`text-sm font-semibold ${stat.textColor} mb-1.5`}>
                            {stat.label}
                        </p>
                        <div className="flex items-center justify-center gap-1.5">
                            <p className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                                {stat.valueFormatted}
                            </p>
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                            {stat.percent}%
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};
