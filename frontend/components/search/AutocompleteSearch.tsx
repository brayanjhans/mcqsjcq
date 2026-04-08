import { Search, Loader2, Building2, FileText, User, CreditCard, Clock, X } from "lucide-react";
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

interface HistoryItem {
    term: string;
    timestamp: number;
}

const HISTORY_KEY = 'seace_search_history';
const MAX_HISTORY = 5;
const HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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
    const [history, setHistory] = useState<HistoryItem[]>([]);
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
                // Show history if query is empty or short
                setIsOpen(history.length > 0);
            }
        }, 250); // 250ms debounce

        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        // Load history and prune expired items on mount
        const stored = localStorage.getItem(HISTORY_KEY);
        if (stored) {
            try {
                const parsed: HistoryItem[] = JSON.parse(stored);
                const now = Date.now();
                const filtered = parsed.filter(item => (now - item.timestamp) < HISTORY_TTL_MS);
                
                if (filtered.length !== parsed.length) {
                    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
                }
                setHistory(filtered);
            } catch (e) {
                console.error("Error loading history:", e);
            }
        }
    }, []);

    const saveToHistory = (term: string) => {
        if (!term || term.trim().length < 3) return;
        const cleanTerm = term.trim();
        const now = Date.now();

        setHistory(prev => {
            // Remove existing match (case-insensitive)
            const filtered = prev.filter(h => h.term.toLowerCase() !== cleanTerm.toLowerCase());
            const newHistory = [{ term: cleanTerm, timestamp: now }, ...filtered].slice(0, MAX_HISTORY);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
            return newHistory;
        });
    };

    const removeFromHistory = (term: string) => {
        setHistory(prev => {
            const newHistory = prev.filter(h => h.term !== term);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
            return newHistory;
        });
    };

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
        saveToHistory(suggestion.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onSearch(query);
            saveToHistory(query);
            setIsOpen(false);
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'Entidad': return <Building2 className="w-4 h-4 text-orange-500" />;
            case 'Proveedor': return <User className="w-4 h-4 text-green-500" />;
            case 'Consorcio': return <CreditCard className="w-4 h-4 text-purple-500" />;
            case 'Proceso': return <FileText className="w-4 h-4 text-blue-500" />;
            default: return <Search className="w-4 h-4 text-slate-400" />;
        }
    };

    const highlightMatch = (text: string, term: string) => {
        if (!term) return text;
        const parts = text.split(new RegExp(`(${term})`, 'gi'));
        return (
            <>
                {parts.map((part, i) => 
                    part.toLowerCase() === term.toLowerCase() ? 
                    <span key={i} className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-0.5 rounded">{part}</span> : 
                    part
                )}
            </>
        );
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
                onFocus={() => {
                    if (history.length > 0) setIsOpen(true);
                }}
            />

            {(isOpen && (suggestions.length > 0 || (query.length < 3 && history.length > 0))) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#111c44] border border-slate-100 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {query.length < 3 && history.length > 0 ? (
                        <>
                            <div className="text-[10px] uppercase font-bold text-slate-400 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 tracking-wider">
                                Búsquedas Recientes
                            </div>
                            <ul className="max-h-[320px] overflow-y-auto">
                                {history.map((item, idx) => (
                                    <li
                                        key={idx}
                                        onClick={() => {
                                            setQuery(item.term);
                                            onSearch(item.term);
                                            saveToHistory(item.term);
                                            setIsOpen(false);
                                        }}
                                        className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer flex items-center justify-between group/item transition-colors border-b border-slate-50 last:border-0 dark:border-slate-800"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
                                                <Clock className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                                                    {item.term}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    Hace {Math.round((Date.now() - item.timestamp) / (1000 * 60 * 60)) || 1}h
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFromHistory(item.term);
                                            }}
                                            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all opacity-0 group-hover/item:opacity-100"
                                            title="Quitar sugerencia"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : suggestions.length > 0 ? (
                        <>
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
                                                {highlightMatch(item.value, query)}
                                            </span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                {item.type}
                                                {item.id && <span className="opacity-70 font-mono">• {item.id}</span>}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : null}
                </div>
            )}
        </div>
    );
};
