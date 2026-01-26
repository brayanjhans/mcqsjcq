"use client";

import React from "react";
import { Users, Package } from "lucide-react";



interface EcommerceMetricsProps {
    licitaciones?: number;
    monto?: number;
    label?: string; // Dynamic Label

    yearLic?: number;
    onYearLicChange?: (year: number) => void;

    yearMonto?: number;
    onYearMontoChange?: (year: number) => void;
}

export const EcommerceMetrics: React.FC<EcommerceMetricsProps> = ({
    licitaciones,
    monto,
    label = "Licitaciones", // Default fallback
    yearLic = 2024,
    onYearLicChange = () => { },
    yearMonto = 2024,
    onYearMontoChange = () => { }
}) => {
    const formattedMonto = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(monto || 0);
    const formattedLicitaciones = new Intl.NumberFormat('es-PE').format(licitaciones || 0);

    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 h-full">
            {/* Card 1: Count */}
            <div className="rounded-2xl bg-white dark:bg-[#111c44] p-6 shadow-sm border border-slate-100 dark:border-white/5 h-full flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Users className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                    </div>
                    {/* YearSelector removed as per user request */}
                </div>
                <div>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</p>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{formattedLicitaciones}</h3>
                </div>
            </div>

            {/* Card 2: Monto Adjudicado */}
            <div className="rounded-2xl bg-white dark:bg-[#111c44] p-6 shadow-sm border border-slate-100 dark:border-white/5 h-full flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Package className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                    </div>
                    {/* YearSelector removed */}
                </div>
                <div>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Monto {yearMonto === 0 ? "Adjudicado (Total)" : "Adjudicado"}</p>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{formattedMonto}</h3>
                </div>
            </div>
        </div>
    );
};
