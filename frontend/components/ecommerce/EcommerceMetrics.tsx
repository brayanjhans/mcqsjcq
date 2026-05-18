"use client";

import React from "react";
import { Users, Package, ShieldCheck, TrendingUp } from "lucide-react";

interface EcommerceMetricsProps {
    licitaciones?: number;
    monto?: number;
    label?: string; // Dynamic Label

    yearLic?: number;
    onYearLicChange?: (year: number) => void;

    yearMonto?: number;
    onYearMontoChange?: (year: number) => void;

    // Semáforo de garantías
    totalGarantias?: number;
    garantiasActivas?: number;
    garantiasPorVencer?: number;
    garantiasVencidas?: number;
}

export const EcommerceMetrics: React.FC<EcommerceMetricsProps> = ({
    licitaciones,
    monto,
    label = "Licitaciones",
    yearLic = 2024,
    onYearLicChange = () => { },
    yearMonto = 2024,
    onYearMontoChange = () => { },
    
    totalGarantias = 0,
    garantiasActivas = 0,
    garantiasPorVencer = 0,
    garantiasVencidas = 0
}) => {
    const formattedMonto = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(monto || 0);
    const formattedLicitaciones = new Intl.NumberFormat('es-PE').format(licitaciones || 0);
    const formattedGarantiasActivas = new Intl.NumberFormat('es-PE').format(garantiasActivas);
    const formattedTotalGarantias = new Intl.NumberFormat('es-PE').format(totalGarantias);

    // Short format (e.g. 326.7k)
    const formatShortNum = (num: number) => {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + "k";
        }
        return num.toString();
    };

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Card 1: Count */}
            <div className="relative overflow-hidden group rounded-2xl bg-gradient-to-br from-indigo-50/30 to-white dark:from-[#111c44]/40 dark:to-[#0b122b] p-3 shadow-sm border border-slate-300/80 dark:border-slate-800 hover:border-indigo-500/20 dark:hover:border-indigo-500/10 hover:shadow-md transition-all duration-300 flex items-center justify-between gap-4">
                {/* Glow ambiental superior */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
                
                <div className="flex items-center gap-3 relative z-10">
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center shadow-inner transition-transform duration-300 group-hover:scale-110 flex-shrink-0">
                        <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                            {formattedLicitaciones}
                        </h3>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 mt-1 block">Crecimiento constante</span>
                    </div>
                </div>

                <div className="relative z-10 flex-shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-500/20 shadow-sm">
                        <TrendingUp className="w-2.5 h-2.5" /> +4.8%
                    </span>
                </div>
            </div>

            {/* Card 2: Monto Adjudicado */}
            <div className="relative overflow-hidden group rounded-2xl bg-gradient-to-br from-emerald-50/30 to-white dark:from-[#111c44]/40 dark:to-[#0b122b] p-3 shadow-sm border border-slate-300/80 dark:border-slate-800 hover:border-emerald-500/20 dark:hover:border-emerald-500/10 hover:shadow-md transition-all duration-300 flex items-center justify-between gap-4">
                {/* Glow ambiental superior */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
                
                <div className="flex items-center gap-3 relative z-10">
                    <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center shadow-inner transition-transform duration-300 group-hover:scale-110 flex-shrink-0">
                        <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">
                            Monto {yearMonto === 0 ? "Adjudicado (Total)" : "Adjudicado"}
                        </p>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                            {formattedMonto}
                        </h3>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 mt-1 block">Capital estatal distribuido</span>
                    </div>
                </div>

                <div className="relative z-10 flex-shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-500/20 shadow-sm">
                        <TrendingUp className="w-2.5 h-2.5" /> +12.3%
                    </span>
                </div>
            </div>

            {/* Card 3: Garantías Activas & Semáforo */}
            <div className="relative overflow-hidden group rounded-2xl bg-gradient-to-br from-indigo-50/30 to-white dark:from-[#111c44]/40 dark:to-[#0b122b] p-3 shadow-sm border border-slate-300/80 dark:border-slate-800 hover:border-indigo-500/20 dark:hover:border-indigo-500/10 hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-2.5">
                {/* Glow ambiental superior */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
                
                <div className="flex items-center justify-between w-full relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 flex items-center justify-center shadow-inner transition-transform duration-300 group-hover:scale-110 flex-shrink-0">
                            <ShieldCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Garantías Activas</p>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-300">
                                {formattedGarantiasActivas}
                            </h3>
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 mt-1 block">De {formattedTotalGarantias} emitidas</span>
                        </div>
                    </div>

                    <div className="flex h-2 w-2 relative flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                </div>

                {/* Semáforo de Garantías Lineal/Bbadges */}
                <div className="grid grid-cols-3 gap-2 w-full pt-1.5 border-t border-slate-100 dark:border-slate-800/80 relative z-10">
                    <div className="flex flex-col items-center justify-center py-1 px-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-center">
                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-wider">Vigentes</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100">{formatShortNum(garantiasActivas)}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center py-1 px-1.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-center">
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-wider">X Vencer</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100">{formatShortNum(garantiasPorVencer)}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center py-1 px-1.5 rounded-lg bg-rose-500/5 border border-rose-500/10 text-center">
                        <span className="text-[8px] font-black text-rose-500 uppercase tracking-wider">Vencidas</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100">{formatShortNum(garantiasVencidas)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
