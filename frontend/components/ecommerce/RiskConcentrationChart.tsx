"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { ShieldAlert } from "lucide-react";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface FinancialEntity {
    name: string;
    count: number;
    amount: number;
    dept_count: number;
}

interface RiskConcentrationChartProps {
    data: FinancialEntity[];
}

export const RiskConcentrationChart: React.FC<RiskConcentrationChartProps> = ({ data = [] }) => {
    // Robust mapping to support both raw/original keys and page.tsx transformed keys
    const normalized = (data || []).map((item: any) => ({
        name: item.name || "",
        amount: Number(item.amount ?? item.monto ?? 0),
        count: Number(item.count ?? item.garantias ?? 0)
    }));

    // 1. Process data to get Top 5 and others
    const sorted = [...normalized].sort((a, b) => b.amount - a.amount);
    const totalAmount = sorted.reduce((sum, item) => sum + item.amount, 0);

    const top5 = sorted.slice(0, 5);
    const othersAmount = sorted.slice(5).reduce((sum, item) => sum + item.amount, 0);

    const chartData = top5.map(item => ({
        name: item.name,
        amount: item.amount,
        percent: totalAmount > 0 ? (item.amount / totalAmount * 100) : 0
    }));

    if (othersAmount > 0) {
        chartData.push({
            name: "OTROS",
            amount: othersAmount,
            percent: totalAmount > 0 ? (othersAmount / totalAmount * 100) : 0
        });
    }

    const series = chartData.map(d => parseFloat(d.percent.toFixed(1)));
    const labels = chartData.map(d => d.name);

    // Premium Color Palette: Royal Blue, Electric Purple, Fuchsia, Coral Orange, Cyan, Slate Grey
    const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#ff7849", "#06b6d4", "#64748b"];

    const options: ApexOptions = {
        chart: {
            type: "donut",
            dropShadow: {
                enabled: true,
                top: 4,
                left: 0,
                blur: 6,
                opacity: 0.1,
                color: "#8b5cf6"
            }
        },
        stroke: {
            show: true,
            width: 2,
            colors: ["transparent"]
        },
        colors: colors.slice(0, chartData.length),
        legend: {
            show: false
        },
        plotOptions: {
            pie: {
                donut: {
                    size: "70%",
                    hollow: {
                        size: "65%"
                    },
                    labels: {
                        show: true,
                        name: {
                            show: true,
                            fontSize: "10px",
                            fontWeight: "800",
                            color: "#64748b",
                            offsetY: -5
                        },
                        value: {
                            show: true,
                            fontSize: "16px",
                            fontWeight: "900",
                            color: "#64748b",
                            offsetY: 4,
                            formatter: (val) => `${val}%`
                        },
                        total: {
                            show: true,
                            label: "RIESGO",
                            fontSize: "9px",
                            fontWeight: "850",
                            color: "#94a3b8",
                            formatter: () => "TOP 5"
                        }
                    }
                }
            }
        },
        dataLabels: {
            enabled: false
        },
        tooltip: {
            y: {
                formatter: (val) => `${val}%`
            }
        }
    };

    const formatMonto = (num: number) => {
        if (num >= 1e9) return "S/ " + (num / 1e9).toFixed(1) + "B";
        if (num >= 1e6) return "S/ " + (num / 1e6).toFixed(1) + "M";
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(num);
    };

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#111c44] p-4 shadow-sm border border-slate-300/80 dark:border-slate-800 h-full flex flex-col justify-between transition-all duration-300 group hover:border-violet-500/20 dark:hover:border-violet-500/10">
            {/* Ambient glows */}
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-violet-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-pink-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex-shrink-0 relative z-10">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-violet-500" /> Concentración de Riesgo
                </h3>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 leading-tight">
                    Participación de mercado por garantías emitidas (Top Emisores)
                </p>
            </div>

            <div className="flex-1 flex items-center justify-center relative my-2 min-h-[140px] z-10">
                {chartData.length > 0 ? (
                    <ReactApexChart
                        options={options}
                        series={series}
                        type="donut"
                        height={180}
                        width="100%"
                    />
                ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">Sin datos para mostrar</p>
                )}
            </div>

            {/* Top 3 List Legend */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 dark:border-white/5 flex-shrink-0 relative z-10">
                {chartData.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] font-black text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i] }} />
                            <span className="truncate uppercase">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                            <span className="text-slate-900 dark:text-white font-black">{item.percent.toFixed(1)}%</span>
                            <span className="text-slate-400 dark:text-slate-500">{formatMonto(item.amount)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
