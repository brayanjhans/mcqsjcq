'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface ETLStatus {
    is_running: boolean;
    current_step: string | null;
    start_time: string | null;
    logs: string[];
}

interface ETLHistoryItem {
    timestamp: string;
    status: string;
    details: string;
}

export default function ETLPage() {
    const [status, setStatus] = useState<ETLStatus>({
        is_running: false,
        current_step: null,
        start_time: null,
        logs: []
    });
    const [history, setHistory] = useState<ETLHistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);

    useEffect(() => {
        loadStatus();
        loadHistory();
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (autoRefresh || status.is_running) {
            interval = setInterval(() => {
                loadStatus();
            }, 3000); // Refresh every 3 seconds
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh, status.is_running]);

    const loadStatus = async () => {
        try {
            const res = await api.get('/api/etl/status');
            setStatus(res.data);
        } catch (error) {
            console.error('Error loading status:', error);
        }
    };

    const loadHistory = async () => {
        try {
            const res = await api.get('/api/etl/history');
            setHistory(res.data);
        } catch (error) {
            console.error('Error loading history:', error);
        }
    };

    const executeETL = async () => {
        if (status.is_running) {
            alert('El proceso ETL ya está en ejecución');
            return;
        }

        if (!confirm('¿Está seguro de ejecutar el proceso ETL? Esto descargará y cargará datos desde SEACE.')) {
            return;
        }

        setLoading(true);
        try {
            await api.post('/api/etl/execute');
            setAutoRefresh(true);
            loadStatus();
            alert('Proceso ETL iniciado correctamente');
        } catch (error: any) {
            alert('Error al iniciar ETL: ' + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    const stopETL = async () => {
        if (!confirm('¿Está seguro de detener el proceso ETL?')) {
            return;
        }

        try {
            await api.post('/api/etl/stop');
            loadStatus();
            setAutoRefresh(false);
            alert('Proceso ETL detenido');
        } catch (error: any) {
            alert('Error al detener ETL: ' + (error.response?.data?.detail || error.message));
        }
    };

    // Helper functions for progress visualization
    const getCurrentStepNumber = (): number => {
        if (!status.current_step) return 0;
        const step = status.current_step.toLowerCase();
        if (step.includes('descarga')) return 1;
        if (step.includes('carga')) return 2;
        if (step.includes('enriquecimiento') || step.includes('banco')) return 3;
        if (step.includes('consorcio') || step.includes('ia')) return 4;
        return 0;
    };

    const isCurrentStep = (stepNumber: number): boolean => {
        return status.is_running && getCurrentStepNumber() === stepNumber;
    };

    const isStepCompleted = (stepNumber: number): boolean => {
        return status.is_running && getCurrentStepNumber() > stepNumber;
    };

    const getCurrentStepClass = (stepNumber: number): string => {
        if (isCurrentStep(stepNumber)) {
            return 'ring-2 ring-blue-500 ring-offset-2 scale-105';
        }
        if (isStepCompleted(stepNumber)) {
            return 'ring-2 ring-green-500 ring-offset-2';
        }
        return '';
    };

    const getProgressPercentage = (): number => {
        const currentStep = getCurrentStepNumber();
        if (currentStep === 0) return 0;
        return (currentStep / 4) * 100;
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#0b122b] p-6 md:p-8 fade-in transition-colors duration-300">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-[#0F2C4A] dark:text-white border-b-2 border-[#E2E8F0] dark:border-gray-700 pb-3 inline-block">
                    Motor ETL - Carga de Datos SEACE
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Ejecute el proceso automático de extracción, transformación y carga de datos desde SEACE
                </p>
            </div>

            {/* Control Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-transparent dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-[#0F2C4A] dark:text-white mb-2">Panel de Control</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${status.is_running ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-300">
                                    {status.is_running ? 'En Ejecución' : 'Detenido'}
                                </span>
                            </div>
                            {status.start_time && (
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    Iniciado: {new Date(status.start_time).toLocaleString()}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={executeETL}
                            disabled={status.is_running || loading}
                            className="px-6 py-3 bg-[#0F2C4A] text-white rounded-lg font-semibold hover:bg-[#163A5F] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            <i className="fas fa-play"></i>
                            {loading ? 'Iniciando...' : 'Ejecutar ETL'}
                        </button>
                        {status.is_running && (
                            <button
                                onClick={stopETL}
                                className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all flex items-center gap-2"
                            >
                                <i className="fas fa-stop"></i>
                                Detener
                            </button>
                        )}
                    </div>
                </div>

                {status.current_step && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded">
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                            <i className="fas fa-info-circle mr-2"></i>
                            {status.current_step}
                        </p>
                    </div>
                )}
            </div>

            {/* Process Description with Progress */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-md p-6 mb-6 border border-blue-200/50 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#0F2C4A] dark:text-white">
                        <i className="fas fa-cogs mr-2"></i>
                        Proceso ETL Automático
                    </h3>
                    {status.is_running && (
                        <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0F2C4A] dark:border-blue-400"></div>
                            <span className="text-sm font-semibold text-[#0F2C4A] dark:text-blue-400">Procesando...</span>
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                {status.is_running && (
                    <div className="mb-4">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                                style={{ width: `${getProgressPercentage()}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-right">{getProgressPercentage()}% completado</p>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 md:grid-cols-4 gap-4">
                    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm transition-all ${getCurrentStepClass(1)}`}>
                        <div className="text-2xl mb-2">📥</div>
                        <h4 className="font-bold text-sm text-[#0F2C4A] dark:text-white mb-1">1. Descarga</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Obtiene datos desde SEACE</p>
                        {isCurrentStep(1) && (
                            <div className="mt-2 flex items-center gap-1">
                                <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">En progreso</span>
                            </div>
                        )}
                        {isStepCompleted(1) && (
                            <div className="mt-2 flex items-center gap-1">
                                <i className="fas fa-check-circle text-green-500"></i>
                                <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Completado</span>
                            </div>
                        )}
                    </div>
                    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm transition-all ${getCurrentStepClass(2)}`}>
                        <div className="text-2xl mb-2">💾</div>
                        <h4 className="font-bold text-sm text-[#0F2C4A] dark:text-white mb-1">2. Carga</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Inserta datos en MySQL</p>
                        {isCurrentStep(2) && (
                            <div className="mt-2 flex items-center gap-1">
                                <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">En progreso</span>
                            </div>
                        )}
                        {isStepCompleted(2) && (
                            <div className="mt-2 flex items-center gap-1">
                                <i className="fas fa-check-circle text-green-500"></i>
                                <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Completado</span>
                            </div>
                        )}
                    </div>
                    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm transition-all ${getCurrentStepClass(3)}`}>
                        <div className="text-2xl mb-2">🏦</div>
                        <h4 className="font-bold text-sm text-[#0F2C4A] dark:text-white mb-1">3. Enriquecimiento</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Extrae información de bancos</p>
                        {isCurrentStep(3) && (
                            <div className="mt-2 flex items-center gap-1">
                                <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">En progreso</span>
                            </div>
                        )}
                        {isStepCompleted(3) && (
                            <div className="mt-2 flex items-center gap-1">
                                <i className="fas fa-check-circle text-green-500"></i>
                                <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Completado</span>
                            </div>
                        )}
                    </div>
                    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm transition-all ${getCurrentStepClass(4)}`}>
                        <div className="text-2xl mb-2">🤖</div>
                        <h4 className="font-bold text-sm text-[#0F2C4A] dark:text-white mb-1">4. IA Consorcios</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Procesa consorcios con IA</p>
                        {isCurrentStep(4) && (
                            <div className="mt-2 flex items-center gap-1">
                                <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">En progreso</span>
                            </div>
                        )}
                        {isStepCompleted(4) && (
                            <div className="mt-2 flex items-center gap-1">
                                <i className="fas fa-check-circle text-green-500"></i>
                                <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Completado</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Logs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-transparent dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#0F2C4A] dark:text-white">
                        <i className="fas fa-terminal mr-2"></i>
                        Logs de Ejecución
                    </h3>
                    <button
                        onClick={loadStatus}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-all text-sm"
                    >
                        <i className="fas fa-sync-alt mr-2"></i>
                        Actualizar
                    </button>
                </div>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-y-auto max-h-96">
                    {status.logs.length > 0 ? (
                        status.logs.map((log, idx) => (
                            <div key={idx} className="mb-1">{log}</div>
                        ))
                    ) : (
                        <div className="text-gray-500">No hay logs disponibles. Ejecute el proceso ETL para ver los logs en tiempo real.</div>
                    )}
                </div>
            </div>

            {/* History */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-transparent dark:border-gray-700">
                <h3 className="text-lg font-bold text-[#0F2C4A] dark:text-white mb-4">
                    <i className="fas fa-history mr-2"></i>
                    Historial de Ejecuciones
                </h3>
                {history.length > 0 ? (
                    <div className="space-y-2">
                        {history.map((item, idx) => (
                            <div key={idx} className="border-l-4 border-blue-500 bg-gray-50 dark:bg-gray-900 p-3 rounded">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.details}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                        {item.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No hay historial disponible</p>
                )}
            </div>
        </div>
    );
}
