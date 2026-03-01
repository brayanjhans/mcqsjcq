import React from "react";

interface YearSelectorProps {
    selectedYear: number; // 0 for All
    onYearChange: (year: number) => void;
    years?: number[]; // Default: 2020-2028
    allowAll?: boolean; // Default: true
}

export const YearSelector: React.FC<YearSelectorProps> = ({
    selectedYear,
    onYearChange,
    years = [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028],
    allowAll = true
}) => {
    return (
        <div className="flex bg-slate-50 dark:bg-slate-800 rounded-lg p-1 shrink-0">
            {years.map(year => (
                <button
                    key={year}
                    onClick={() => onYearChange(year)}
                    className={`min-w-[50px] px-3 py-1 text-xs font-bold rounded-md transition-all ${selectedYear === year
                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5 dark:bg-[#111c44] dark:text-white dark:ring-white/10'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    {year}
                </button>
            ))}
            {allowAll && (
                <button
                    onClick={() => onYearChange(0)}
                    className={`min-w-[40px] px-3 py-1 text-xs font-bold rounded-md transition-all ${selectedYear === 0
                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5 dark:bg-[#111c44] dark:text-white dark:ring-white/10'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    All
                </button>
            )}
        </div>
    );
};
