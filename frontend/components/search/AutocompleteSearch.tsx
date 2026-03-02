import { Search, Loader2, Building2, FileText, User, CreditCard } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { licitacionService } from "@/lib/services/licitacionService";
// Filter removed

// If useDebounce doesn't exist, I'll inline it or create it. 
// For safety, I'll implement a simple internal logic or assume we can create the file if needed.
// Given strict instructions, I'll implement debouncing inside the component to avoid dependency hell if the hook is missing.

interface Suggestion {
    value: string;
    type: string; // 'Entidad', 'Proveedor', 'Proceso', 'RUC Ganador', etc.
    id?: string;
}

interface AutocompleteSearchProps {
    onSearch: (term: string) => void;
    placeholder?: string;
    initialValue?: string;
}

export const AutocompleteSearch: React.FC<AutocompleteSearchProps> = ({
    onSearch,
    placeholder = "Buscar...",
    initialValue = ""
}) => {
    const [query, setQuery] = useState(initialValue);

    // Sync con el padre SOLO cuando se limpia (initialValue = "")
    // Si sincronizamos en cada cambio, el usuario pierde caracteres
    // porque onSearch dispara actualización del padre que sobrescribe lo escrito
    useEffect(() => {
        if (initialValue === "") {
            setQuery("");
        }
    }, [initialValue]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Debounce logic
    useEffect(() => {
        const timer = setTimeout(async () => {
            // Trigger main search if 3+ chars or empty (to clear)
            if (query.length >= 3 || query.length === 0) {
                onSearch(query);
            }

            if (query.length >= 3) {
                setLoading(true);
                try {
                    const results = await licitacionService.getAutocomplete(query);
                    setSuggestions(results);
                    setIsOpen(results.length > 0);
                } catch (error) {
                    console.error("Autocomplete error:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setSuggestions([]);
                setIsOpen(false);
            }
        }, 250); // 250ms debounce

        return () => clearTimeout(timer);
    }, [query]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (suggestion: Suggestion) => {
        setQuery(suggestion.value);
        setIsOpen(false);
        onSearch(suggestion.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onSearch(query);
            setIsOpen(false);
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'Entidad': return <Building2 className="w-4 h-4 text-orange-500" />;
            case 'Proveedor': return <User className="w-4 h-4 text-green-500" />;
            case 'Proceso': return <FileText className="w-4 h-4 text-blue-500" />;
            default: return <Search className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <div ref={wrapperRef} className="relative w-full group z-50">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                {loading ? (
                    <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                ) : (
                    <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                )}
            </div>
            <input
                type="text"
                className="block w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-white dark:bg-[#111c44] dark:border-slate-700 dark:text-white"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
            />

            {isOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#111c44] border border-slate-100 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="text-[10px] uppercase font-bold text-slate-400 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 tracking-wider">
                        Sugerencias
                    </div>
                    <ul className="max-h-[320px] overflow-y-auto">
                        {suggestions.map((item, idx) => (
                            <li
                                key={idx}
                                onClick={() => handleSelect(item)}
                                className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors border-b border-slate-50 last:border-0 dark:border-slate-800"
                            >
                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
                                    {getIcon(item.type)}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                                        {item.value}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                        {item.type}
                                        {item.id && <span className="opacity-70">• {item.id}</span>}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
