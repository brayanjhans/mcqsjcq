import { Search, Loader2, Building2, FileText, User, CreditCard, Clock, X, Hash } from "lucide-react";
import React, { useState, useEffect, useRef, useCallback } from "react";
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
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const updateRect = useCallback(() => {
        if (wrapperRef.current) {
            setDropdownRect(wrapperRef.current.getBoundingClientRect());
        }
    }, []);

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

    // ── Debounce: Autocomplete suggestions (180ms)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true);
                updateRect();
                try {
                    const results: Suggestion[] = await licitacionService.getAutocomplete(query);
                    // Filter errors, sort: starts-with first, then contains
                    const clean = results.filter(r => r.type !== 'Error');
                    const q = query.toUpperCase();
                    const sorted = clean.sort((a, b) => {
                        const aStarts = a.value.toUpperCase().startsWith(q) ? 0 : 1;
                        const bStarts = b.value.toUpperCase().startsWith(q) ? 0 : 1;
                        return aStarts - bStarts;
                    });
                    setSuggestions(sorted);
                    if (sorted.length > 0) setIsOpen(true);
                } catch {
                    setSuggestions([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setSuggestions([]);
                setIsOpen(query.length === 0 && history.length > 0);
            }
        }, 180);
        return () => clearTimeout(timer);
    }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Main search debounce: 250ms so results appear while typing
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 3 || query.length === 0) {
                onSearch(query);
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load history
    useEffect(() => {
        const stored = localStorage.getItem(HISTORY_KEY);
        if (stored) {
            try {
                const parsed: HistoryItem[] = JSON.parse(stored);
                const now = Date.now();
                const filtered = parsed.filter(item => (now - item.timestamp) < HISTORY_TTL_MS);
                setHistory(filtered);
            } catch { /**/ }
        }
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        function handleScrollOrResize() { updateRect(); }
        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("scroll", handleScrollOrResize, true);
        window.addEventListener("resize", handleScrollOrResize);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleScrollOrResize, true);
            window.removeEventListener("resize", handleScrollOrResize);
        };
    }, [updateRect]);

    const saveToHistory = (term: string) => {
        if (!term || term.trim().length < 3) return;
        const cleanTerm = term.trim();
        setHistory(prev => {
            const filtered = prev.filter(h => h.term.toLowerCase() !== cleanTerm.toLowerCase());
            const newHistory = [{ term: cleanTerm, timestamp: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
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
        if (e.key === 'Enter') { onSearch(query); saveToHistory(query); setIsOpen(false); }
        if (e.key === 'Escape') setIsOpen(false);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'Entidad': return <Building2 className="w-3.5 h-3.5" />;
            case 'Proveedor': return <User className="w-3.5 h-3.5" />;
            case 'Consorcio': return <CreditCard className="w-3.5 h-3.5" />;
            case 'Nomenclatura': return <Hash className="w-3.5 h-3.5" />;
            default: return <Search className="w-3.5 h-3.5" />;
        }
    };

    const getTypeStyle = (type: string) => {
        switch (type) {
            case 'Entidad': return { pill: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', icon: 'text-orange-500' };
            case 'Proveedor': return { pill: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400', icon: 'text-green-500' };
            case 'Consorcio': return { pill: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400', icon: 'text-purple-500' };
            case 'Nomenclatura': return { pill: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: 'text-blue-500' };
            default: return { pill: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400', icon: 'text-slate-400' };
        }
    };

    const highlightMatch = (text: string, term: string) => {
        if (!term) return <span className="truncate">{text}</span>;
        try {
            const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            const parts = text.split(regex);
            return (
                <span className="truncate block">
                    {parts.map((part, i) =>
                        regex.test(part)
                            ? <span key={i} className="text-indigo-600 dark:text-indigo-300 font-black">{part}</span>
                            : <span key={i}>{part}</span>
                    )}
                </span>
            );
        } catch {
            return <span className="truncate">{text}</span>;
        }
    };

    const showDropdown = isOpen && (suggestions.length > 0 || (query.length < 2 && history.length > 0));

    // Dropdown fixed position — viewport-relative (no scrollY)
    const dropdownStyle: React.CSSProperties = dropdownRect ? {
        position: 'fixed',
        top: dropdownRect.bottom + 6,
        left: dropdownRect.left,
        width: Math.min(dropdownRect.width * 0.55, 420),   // ← max 55% del ancho del input, máx 420px
        zIndex: 99999,
    } : { display: 'none' };

    return (
        <div ref={wrapperRef} className="relative w-full group">
            {/* Icon */}
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
                onChange={(e) => { setQuery(e.target.value); updateRect(); }}
                onKeyDown={handleKeyDown}
                onFocus={() => { updateRect(); if (history.length > 0 && query.length < 2) setIsOpen(true); if (suggestions.length > 0) setIsOpen(true); }}
            />

            {/* Dropdown — fixed position to escape any overflow/z-index traps */}
            {showDropdown && (
                <div style={dropdownStyle} className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-[0_16px_48px_-8px_rgba(0,0,0,0.35)] overflow-hidden">

                    {/* History mode */}
                    {query.length < 2 && history.length > 0 ? (
                        <>
                            <div className="text-[9px] uppercase font-bold text-slate-400 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 tracking-widest border-b border-slate-100 dark:border-slate-700/50">
                                Recientes
                            </div>
                            <ul>
                                {history.slice(0, 4).map((item, idx) => (
                                    <li
                                        key={idx}
                                        onMouseDown={(e) => { e.preventDefault(); setQuery(item.term); onSearch(item.term); saveToHistory(item.term); setIsOpen(false); }}
                                        className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer flex items-center justify-between gap-2 group/item transition-colors border-b border-slate-50 last:border-0 dark:border-slate-700/30"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{item.term}</span>
                                        </div>
                                        <button
                                            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); removeFromHistory(item.term); }}
                                            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-300 hover:text-slate-500 opacity-0 group-hover/item:opacity-100 transition-all shrink-0"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : suggestions.length > 0 ? (
                        /* Suggestions mode */
                        <ul className="max-h-[260px] overflow-y-auto">
                            {suggestions.map((item, idx) => {
                                const style = getTypeStyle(item.type);
                                return (
                                    <li
                                        key={idx}
                                        onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                                        className="px-3 py-2 hover:bg-indigo-50/60 dark:hover:bg-white/5 cursor-pointer flex items-center gap-2.5 transition-colors border-b border-slate-50 last:border-0 dark:border-slate-700/30"
                                    >
                                        {/* Icon pill */}
                                        <span className={`p-1 rounded-md shrink-0 ${style.pill}`}>
                                            <span className={style.icon}>{getIcon(item.type)}</span>
                                        </span>

                                        {/* Text — truncated to fit */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 leading-tight truncate">
                                                {highlightMatch(item.value, query)}
                                            </div>
                                            <span className={`text-[9px] font-bold uppercase tracking-widest ${style.icon}`}>
                                                {item.type}
                                            </span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : null}
                </div>
            )}
        </div>
    );
};
