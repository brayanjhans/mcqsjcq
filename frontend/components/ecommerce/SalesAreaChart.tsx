"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { YearSelector } from "@/components/dashboard/YearSelector";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface SalesAreaChartProps {
    data: Array<{ month: string; total: number }>;
    selectedYear: number;
    onYearChange: (year: number) => void;
}

export const SalesAreaChart: React.FC<SalesAreaChartProps> = ({ data = [], selectedYear, onYearChange }) => {
    // Normalize data to ensure 12 months always exist (fixes undefined errors and empty charts)
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
            animations: { enabled: true }
        },
        stroke: {
            curve: "smooth",
            width: 3,
            colors: ["#6366f1"]
        },
        colors: ["#6366f1"],
        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.5,
                opacityTo: 0.1,
                stops: [0, 90, 100]
            }
        },
        xaxis: {
            categories: categories,
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                style: { colors: "#94a3b8", fontSize: '12px', fontWeight: 500 },
                offsetY: 0
            },
            tooltip: { enabled: false }
        },
        yaxis: {
            show: true,
            labels: {
                style: { colors: "#94a3b8", fontSize: '11px', fontWeight: 500 },
                offsetX: -10,
                formatter: (value) => value.toFixed(0)
            },
            min: 0, // Force y-axis to start at 0
            forceNiceScale: true
        },
        grid: {
            show: true,
            borderColor: "#f1f5f9",
            strokeDashArray: 0,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } },
            padding: { top: 0, right: 10, bottom: 0, left: 10 }
        },
        dataLabels: { enabled: false },
        tooltip: {
            theme: 'light',
            custom: function ({ series, seriesIndex, dataPointIndex, w }: any) {
                // Safety checks
                if (!series || !series[seriesIndex] || series[seriesIndex][dataPointIndex] === undefined) {
                    return '';
                }

                const value = series[seriesIndex][dataPointIndex];
                const month = allMonths[dataPointIndex] ?? '';

                return `
                    <div class="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg">
                        <div class="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-1">${month}</div>
                        <div class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
                            <span class="text-sm font-bold text-slate-900 dark:text-white">${value} Licitaciones</span>
                        </div>
                    </div>
                `;
            },
            y: {
                formatter: function (val) {
                    return val + " Licitaciones"
                }
            },
            marker: { show: false },
        },
        markers: { size: 0, hover: { size: 5, sizeOffset: 3 } }
    };

    const series = [
        { name: "Licitaciones", data: seriesData },
    ];

    const years = [2024, 2025, 2026];

    return (
        <div className="rounded-2xl bg-white dark:bg-[#111c44] p-6 shadow-sm border border-slate-100 dark:border-white/5 transition-colors duration-300 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Estadísticas</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Total de licitaciones por mes</p>
                </div>
                <div className="flex bg-slate-50 dark:bg-slate-800 rounded-lg p-1">
                    <YearSelector
                        selectedYear={selectedYear}
                        onYearChange={onYearChange}
                        allowAll={true}
                    />
                </div>
            </div>
            <div className="flex-1 w-full -ml-2 min-h-0 relative">
                <ReactApexChart options={options} series={series} type="area" height="100%" />
            </div>
        </div>
    );
};

