
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

interface SearchableSelectProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    disabled?: boolean;
    enableSearch?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options = [],
    value,
    onChange,
    placeholder = "Seleccionar...",
    label,
    disabled = false,
    enableSearch = true
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-1.5" ref={wrapperRef}>
            {label && (
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={`
                        w-full flex items-center justify-between
                        rounded-xl border bg-white py-3 pl-4 pr-3 text-sm font-semibold text-slate-700 
                        focus:border-indigo-500 focus:ring-0 outline-none 
                        dark:bg-[#111c44] dark:border-slate-700 dark:text-slate-300
                        transition-all
                        ${isOpen ? 'border-indigo-500' : 'border-slate-200'}
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                >
                    <span className={`truncate mr-2 ${!value && 'font-normal'}`}>
                        {value || placeholder}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute z-50 mt-2 w-full rounded-xl bg-white dark:bg-[#111c44] border border-slate-100 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top">

                        {/* Search Input (Optional) */}
                        {enableSearch && (
                            <div className="p-2 border-b border-slate-50 dark:border-slate-700/50">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        className="w-full rounded-lg bg-slate-50 dark:bg-slate-800/50 border-none py-2 pl-9 pr-8 text-xs font-medium text-slate-700 dark:text-slate-200 focus:ring-0 placeholder:text-slate-400"
                                        placeholder="Buscar..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        autoFocus
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSearchTerm(""); }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Options List */}
                        <ul className="max-h-[320px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                            <li
                                onClick={() => { onChange(""); setIsOpen(false); }}
                                className={`
                                    px-4 py-3 text-sm cursor-pointer transition-colors flex items-center justify-between
                                    hover:bg-slate-50 dark:hover:bg-white/5 border-b border-slate-50 dark:border-slate-800/50
                                    ${value === "" ? 'text-indigo-600 bg-indigo-50/50 dark:text-indigo-400 dark:bg-indigo-500/10' : 'text-slate-600 dark:text-slate-300'}
                                `}
                            >
                                <span className="font-medium">Todos</span>
                                {value === "" && <Check className="h-4 w-4" />}
                            </li>

                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt, idx) => (
                                    <li
                                        key={idx}
                                        onClick={() => { onChange(opt); setIsOpen(false); }}
                                        className={`
                                            px-4 py-3 text-sm cursor-pointer transition-colors flex items-center justify-between border-b border-slate-50 dark:border-slate-800/50 last:border-0
                                            hover:bg-slate-50 dark:hover:bg-white/5 group
                                            ${value === opt ? 'text-indigo-600 font-semibold bg-indigo-50/50 dark:text-indigo-400 dark:bg-indigo-500/10' : 'text-slate-600 dark:text-slate-300'}
                                        `}
                                    >
                                        <span className="truncate">{opt}</span>
                                        {value === opt && <Check className="h-4 w-4 shrink-0 ml-2" />}
                                    </li>
                                ))
                            ) : (
                                <li className="px-4 py-8 text-center text-xs text-slate-400 italic">
                                    No se encontraron resultados
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};
