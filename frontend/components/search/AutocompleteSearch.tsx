import { Search, Loader2, Building2, User, CreditCard, Clock, X, Hash } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { licitacionService } from "@/lib/services/licitacionService";

interface Suggestion { value: string; type: string; }
interface HistoryItem { term: string; timestamp: number; }

const HISTORY_KEY = 'seace_search_history';
const MAX_HISTORY = 5;
const HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
    const [lastFetchedQuery, setLastFetchedQuery] = useState("");
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

    // ── Suggestions debounce: 80ms
    useEffect(() => {
        let isCurrent = true;
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true);
                try {
                    const results: Suggestion[] = await licitacionService.getAutocomplete(query);
                    if (!isCurrent) return;

                    const clean = results.filter(r => r.type !== 'Error');
                    const q = query.toUpperCase();
                    
                    const typePriority: Record<string, number> = {
                        'Proveedor': 1,
                        'Consorcio': 2,
                        'Entidad': 3,
                        'Nomenclatura': 4
                    };

                    clean.sort((a, b) => {
                        // 1. Starts with exact match
                        const aS = a.value.toUpperCase().startsWith(q) ? 0 : 1;
                        const bS = b.value.toUpperCase().startsWith(q) ? 0 : 1;
                        if (aS !== bS) return aS - bS;
                        
                        // 2. Type priority (Proveedor/Consorcio first)
                        const prioA = typePriority[a.type] || 5;
                        const prioB = typePriority[b.type] || 5;
                        if (prioA !== prioB) return prioA - prioB;

                        // 3. Alphabetical fallback
                        return a.value.localeCompare(b.value);
                    });
                    
                    setSuggestions(clean);
                    setLastFetchedQuery(query);
                    if (clean.length > 0) setIsOpen(true);
                } catch {
                    if (isCurrent) {
                        setSuggestions([]);
                        setLastFetchedQuery(query);
                    }
                } finally {
                    if (isCurrent) setLoading(false);
                }
            } else {
                if (isCurrent) setLoading(false);
                setSuggestions([]);
                if (query.length === 0 && history.length > 0) setIsOpen(true);
                else setIsOpen(false);
            }
        }, 80);
        return () => { isCurrent = false; clearTimeout(timer); };
    }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Main search debounce: 200ms — very fast
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 3 || query.length === 0) onSearch(query);
        }, 200);
        return () => clearTimeout(timer);
    }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load history
    useEffect(() => {
        try {
            const stored = localStorage.getItem(HISTORY_KEY);
            if (stored) {
                const parsed: HistoryItem[] = JSON.parse(stored);
                const now = Date.now();
                setHistory(parsed.filter(item => (now - item.timestamp) < HISTORY_TTL_MS));
            }
        } catch { /**/ }
    }, []);

    // Close on click outside
    useEffect(() => {
        function outside(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
        }
        document.addEventListener("mousedown", outside);
        return () => document.removeEventListener("mousedown", outside);
    }, []);

    const saveToHistory = (term: string) => {
        if (!term || term.trim().length < 3) return;
        setHistory(prev => {
            const filtered = prev.filter(h => h.term.toLowerCase() !== term.trim().toLowerCase());
            const next = [{ term: term.trim(), timestamp: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
            return next;
        });
    };

    const handleSelect = (value: string) => {
        setQuery(value);
        setIsOpen(false);
        onSearch(value);
        saveToHistory(value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { onSearch(query); saveToHistory(query); setIsOpen(false); }
        if (e.key === 'Escape') setIsOpen(false);
    };

    const getIcon = (type: string) => {
        if (type === 'Entidad') return <Building2 className="w-3 h-3" />;
        if (type === 'Proveedor') return <User className="w-3 h-3" />;
        if (type === 'Consorcio') return <CreditCard className="w-3 h-3" />;
        if (type === 'Nomenclatura') return <Hash className="w-3 h-3" />;
        return <Search className="w-3 h-3" />;
    };

    const typeColors: Record<string, string> = {
        Entidad: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
        Proveedor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        Consorcio: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        Nomenclatura: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };

    const highlight = (text: string) => {
        if (!query) return <>{text}</>;
        try {
            const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            const parts = text.split(regex);
            return <>{parts.map((p, i) => regex.test(p) ? <b key={i} className="text-indigo-600 dark:text-indigo-300 not-italic">{p}</b> : p)}</>;
        } catch { return <>{text}</>; }
    };

    const isStale = query.trim() !== lastFetchedQuery.trim();
    const showHistory = isOpen && query.length < 2 && history.length > 0;
    const showSuggestions = isOpen && query.length >= 2 && suggestions.length > 0 && !isStale;
    const showDropdown = showHistory || showSuggestions;

    return (
        /* 
         * The wrapper MUST have `relative` + a high z-index so the absolute dropdown 
         * paints above the result cards (which use CSS transforms creating new stacking contexts).
         * We use isolation: isolate via the `isolate` class as well.
         */
        <div ref={wrapperRef} className="relative w-full isolate" style={{ zIndex: 99999 }}>
            {/* Search icon */}
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                {loading
                    ? <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
                    : <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                }
            </div>

            {/* Input */}
            <input
                type="text"
                className="block w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-white dark:bg-[#111c44] dark:border-slate-700 dark:text-white"
                placeholder={placeholder}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                    if (history.length > 0 && query.length < 2) setIsOpen(true);
                    if (suggestions.length > 0 && query.trim() === lastFetchedQuery.trim()) setIsOpen(true);
                }}
            />

            {/* 
             * Dropdown — position: absolute, anchored to the LEFT edge of the input.
             * Width is 50% of the wrapper (roughly half the search bar).
             * The high z-index on the wrapper ensures it paints above result cards.
             */}
            {showDropdown && (
                <div className="absolute top-[calc(100%+6px)] left-0 w-1/2 min-w-[260px] max-w-[440px] bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl shadow-[0_16px_48px_-8px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">

                    {/* ── History ── */}
                    {showHistory && (
                        <>
                            <div className="text-[9px] uppercase font-bold text-slate-400 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 tracking-widest border-b border-slate-100 dark:border-slate-700/50">
                                Recientes
                            </div>
                            <ul>
                                {history.slice(0, 4).map((item, idx) => (
                                    <li key={idx}
                                        onMouseDown={e => { e.preventDefault(); handleSelect(item.term); }}
                                        className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer flex items-center justify-between gap-2 group/item border-b border-slate-50 last:border-0 dark:border-slate-700/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{item.term}</span>
                                        </div>
                                        <button
                                            onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setHistory(p => { const n = p.filter(h => h.term !== item.term); localStorage.setItem(HISTORY_KEY, JSON.stringify(n)); return n; }); }}
                                            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 opacity-0 group-hover/item:opacity-100 text-slate-400 transition-all shrink-0"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    {/* ── Suggestions ── */}
                    {showSuggestions && (
                        <>
                            <div className="text-[9px] uppercase font-bold text-slate-400 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 tracking-widest border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                                <span>Sugerencias</span>
                                <span className="text-slate-300 dark:text-slate-600 font-normal normal-case text-[9px]">{suggestions.length}</span>
                            </div>
                            <ul className="max-h-[240px] overflow-y-auto">
                                {suggestions.map((item, idx) => {
                                    const color = typeColors[item.type] ?? 'bg-slate-100 text-slate-500';
                                    return (
                                        <li key={idx}
                                            onMouseDown={e => { e.preventDefault(); handleSelect(item.value); }}
                                            className="px-3 py-2 hover:bg-indigo-50/60 dark:hover:bg-white/5 cursor-pointer flex items-center gap-2.5 border-b border-slate-50 last:border-0 dark:border-slate-700/30 transition-colors"
                                        >
                                            <span className={`p-1 rounded-md shrink-0 ${color}`}>{getIcon(item.type)}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
                                                    {highlight(item.value)}
                                                </div>
                                                <span className={`text-[9px] font-bold uppercase tracking-widest ${color.split(' ')[1] ?? 'text-slate-400'}`}>
                                                    {item.type}
                                                </span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
