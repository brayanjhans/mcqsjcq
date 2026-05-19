"use client";

import React, { useState } from "react";
import { Landmark, Award, TrendingUp } from "lucide-react";

interface FinancialEntitiesTableProps {
    data: Array<{ name: string; garantias: number; monto: number; depts: string; cobertura: string }>;
    selectedYear?: number;
    onYearChange?: (year: number) => void;
    selectedDepartment?: string;
}

const MOCK_CONTRATISTAS = [
    { name: "COSAPI S.A.", garantias: 42, monto: 185000000, depts: "12 Depts.", cobertura: "Nacional" },
    { name: "SACYR CONSTRUCCION PERU", garantias: 31, monto: 142000000, depts: "8 Depts.", cobertura: "Nacional" },
    { name: "CONSORCIO VIAL MOCAN", garantias: 28, monto: 98000000, depts: "2 Depts.", cobertura: "Regional" },
    { name: "JASA CONTRATISTAS GENERALES", garantias: 22, monto: 75000000, depts: "3 Depts.", cobertura: "Regional" },
    { name: "CONSORCIO EDUCATIVO DEL CENTRO", garantias: 18, monto: 54000000, depts: "4 Depts.", cobertura: "Regional" },
    { name: "INVERSIONES ANTARES S.A.C.", garantias: 15, monto: 32000000, depts: "Lima", cobertura: "Local" },
    { name: "OHLA PERU S.A.", garantias: 13, monto: 29000000, depts: "Lima", cobertura: "Local" },
    { name: "CONSORCIO METALURGICO DEL PERU", garantias: 11, monto: 18500000, depts: "Ancash", cobertura: "Regional" },
    { name: "CONSTRUCTORA MALAGA HERMANOS", garantias: 9, monto: 12000000, depts: "Junín", cobertura: "Regional" },
    { name: "CONSORCIO SAN MARTIN", garantias: 7, monto: 8500000, depts: "Arequipa", cobertura: "Local" }
];

const getEntityColor = (name: string) => {
    const colors = [
        "from-blue-500 to-indigo-600",
        "from-indigo-500 to-purple-600",
        "from-sky-500 to-blue-600",
        "from-cyan-500 to-blue-600",
        "from-teal-500 to-emerald-600"
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const getEntityInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
};

export const FinancialEntitiesTable: React.FC<FinancialEntitiesTableProps> = React.memo(({
    data = [],
    selectedYear = 2024,
    onYearChange = () => { },
    selectedDepartment = ""
}) => {
    const [activeTab, setActiveTab] = useState<"emisoras" | "contratistas">("emisoras");

    const currentList = activeTab === "emisoras" ? data : MOCK_CONTRATISTAS;
    const maxMonto = Math.max(...currentList.map(d => d.monto), 1);

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#111c44] p-5 shadow-md border border-slate-300/80 dark:border-slate-800 h-full transition-all duration-300 flex flex-col justify-start gap-4">
            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1 gap-3 flex-shrink-0">
                <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Clasificación de Líderes</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                        {selectedDepartment ? `Top actores en ${selectedDepartment.toUpperCase()}` : "Top actores clave del mercado"}
                    </p>
                </div>

                {/* Tabs selector */}
                <div className="flex items-center p-0.5 bg-slate-100 dark:bg-[#0A192F] rounded-lg border border-slate-200/50 dark:border-white/5">
                    <button
                        onClick={() => setActiveTab("emisoras")}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black transition-all duration-300 ${
                            activeTab === "emisoras"
                                ? "bg-white dark:bg-[#111c44] text-indigo-500 dark:text-white shadow-sm"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                        }`}
                    >
                        <Landmark className="w-3 h-3" />
                        Emisoras
                    </button>
                    <button
                        onClick={() => setActiveTab("contratistas")}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black transition-all duration-300 ${
                            activeTab === "contratistas"
                                ? "bg-white dark:bg-[#111c44] text-indigo-500 dark:text-white shadow-sm"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                        }`}
                    >
                        <Award className="w-3 h-3" />
                        Contratistas
                    </button>
                </div>
            </div>

            {/* Dynamic Flex list container that automatically fills available stretched height */}
            <div className="flex-grow overflow-y-auto pr-1.5 space-y-1.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-thumb]:rounded-full h-0 min-h-[640px]">
                {currentList.map((item, index) => {
                    const ratio = item.monto / maxMonto;
                    const progressPercent = Math.round(ratio * 100);

                    return (
                        <div key={index} className="group/leader flex flex-col gap-1.5 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-[#0A192F]/30 border border-transparent hover:border-slate-100 dark:hover:border-white/5 transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    {/* Rank number badge */}
                                    <div className="flex-shrink-0 w-5.5 h-5.5 rounded bg-slate-100 dark:bg-[#0A192F] text-slate-600 dark:text-slate-400 flex items-center justify-center font-black text-[9px] group-hover/leader:bg-indigo-500 group-hover/leader:text-white shadow-inner transition-all duration-300">
                                        #{index + 1}
                                    </div>
                                    
                                    {/* Avatar circle with dynamic gradient */}
                                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getEntityColor(item.name)} flex items-center justify-center text-white text-[9px] font-black shadow-sm group-hover/leader:scale-105 transition-transform duration-300`}>
                                        {getEntityInitials(item.name)}
                                    </div>

                                    <div>
                                        <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight group-hover/leader:text-indigo-500 dark:group-hover/leader:text-indigo-400 transition-colors duration-300">
                                            {item.name}
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                                            {item.depts}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right flex flex-col items-end">
                                    <span className="text-[11px] font-black text-slate-800 dark:text-white flex items-center gap-1">
                                        {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(item.monto)}
                                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                                    </span>
                                    <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 mt-0.5">
                                        {item.garantias} garantías
                                    </span>
                                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[7px] font-extrabold tracking-wider mt-0.5 ${
                                        item.cobertura === 'Nacional' 
                                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                            : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                    }`}>
                                        {item.cobertura.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            {/* Thin progress bar */}
                            <div className="h-0.5 w-full bg-slate-100 dark:bg-[#0A192F] rounded-full overflow-hidden ml-8" style={{ width: 'calc(100% - 2rem)' }}>
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="mt-1 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between flex-shrink-0">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    Total: {currentList.length} registros líderes
                </p>
            </div>
        </div>
    );
});

FinancialEntitiesTable.displayName = "FinancialEntitiesTable";
