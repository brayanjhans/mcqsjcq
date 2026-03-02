"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

interface CompactSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder?: string;
    className?: string;
}

export const CompactSelect: React.FC<CompactSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = "Todos",
    className = "",
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const triggerRef = useRef<HTMLButtonElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const filtered = search
        ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
        : options;

    const updatePosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownStyle({
            position: "fixed",
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
            zIndex: 99999,
        });
    };

    const handleOpen = () => {
        updatePosition();
        setOpen(prev => !prev);
    };

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            const panel = document.getElementById("compact-select-portal");
            if (
                triggerRef.current && !triggerRef.current.contains(target) &&
                !(panel && panel.contains(target))
            ) {
                setOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // Focus search input when opening
    useEffect(() => {
        if (open && searchRef.current) searchRef.current.focus();
    }, [open]);

    // Reposition on scroll / resize
    useEffect(() => {
        if (!open) return;
        const handler = () => updatePosition();
        window.addEventListener("scroll", handler, true);
        window.addEventListener("resize", handler);
        return () => {
            window.removeEventListener("scroll", handler, true);
            window.removeEventListener("resize", handler);
        };
    }, [open]);

    const handleSelect = (opt: string) => {
        onChange(opt);
        setOpen(false);
        setSearch("");
    };

    const panel = (
        <div
            id="compact-select-portal"
            style={dropdownStyle}
            className="rounded-xl border border-slate-200 bg-white shadow-2xl dark:bg-[#1a2960] dark:border-slate-700 overflow-hidden"
        >
            {/* Search */}
            <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 dark:bg-[#111c44] dark:border-slate-600 dark:text-slate-300"
                />
            </div>
            {/* List */}
            <ul className="overflow-y-auto max-h-52 py-1">
                <li
                    onClick={() => handleSelect("")}
                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${!value ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-800 font-semibold dark:text-slate-200"}`}
                >
                    {placeholder}
                </li>
                {filtered.length === 0 ? (
                    <li className="px-4 py-2 text-xs text-slate-400 italic">Sin resultados</li>
                ) : filtered.map(opt => (
                    <li
                        key={opt}
                        onClick={() => handleSelect(opt)}
                        className={`px-4 py-2 text-xs cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${value === opt ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-800 font-medium dark:text-slate-200"}`}
                    >
                        {opt}
                    </li>
                ))}
            </ul>
        </div>
    );

    return (
        <div className={`relative ${className}`}>
            <button
                ref={triggerRef}
                type="button"
                onClick={handleOpen}
                className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-3 text-sm text-slate-800 font-semibold focus:border-indigo-500 focus:outline-none dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-100"
            >
                <span className={value ? "font-bold text-slate-800 dark:text-slate-100" : "font-medium text-slate-500 dark:text-slate-400"}>
                    {value || placeholder}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
            </button>

            {/* Render outside DOM tree via Portal */}
            {open && typeof document !== "undefined"
                ? createPortal(panel, document.body)
                : null}
        </div>
    );
};
