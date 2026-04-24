import { Search, Loader2, Building2, FileText, User, CreditCard, Clock, X } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { licitacionService } from "@/lib/services/licitacionService";

interface Suggestion {
    value: string;
    type: string;
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
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Initial value sync
    const didMountRef = useRef(false);
    useEffect(() => {
        if (!didMountRef.current) {
            if (initialValue) setQuery(initialValue);
            didMountRef.current = true;
            return;
        }
        if (initialValue === "") setQuery("");
    }, [initialValue]);

    // ── Debounce 1: Autocomplete suggestions (150ms, fast)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 3) {
                setLoading(true);
                try {
                    const results = await licitacionService.getAutocomplete(query);
                    setSuggestions(results);
                    if (results.length > 0) setIsOpen(true);
                } catch (error) {
                    console.error("Autocomplete error:", error);
                    setSuggestions([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setSuggestions([]);
                setIsOpen(query.length === 0 && history.length > 0);
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Debounce 2: Trigger main LIVE search (150ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 3 || query.length === 0) {
                onSearch(query);
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const stored = localStorage.getItem(HISTORY_KEY);
        if (stored) {
            try {
                const parsed: HistoryItem[] = JSON.parse(stored);
                const now = Date.now();
                const filtered = parsed.filter(item => (now - item.timestamp) < HISTORY_TTL_MS);
                if (filtered.length !== parsed.length) localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
                setHistory(filtered);
            } catch (e) {
                console.error("Error loading history:", e);
            }
        }
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const saveToHistory = (term: string) => {
        if (!term || term.trim().length < 3) return;
        const cleanTerm = term.trim();
        const now = Date.now();
        setHistory(prev => {
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
        if (e.key === 'Escape') setIsOpen(false);
    };

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
        try {
            const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
            return (
                <>
                    {parts.map((part, i) =>
                        part.toLowerCase() === term.toLowerCase() ?
                            <span key={i} className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-0.5 rounded font-bold">{part}</span> :
                            part
                    )}
                </>
            );
        } catch {
            return text;
        }
    };

    const showDropdown = isOpen && (suggestions.length > 0 || (query.length < 3 && history.length > 0));

    return (
        <div ref={wrapperRef} className="relative w-full group z-[99999]">
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
                    if (history.length > 0 && query.length < 3) setIsOpen(true);
                    if (suggestions.length > 0) setIsOpen(true);
                }}
            />
            
            {showDropdown && (
                <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-[#111c44] border border-slate-100 dark:border-slate-700 rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[99999]">
                    {query.length < 3 && history.length > 0 ? (
                        <>
                            <div className="text-[10px] uppercase font-bold text-slate-400 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 tracking-wider">
                                Búsquedas Recientes
                            </div>
                            <ul className="max-h-[320px] overflow-y-auto">
                                {history.map((item, idx) => (
                                    <li
                                        key={idx}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
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
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                removeFromHistory(item.term);
                                            }}
                                            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-all opacity-0 group-hover/item:opacity-100"
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
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSelect(item);
                                        }}
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
