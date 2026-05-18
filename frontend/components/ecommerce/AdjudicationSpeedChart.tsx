"use client";

import React from "react";
import { Clock, Box, Briefcase, HardHat } from "lucide-react";

interface SpeedDetail {
    avg_days: number;
    count: number;
}

interface AdjudicationSpeedChartProps {
    data: {
        overall: number;
        total_count: number;
        categories: {
            BIEN: SpeedDetail;
            SERVICIO: SpeedDetail;
            OBRA: SpeedDetail;
            [key: string]: SpeedDetail;
        };
    };
}

export const AdjudicationSpeedChart: React.FC<AdjudicationSpeedChartProps> = ({ 
    data = {
        overall: 0.0,
        total_count: 0,
        categories: {
            BIEN: { avg_days: 0.0, count: 0 },
            SERVICIO: { avg_days: 0.0, count: 0 },
            OBRA: { avg_days: 0.0, count: 0 }
        }
    }
}) => {
    const categoriesList = [
        {
            key: "BIEN",
            label: "Bienes",
            icon: Box,
            colorClass: "from-blue-500 to-cyan-400 dark:from-blue-600 dark:to-cyan-400",
            bgClass: "bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/20",
            textColor: "text-blue-500 dark:text-blue-400",
            maxDays: 45 // Normalized scale
        },
        {
            key: "SERVICIO",
            label: "Servicios",
            icon: Briefcase,
            colorClass: "from-orange-500 to-amber-400 dark:from-orange-600 dark:to-amber-400",
            bgClass: "bg-orange-500/10 dark:bg-orange-500/15 border-orange-500/20",
            textColor: "text-orange-500 dark:text-orange-400",
            maxDays: 45
        },
        {
            key: "OBRA",
            label: "Obras",
            icon: HardHat,
            colorClass: "from-pink-500 to-rose-400 dark:from-pink-600 dark:to-rose-400",
            bgClass: "bg-pink-500/10 dark:bg-pink-500/15 border-pink-500/20",
            textColor: "text-pink-500 dark:text-pink-400",
            maxDays: 45
        }
    ];

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#111c44] p-4 shadow-sm border border-slate-300/80 dark:border-slate-800 h-full flex flex-col justify-between transition-all duration-300 group hover:border-orange-500/20 dark:hover:border-orange-500/10">
            {/* Ambient Glows */}
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-orange-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-start mb-2 relative z-10">
                <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-orange-500" /> Velocidad de Adjudicación
                    </h3>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 leading-tight">
                        Promedio de días reales desde convocatoria hasta buena pro
                    </p>
                </div>
                
                {/* General Average Badge */}
                <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-sm font-black text-slate-900 dark:text-white font-mono leading-none">
                        {data.overall.toFixed(1)}d
                    </span>
                    <span className="text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                        Promedio Gral.
                    </span>
                </div>
            </div>

            {/* Content / Progress Bars */}
            <div className="flex-1 flex flex-col justify-center gap-3 py-1 relative z-10">
                {categoriesList.map((cat) => {
                    const speed = data.categories[cat.key] || { avg_days: 0.0, count: 0 };
                    const percentWidth = Math.min((speed.avg_days / cat.maxDays) * 100, 100);
                    const Icon = cat.icon;

                    return (
                        <div key={cat.key} className="flex flex-col gap-1 group/row">
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-700 dark:text-slate-300">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <div className={`h-6 w-6 rounded-lg ${cat.bgClass} flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover/row:scale-105`}>
                                        <Icon className={`w-3.5 h-3.5 ${cat.textColor}`} />
                                    </div>
                                    <span className="truncate">{cat.label}</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0 font-mono">
                                    <span className="text-slate-900 dark:text-white font-black">{speed.avg_days.toFixed(1)} días</span>
                                    <span className="text-slate-400 dark:text-slate-500 text-[8px] font-bold">({new Intl.NumberFormat('es-PE').format(speed.count)})</span>
                                </div>
                            </div>
                            
                            {/* Premium Progress Track */}
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden shadow-inner p-[1px]">
                                <div 
                                    className={`h-full rounded-full bg-gradient-to-r ${cat.colorClass} shadow-[0_0_8px_rgba(255,255,255,0.2)] transition-all duration-1000 ease-out`}
                                    style={{ width: `${percentWidth}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom info note */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex-shrink-0 relative z-10">
                <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold leading-tight uppercase tracking-wider text-center">
                    Eficiencia medida sobre {new Intl.NumberFormat('es-PE').format(data.total_count)} adjudicaciones reales
                </p>
            </div>
        </div>
    );
};
