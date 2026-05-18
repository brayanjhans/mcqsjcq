"use client";

import React, { useState, useEffect } from "react";
import { Clock, Radio } from "lucide-react";

interface Activity {
    id: number;
    time: string;
    description: string;
    amount?: string;
    entity: string;
    region: string;
    type: "OBRAS" | "SERVICIOS" | "BIENES";
}

const INITIAL_ACTIVITIES: Activity[] = [
    {
        id: 1,
        time: "Hace 2 min",
        entity: "PROVIAS NACIONAL",
        description: "Consorcio Vial del Norte ganó la Buena Pro de Carretera Longitudinal",
        amount: "S/ 18,450,000.00",
        region: "Tumbes",
        type: "OBRAS"
    },
    {
        id: 2,
        time: "Hace 5 min",
        entity: "MUNICIPALIDAD DE PIURA",
        description: "Publicó licitación para Obra de Saneamiento y Agua Potable",
        amount: "S/ 4,890,200.00",
        region: "Piura",
        type: "OBRAS"
    },
    {
        id: 3,
        time: "Hace 12 min",
        entity: "ESSALUD",
        description: "Adjudicó compra corporativa de Equipamiento Médico de Alta Tecnología",
        amount: "S/ 2,120,400.00",
        region: "Lima",
        type: "BIENES"
    },
    {
        id: 4,
        time: "Hace 20 min",
        entity: "GOBIERNO REGIONAL DE AREQUIPA",
        description: "Consorcio Constructor del Sur firmó contrato para Mantenimiento Vial",
        amount: "S/ 1,850,000.00",
        region: "Arequipa",
        type: "SERVICIOS"
    },
    {
        id: 5,
        time: "Hace 32 min",
        entity: "MINISTERIO DE EDUCACION",
        description: "Lanzó convocatoria nacional para la Licitación de 10 Colegios Bicentenario",
        amount: "S/ 42,900,000.00",
        region: "Junín",
        type: "OBRAS"
    },
    {
        id: 6,
        time: "Hace 40 min",
        entity: "CONGRESO DE LA REPUBLICA",
        description: "Adjudicó Servicio de Soporte Técnico y Mantenimiento de Servidores",
        amount: "S/ 350,000.00",
        region: "Lima",
        type: "SERVICIOS"
    },
    {
        id: 7,
        time: "Hace 52 min",
        entity: "SEDAPAL",
        description: "Lanzó licitación para la Reparación de Tuberías Matrices en Lima Norte",
        amount: "S/ 2,450,000.00",
        region: "Lima",
        type: "OBRAS"
    },
    {
        id: 8,
        time: "Hace 1 hora",
        entity: "MUNICIPALIDAD DE HUANCAYO",
        description: "Adjudicó compra de Laptops para Centros Educativos Municipales",
        amount: "S/ 1,120,000.00",
        region: "Junín",
        type: "BIENES"
    }
];

const RANDOM_ENTITIES = ["MINISTERIO DE TRANSPORTES", "SEDAPAL", "GOBIERNO REGIONAL DE LA LIBERTAD", "MUNICIPALIDAD DE CHICLAYO", "PETROPERU", "SUNAT", "BANCO DE LA NACION"];
const RANDOM_REGIONS = ["Lambayeque", "Cusco", "Puno", "Lima", "La Libertad", "Ancash", "Loreto", "Tacna"];
const RANDOM_DESCRIPTIONS = [
    "Consorcio Vial ganó Buena Pro para Mejoramiento de Pistas",
    "Publicó Adjudicación Directa para Adquisición de Combustibles",
    "Firmó contrato para consultoría de Supervisión de Obra Pública",
    "Adjudicó Servicio de Seguridad y Vigilancia para Sedes Estatales",
    "Lanzó licitación pública para Adquisición de Laptops Educativas",
    "Declaró consentida la Buena Pro de Obra de Represamiento Hidráulico"
];
const RANDOM_AMOUNTS = ["S/ 890,000.00", "S/ 1,450,200.00", "S/ 3,120,000.00", "S/ 12,800,000.00", "S/ 540,000.00", "S/ 24,900,000.00"];
const RANDOM_TYPES: ("OBRAS" | "SERVICIOS" | "BIENES")[] = ["OBRAS", "SERVICIOS", "BIENES"];

export const ActivityRadar: React.FC = () => {
    const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES);

    useEffect(() => {
        const interval = setInterval(() => {
            const entity = RANDOM_ENTITIES[Math.floor(Math.random() * RANDOM_ENTITIES.length)];
            const region = RANDOM_REGIONS[Math.floor(Math.random() * RANDOM_REGIONS.length)];
            const description = RANDOM_DESCRIPTIONS[Math.floor(Math.random() * RANDOM_DESCRIPTIONS.length)];
            const amount = RANDOM_AMOUNTS[Math.floor(Math.random() * RANDOM_AMOUNTS.length)];
            const type = RANDOM_TYPES[Math.floor(Math.random() * RANDOM_TYPES.length)];
            
            const newActivity: Activity = {
                id: Date.now(),
                time: "Hace 1 min",
                entity,
                description,
                amount,
                region,
                type
            };

            setActivities(prev => {
                const list = [newActivity, ...prev];
                return list.slice(0, 8).map((act, index) => {
                    if (index === 0) return act;
                    return {
                        ...act,
                        time: `Hace ${index * 5 + Math.floor(Math.random() * 2)} min`
                    };
                });
            });
        }, 8000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#111c44] p-6 shadow-md border border-slate-300/80 dark:border-slate-800 h-full flex flex-col justify-between transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    </span>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                        Radar de Licitaciones
                    </h3>
                </div>
                <div className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase border border-indigo-500/20">
                    En Vivo
                </div>
            </div>

            {/* List Container */}
            <div className="flex-1 space-y-3.5 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }}
            >
                {activities.map((act) => {
                    const badgeBg = act.type === "OBRAS" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                    act.type === "SERVICIOS" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                                    "bg-blue-500/10 border-blue-500/20 text-blue-400";
                    
                    return (
                        <div key={act.id} className="relative overflow-hidden group/radar p-3 bg-slate-50/50 dark:bg-[#0A192F]/30 hover:bg-slate-50 dark:hover:bg-[#0A192F]/60 border border-slate-100 dark:border-white/5 rounded-xl hover:shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-top duration-500">
                            {/* Accent border left */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                act.type === "OBRAS" ? "bg-emerald-500" :
                                act.type === "SERVICIOS" ? "bg-amber-500" :
                                "bg-blue-500"
                            }`} />

                            <div className="flex items-start justify-between gap-3 pl-1.5">
                                <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                                            {act.entity}
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug group-hover/radar:text-indigo-500 dark:group-hover/radar:text-indigo-400 transition-colors duration-300">
                                        {act.description}
                                    </p>
                                    <div className="flex items-center gap-2 pt-1">
                                        {act.amount && (
                                            <span className="text-[10px] font-extrabold text-slate-900 dark:text-white">
                                                {act.amount}
                                            </span>
                                        )}
                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                                            • Región: {act.region}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-400 dark:text-slate-500">
                                        <Clock className="w-2.5 h-2.5" />
                                        {act.time}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded-full border text-[8px] font-extrabold tracking-wider ${badgeBg}`}>
                                        {act.type}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
