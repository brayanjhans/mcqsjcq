'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function ObrasPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [consorcios, setConsorcios] = useState<any[]>([]);
    const [selectedConsorcio, setSelectedConsorcio] = useState<any>(null);
    const [docCount, setDocCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredConsorcios = consorcios.filter(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.ruc.includes(searchTerm)
    );

    useEffect(() => {
        const userData = sessionStorage.getItem('user_display');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            loadConsorcios();
        }
    }, []);

    const loadConsorcios = async () => {
        try {
            // const res = await api.get('/api/mqs/consorcios');
            // setConsorcios(res.data);
            throw new Error('Using mock data');
        } catch (error) {
            console.error('Error loading consorcios:', error);
            // Si falla, usar datos de ejemplo
            setConsorcios([
                { nombre: 'CONSORCIO SAN FRANCISCO', ruc: '20600123451', total_licitaciones: 3, monto_total: 25000000 },
                { nombre: 'CONSORCIO CHIRAPATAN', ruc: '20600123452', total_licitaciones: 5, monto_total: 15000000 },
                { nombre: 'CONSORCIO PALCA GROUP II', ruc: '20600123453', total_licitaciones: 2, monto_total: 8000000 },
                { nombre: 'CONSORCIO VIAL DEL SUR', ruc: '20600123454', total_licitaciones: 4, monto_total: 12000000 },
                { nombre: 'CONSORCIO SANTA ROSA', ruc: '20600123455', total_licitaciones: 6, monto_total: 18000000 }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleConsorcioClick = async (consorcio: any) => {
        setLoading(true);
        try {
            const res = await api.get(`/api/mqs/consorcios/${consorcio.ruc}/detalles`);
            setSelectedConsorcio(res.data);
        } catch (error) {
            console.error('Error loading consorcio details:', error);
            // Mock data si falla
            // Determine members based on consortium name
            let miembrosMock: any[] = [];

            if (consorcio.nombre === 'CONSORCIO CHIRAPATAN') {
                miembrosMock = [
                    { nombre: 'FCH', ruc: '20100000001', porcentaje: 33.3 },
                    { nombre: 'NINOS', ruc: '20100000002', porcentaje: 33.3 },
                    { nombre: 'RACIVA', ruc: '20100000003', porcentaje: 33.3 }
                ];
            } else if (consorcio.nombre === 'CONSORCIO SAN FRANCISCO' || consorcio.nombre === 'CONSORCIO PALCA GROUP II') {
                miembrosMock = [
                    { nombre: 'LIAN WORK', ruc: '20200000001', porcentaje: 30 },
                    { nombre: 'RONY DC', ruc: '20200000002', porcentaje: 30 },
                    { nombre: 'CISMINIG DIAZ INGENIEROS', ruc: '20200000003', porcentaje: 40 }
                ];
            } else {
                // Default
                miembrosMock = [
                    { nombre: 'ALVAMAR', ruc: '20100000001', porcentaje: 50 },
                    { nombre: 'YABE YIRE', ruc: '20100000002', porcentaje: 50 }
                ];
            }

            setSelectedConsorcio({
                nombre: consorcio.nombre,
                ruc: consorcio.ruc,
                total_licitaciones: 5,
                monto_total: consorcio.monto_total || 15000000,
                licitaciones: [
                    {
                        nomenclatura: 'LP-2024-001',
                        descripcion: 'Mejoramiento de infraestructura vial',
                        entidad: 'Gobierno Regional Huánuco',
                        monto_adjudicado: 5000000,
                        estado: 'En Ejecución',
                        ubicacion: 'Huánuco',
                        fecha_adjudicacion: '2024-03-15'
                    }
                ],
                // Mock members for File Explorer structure
                miembros: miembrosMock
            });
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setSelectedConsorcio(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-2xl sm:text-3xl lg:text-4xl text-[#0F2C4A] mb-4"></i>
                    <p className="text-gray-600">Cargando obras...</p>
                </div>
            </div>
        );
    }

    // Vista de detalles de consorcio
    if (selectedConsorcio) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Header Mejorado */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-6 rounded-2xl border border-blue-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
                            className="bg-white/80 dark:bg-gray-800 p-2.5 rounded-xl text-blue-900 dark:text-blue-400 border border-blue-100 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all hover:scale-105 active:scale-95 shadow-sm"
                        >
                            <i className="fas fa-arrow-left text-lg"></i>
                        </button>
                        <div>
                            <h2 className="text-3xl font-extrabold text-blue-950 dark:text-white tracking-tight">
                                {selectedConsorcio.nombre}
                            </h2>
                            <p className="text-blue-600/80 dark:text-blue-400 font-medium mt-1 flex items-center gap-2">
                                <i className="fas fa-building text-sm"></i>
                                Detalles y Licitaciones
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl border border-blue-100 dark:border-gray-700 shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                            <i className="fas fa-fingerprint"></i>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">RUC</p>
                            <p className="font-mono text-lg font-bold text-gray-900 dark:text-white leading-none">{selectedConsorcio.ruc}</p>
                        </div>
                    </div>
                </div>

                {/* Resumen KPIs Cards Premium */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/20 rounded-bl-full -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                        <div className="relative z-10 flex items-center gap-5">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                                <i className="fas fa-award"></i>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Documentos Totales Adjuntados</p>
                                <p className="text-4xl font-extrabold text-[#0F2C4A] dark:text-white mt-1">{docCount}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-green-50 dark:bg-green-900/20 rounded-bl-full -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                        <div className="relative z-10 flex items-center gap-5">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                                <i className="fas fa-money-bill-wave"></i>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Monto Total de la Obra</p>
                                <p className="text-4xl font-extrabold text-[#0F2C4A] dark:text-white mt-1">
                                    S/ {(selectedConsorcio.monto_total / 1000000).toFixed(2)}M
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabla de Licitaciones Premium */}
                {/* File Explorer View */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 sm:px-6 lg:px-8 py-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <i className="fas fa-folder-open text-yellow-500"></i>
                            Documentación del Proyecto
                        </h3>
                    </div>
                    <div className="p-6">
                        <FileExplorer consorcio={selectedConsorcio} onCountChange={setDocCount} />
                    </div>
                </div>

                {/* Miembros del Consorcio Premium */}
                {selectedConsorcio.miembros && selectedConsorcio.miembros.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-4 sm:px-6 lg:px-8 py-6 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <i className="fas fa-users text-purple-500"></i>
                                Estructura del Consorcio
                            </h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedConsorcio.miembros.map((miembro: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/30 hover:bg-purple-50/30 hover:border-purple-100 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 group-hover:text-purple-900 transition-colors">{miembro.nombre}</div>
                                            <div className="text-xs font-mono text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 mt-1 w-fit">
                                                {miembro.ruc}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-2xl font-black text-purple-600 group-hover:scale-110 transition-transform">
                                        {miembro.porcentaje}<span className="text-sm align-top opacity-60">%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }



    // Vista de lista de consorcios (carpetas) Premium
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Main Premium */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6 lg:p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-50/50 dark:bg-yellow-900/20 rounded-full -mr-16 -mt-16 pointer-events-none blur-3xl"></div>

                <div className="relative z-10 w-full md:w-auto">
                    <h2 className="text-4xl font-extrabold text-[#0F2C4A] dark:text-white tracking-tight">
                        Obras <span className="text-[#F39C12]">Secrex Cesce</span>
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-3 text-lg max-w-2xl text-pretty mb-4 md:mb-0">
                        {user?.role === 'admin'
                            ? 'Gestión integral de consorcios adjudicados y seguimiento de licitaciones'
                            : 'Explorador de consorcios y entidades con licitaciones activas'}
                    </p>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Search Input Filter */}
                    <div className="relative w-full md:w-64 group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <i className="fas fa-search text-gray-400 group-focus-within:text-[#F39C12] transition-colors"></i>
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar consorcio o RUC..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-3 w-full bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F39C12]/20 focus:border-[#F39C12] outline-none transition-all shadow-sm text-sm font-medium text-gray-700 placeholder-gray-400"
                        />
                    </div>

                    <div className="hidden md:flex bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 items-center gap-3 min-w-[160px]">
                        <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center text-[#F39C12]">
                            <i className="fas fa-folder-tree text-xl"></i>
                        </div>
                        <div className="pr-4">
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Total Obras</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{filteredConsorcios.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid de Consorcios Premium */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredConsorcios.map((consorcio, idx) => (
                    <div
                        key={idx}
                        onClick={() => handleConsorcioClick(consorcio)}
                        className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-[#F39C12]/10 transition-all duration-300 cursor-pointer border border-gray-100 dark:border-gray-700 hover:-translate-y-1 overflow-hidden relative"
                    >
                        {/* Decorative Top Border */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-[#F39C12] to-[#E67E22] transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>

                        <div className="p-6">
                            {/* Icon y Status */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center group-hover:bg-[#F39C12] transition-colors duration-300 shadow-inner">
                                    <i className="fas fa-building text-2xl text-[#E67E22] group-hover:text-white transition-colors"></i>
                                </div>
                                <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border border-gray-200">
                                    Activo
                                </span>
                            </div>

                            {/* Info Principal */}
                            <h3 className="font-bold text-[#0F2C4A] dark:text-white text-lg mb-1 leading-tight line-clamp-2 group-hover:text-[#E67E22] transition-colors">
                                {consorcio.nombre}
                            </h3>
                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-1.5 rounded border border-gray-100">RUC</span>
                                <span className="text-xs text-gray-500 font-mono">{consorcio.ruc}</span>
                            </div>

                            {/* Footer Stats */}
                            <div className="space-y-2 pt-4 border-t border-gray-50 dark:border-gray-700">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 flex items-center gap-1.5">
                                        <i className="fas fa-gavel text-gray-300"></i> Licitaciones
                                    </span>
                                    <span className="font-bold text-[#0F2C4A] bg-blue-50 px-2 py-0.5 rounded text-xs text-blue-700">
                                        {consorcio.total_licitaciones}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 flex items-center gap-1.5">
                                        <i className="fas fa-coins text-gray-300"></i> Monto Total
                                    </span>
                                    <span className="font-bold text-[#27AE60] bg-green-50 px-2 py-0.5 rounded text-xs text-green-700">
                                        S/ {(consorcio.monto_total / 1000000).toFixed(1)}M
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {consorcios.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <i className="fas fa-search text-2xl sm:text-3xl lg:text-4xl text-gray-300"></i>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron consorcios</h3>
                    <p className="text-gray-500 text-center max-w-md mx-auto">
                        Parece que no hay registros disponibles en este momento. Verifica la conexión o contacta al administrador.
                    </p>
                </div>
            )}
        </div>
    );
}

function FileExplorer({ consorcio, onCountChange }: { consorcio: any, onCountChange?: (count: number) => void }) {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['01', '02']));
    const [structure, setStructure] = useState<any[]>([]);

    // Initialize structure when consorcio changes
    useEffect(() => {
        setStructure(generateStructure());
    }, [consorcio]);

    // Calculate count whenever structure changes
    useEffect(() => {
        if (onCountChange) {
            const countFolders = (nodes: any[]): number => {
                let count = 0;
                for (const node of nodes) {
                    if (node.type === 'folder') {
                        count++;
                        if (node.children) {
                            count += countFolders(node.children);
                        }
                    }
                }
                return count;
            };
            onCountChange(countFolders(structure));
        }
    }, [structure, onCountChange]);

    const toggleFolder = (path: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        setExpandedFolders(newExpanded);
    };

    const handleCreateFolder = () => {
        const folderName = window.prompt("Nombre de la nueva carpeta:");
        if (folderName) {
            setStructure(prev => [
                ...prev,
                {
                    name: folderName,
                    type: 'folder',
                    path: `new-${Date.now()}`,
                    date: new Date().toLocaleString(),
                    children: []
                }
            ]);
        }
    };

    const handleUploadFile = () => {
        // Simulate file upload
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (file) {
                setStructure(prev => [
                    ...prev,
                    {
                        name: file.name,
                        type: 'file',
                        path: `file-${Date.now()}`,
                        date: new Date().toLocaleString(),
                        size: `${(file.size / 1024).toFixed(0)} KB`
                    }
                ]);
            }
        };
        input.click();
    };

    // Helper to generate dynamic structure
    const generateStructure = () => {
        // Custom structure for PALCA GROUP II
        if (consorcio.nombre === 'CONSORCIO PALCA GROUP II') {
            return [
                {
                    name: '01. DATOS DEL CONSORCIO',
                    type: 'folder',
                    path: '01',
                    date: '12/12/2024 10:25',
                    children: [
                        { name: '01 Reporte de otorgamiento de buena pro.PDF', type: 'file', date: '01/12/2024 09:00', size: '1,500 KB' },
                        { name: '02 Acta de otorgamiento de buena pro.PDF', type: 'file', date: '01/12/2024 09:15', size: '1,200 KB' },
                        { name: '03 Bases integradas a publicar.PDF', type: 'file', date: '01/12/2024 09:30', size: '5,000 KB' },
                        { name: '04 memoria descriptiva.PDF', type: 'file', date: '01/12/2024 10:00', size: '3,200 KB' },
                        { name: '05 presupuesto de la obra.pdf', type: 'file', date: '01/12/2024 10:30', size: '800 KB' },
                        { name: '06 promesa de consorcio.pdf', type: 'file', date: '01/12/2024 11:00', size: '600 KB' }
                    ]
                },
                {
                    name: '02. DATOS DE LA OBRA',
                    type: 'folder',
                    path: '02',
                    date: '09/12/2024 16:31',
                    children: [
                        { name: '02 Publicas Obras Sev y Sum -Inf.Consolidada Consorcio.PDF', type: 'file', date: '09/12/2024 16:35', size: '2,500 KB' },
                        { name: 'CARTA DE NOMBRAMIENTO BROKER.PDF', type: 'file', date: '09/12/2024 16:40', size: '400 KB' }
                    ]
                },
                {
                    name: '03.01 LIAN WORK',
                    type: 'folder',
                    path: '03',
                    date: '03/12/2024 10:00',
                    children: [
                        { name: '01. DNI Y VICENCIA', type: 'folder', path: '03-01', children: [] },
                        { name: '02. FORMATOS', type: 'folder', path: '03-02', children: [] },
                        { name: '03. ESTADO FINACIERO', type: 'folder', path: '03-03', children: [] }
                    ]
                },
                {
                    name: '04.02 RONY DC',
                    type: 'folder',
                    path: '04',
                    date: '03/12/2024 10:00',
                    children: [
                        { name: '01. DNI Y VICENCIA', type: 'folder', path: '04-01', children: [] },
                        { name: '02. FORMATOS', type: 'folder', path: '04-02', children: [] },
                        { name: '03. ESTADO FINACIERO', type: 'folder', path: '04-03', children: [] }
                    ]
                },
                {
                    name: '06 CISMINIG DIAZ INGENIEROS',
                    type: 'folder',
                    path: '06',
                    date: '03/12/2024 10:00',
                    children: [
                        { name: '01. DNI Y VICENCIA', type: 'folder', path: '06-01', children: [] },
                        { name: '02. FORMATOS', type: 'folder', path: '06-02', children: [] },
                        { name: '03. ESTADO FINACIERO', type: 'folder', path: '06-03', children: [] }
                    ]
                },
                {
                    name: '07. GARANTIAS',
                    type: 'folder',
                    path: '07',
                    date: '03/12/2024 10:00',
                    children: [
                        { name: '01. PRIMA', type: 'folder', path: '07-01', children: [] },
                        { name: '02. GARANTIA', type: 'folder', path: '07-02', children: [] },
                        { name: '03. PAGARES', type: 'folder', path: '07-03', children: [] },
                        { name: '04. PAGARES', type: 'folder', path: '07-04', children: [] }
                    ]
                },
                {
                    name: '08. OTROS',
                    type: 'folder',
                    path: '08',
                    date: '12/12/2024 12:00',
                    children: []
                },
                {
                    name: 'EXPERIENCIAS SIMILARES.PDF',
                    type: 'file',
                    path: 'exp-similares-pg',
                    date: '12/12/2024 12:05',
                    size: '4,500 KB'
                }
            ];
        }
        // Custom structure for SAN FRANCISCO
        if (consorcio.nombre === 'CONSORCIO SAN FRANCISCO') {
            return [
                {
                    name: '01. DATOS DEL CONSORCIO',
                    type: 'folder',
                    path: '01',
                    date: '12/12/2024 10:25',
                    children: [
                        { name: '01 Reporte de otorgamiento de buena pro.PDF', type: 'file', date: '01/12/2024 09:00', size: '1,500 KB' },
                        { name: '02 Acta de otorgamiento de buena pro.PDF', type: 'file', date: '01/12/2024 09:15', size: '1,200 KB' },
                        { name: '03 Bases integradas a publicar.PDF', type: 'file', date: '01/12/2024 09:30', size: '5,000 KB' },
                        { name: '04 memoria descriptiva.PDF', type: 'file', date: '01/12/2024 10:00', size: '3,200 KB' },
                        { name: '05 presupuesto de la obra.pdf', type: 'file', date: '01/12/2024 10:30', size: '800 KB' },
                        { name: '06 promesa de consorcio.pdf', type: 'file', date: '01/12/2024 11:00', size: '600 KB' }
                    ]
                },
                {
                    name: '02. DATOS DE LA OBRA',
                    type: 'folder',
                    path: '02',
                    date: '09/12/2024 16:31',
                    children: [
                        { name: '02 Publicas Obras Sev y Sum -Inf.Consolidada Consorcio.PDF', type: 'file', date: '09/12/2024 16:35', size: '2,500 KB' },
                        { name: 'CARTA DE NOMBRAMIENTO BROKER.PDF', type: 'file', date: '09/12/2024 16:40', size: '400 KB' }
                    ]
                },
                {
                    name: '03.01 LIAN WORK',
                    type: 'folder',
                    path: '03',
                    date: '03/12/2024 10:00',
                    children: [
                        { name: '01. DNI Y VICENCIA', type: 'folder', path: '03-01', children: [] },
                        { name: '02. FORMATOS', type: 'folder', path: '03-02', children: [] },
                        { name: '03. ESTADO FINACIERO', type: 'folder', path: '03-03', children: [] }
                    ]
                },
                {
                    name: '04.02 RONY DC',
                    type: 'folder',
                    path: '04',
                    date: '03/12/2024 10:00',
                    children: [
                        { name: '01. DNI Y VICENCIA', type: 'folder', path: '04-01', children: [] },
                        { name: '02. FORMATOS', type: 'folder', path: '04-02', children: [] },
                        { name: '03. ESTADO FINACIERO', type: 'folder', path: '04-03', children: [] }
                    ]
                },
                {
                    name: '06 CISMINIG DIAZ INGENIEROS',
                    type: 'folder',
                    path: '06',
                    date: '03/12/2024 10:00',
                    children: [
                        { name: '01. DNI Y VICENCIA', type: 'folder', path: '06-01', children: [] },
                        { name: '02. FORMATOS', type: 'folder', path: '06-02', children: [] },
                        { name: '03. ESTADO FINACIERO', type: 'folder', path: '06-03', children: [] }
                    ]
                },
                {
                    name: '07. GARANTIAS',
                    type: 'folder',
                    path: '07',
                    date: '03/12/2024 10:00',
                    children: [
                        { name: '01. PRIMA', type: 'folder', path: '07-01', children: [] },
                        { name: '02. GARANTIA', type: 'folder', path: '07-02', children: [] },
                        { name: '03. PAGARES', type: 'folder', path: '07-03', children: [] },
                        { name: '04. PAGARES', type: 'folder', path: '07-04', children: [] }
                    ]
                },
                {
                    name: '08. OTROS',
                    type: 'folder',
                    path: '08',
                    date: '12/12/2024 12:00',
                    children: []
                },
                {
                    name: 'EXPERIENCIAS SIMILARES.PDF',
                    type: 'file',
                    path: 'exp-similares-sf',
                    date: '12/12/2024 12:05',
                    size: '4,500 KB'
                }
            ];
        }
        // Custom structure for CHIRAPATAN
        if (consorcio.nombre === 'CONSORCIO CHIRAPATAN') {
            return [
                {
                    name: '01. DATOS DEL CONSORCIO',
                    type: 'folder',
                    path: '01',
                    date: '12/12/2024 10:25',
                    children: [
                        { name: '01 Reporte de otorgamiento de buena pro.PDF', type: 'file', date: '01/12/2024 09:00', size: '1,500 KB' },
                        { name: '02 Acta de otorgamiento de buena pro.PDF', type: 'file', date: '01/12/2024 09:15', size: '1,200 KB' },
                        { name: '03 Bases integradas a publicar.PDF', type: 'file', date: '01/12/2024 09:30', size: '5,000 KB' },
                        { name: '04 memoria descriptiva.PDF', type: 'file', date: '01/12/2024 10:00', size: '3,200 KB' },
                        { name: '05 presupuesto de la obra.pdf', type: 'file', date: '01/12/2024 10:30', size: '800 KB' },
                        { name: '06 promesa de consorcio.pdf', type: 'file', date: '01/12/2024 11:00', size: '600 KB' }
                    ]
                },
                {
                    name: '02. DATOS DE LA OBRA',
                    type: 'folder',
                    path: '02',
                    date: '09/12/2024 16:31',
                    children: [
                        { name: '02 Publicas Obras Sev y Sum -Inf.Consolidada Consorcio.PDF', type: 'file', date: '09/12/2024 16:35', size: '2,500 KB' },
                        { name: 'CARTA DE NOMBRAMIENTO BROKER.PDF', type: 'file', date: '09/12/2024 16:40', size: '400 KB' }
                    ]
                },
                {
                    name: '03.01 FCH',
                    type: 'folder',
                    path: '03',
                    date: '03/12/2024 10:00',
                    children: [
                        { name: '01. DNI Y VICENCIA', type: 'folder', path: '03-01', children: [] },
                        { name: '02. FORMATOS', type: 'folder', path: '03-02', children: [] },
                        { name: '03. ESTADO FINACIERO', type: 'folder', path: '03-03', children: [] }
                    ]
                },
                {
                    name: '04.02 NINOS',
                    type: 'folder',
                    path: '04',
                    date: '03/12/2024 10:00',
                    children: [
                        { name: '01. DNI Y VICENCIA', type: 'folder', path: '04-01', children: [] },
                        { name: '02. FORMATOS', type: 'folder', path: '04-02', children: [] },
                        { name: '03. ESTADO FINACIERO', type: 'folder', path: '04-03', children: [] }
                    ]
                },
                {
                    name: '06 RACIVA',
                    type: 'folder',
                    path: '06',
                    date: '03/12/2024 10:00',
                    children: [
                        { name: '01. DNI Y VICENCIA', type: 'folder', path: '06-01', children: [] },
                        { name: '02. FORMATOS', type: 'folder', path: '06-02', children: [] },
                        { name: '03. ESTADO FINACIERO', type: 'folder', path: '06-03', children: [] }
                    ]
                },
                {
                    name: '07. OTROS',
                    type: 'folder',
                    path: '07',
                    date: '12/12/2024 12:00',
                    children: []
                },
                {
                    name: 'EXPERIENCIAS SIMILARES.PDF',
                    type: 'file',
                    path: 'exp-similares',
                    date: '12/12/2024 12:05',
                    size: '4,500 KB'
                }
            ];
        }

        const structure: any[] = [
            {
                name: '01. DATOS DEL CONSORCIO',
                type: 'folder',
                path: '01',
                date: '12/12/2024 10:25',
                children: Array(4).fill(null).map((_, i) => ({ name: 'EJEMPLO.PDF', type: 'file', date: '12/12/2024 10:25', size: '1,024 KB' }))
            },
            {
                name: '02. DATOS DE LA OBRA',
                type: 'folder',
                path: '02',
                date: '09/12/2024 16:31',
                children: Array(4).fill(null).map((_, i) => ({ name: 'EJEMPLO.PDF', type: 'file', date: '09/12/2024 16:31', size: '2,048 KB' }))
            }
        ];

        // Dynamic Members
        if (consorcio.miembros) {
            consorcio.miembros.forEach((miembro: any, index: number) => {
                const folderIndex = String(index + 3).padStart(2, '0');

                const children = [
                    { name: '01. DNI Y VIGENCIA', type: 'folder', path: `${folderIndex}-01`, date: '03/12/2024 23:24', children: [{ name: 'VIGENCIA.PDF', type: 'file', date: '03/12/2024', size: '500 KB' }] },
                    { name: '02. FORMATOS', type: 'folder', path: `${folderIndex}-02`, date: '03/12/2024 23:24', children: [{ name: 'FORMATO_A.PDF', type: 'file', date: '03/12/2024', size: '300 KB' }] },
                    { name: '03. ESTADO FINANCIERO', type: 'folder', path: `${folderIndex}-03`, date: '03/12/2024 23:24', children: [{ name: 'BALANCE.PDF', type: 'file', date: '03/12/2024', size: '1,200 KB' }] }
                ];

                structure.push({
                    name: `${folderIndex}. ${miembro.nombre.toUpperCase()}`,
                    type: 'folder',
                    path: folderIndex,
                    date: '03/12/2024 23:24',
                    children: children
                });
            });
        }

        // OTROS Folder
        structure.push({
            name: 'OTROS',
            type: 'folder',
            path: 'otros',
            date: '12/12/2024 10:24',
            children: []
        });

        // ROOT FILES
        structure.push({
            name: 'EXPERIENCIA EN SIMILARES.PDF',
            type: 'file',
            path: 'exp-similares',
            date: '02/12/2024 11:09',
            size: '4,937 KB'
        });

        return structure;
    };

    // Use state structure for rendering
    // const treeData = generateStructure(); // REMOVED

    const renderRows = (nodes: any[], level = 0) => {
        return nodes.map((node, i) => (
            <div key={node.path || i}>
                <div
                    className={`grid grid-cols-12 gap-4 py-3 px-4 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-700 items-center text-sm group ${level > 0 ? '' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (node.type === 'folder') toggleFolder(node.path);
                        // Prevent expansion for files
                    }}
                >
                    {/* Name Column (Variable Width) - Spans 5 cols */}
                    <div className="col-span-12 md:col-span-5 flex items-center gap-3 overflow-hidden">
                        <div style={{ paddingLeft: `${level * 24}px` }} className="flex-shrink-0 flex items-center">
                            <span className={`w-5 flex justify-center transition-transform duration-200 ${node.type === 'folder' && expandedFolders.has(node.path) ? 'rotate-90' : ''}`}>
                                {node.type === 'folder' && <i className="fas fa-chevron-right text-[10px] text-gray-400"></i>}
                            </span>
                        </div>

                        <div className="flex-shrink-0">
                            {node.type === 'folder' ? (
                                <i className={`fas ${expandedFolders.has(node.path) ? 'fa-folder-open' : 'fa-folder'} text-yellow-500 text-xl shadow-sm drop-shadow-sm transition-colors`}></i>
                            ) : (
                                <i className="fas fa-file-pdf text-red-600 text-xl shadow-sm drop-shadow-sm"></i>
                            )}
                        </div>
                        <span className={`truncate font-semibold tracking-tight ${node.type === 'folder' ? 'text-gray-800 dark:text-gray-200 text-[15px]' : 'text-gray-600 dark:text-gray-400'}`}>
                            {node.name}
                        </span>
                    </div>

                    {/* Date Column - Spans 3 cols */}
                    <div className="hidden md:block col-span-3 text-gray-700 dark:text-gray-400 text-sm font-semibold">
                        {node.date}
                    </div>

                    {/* Type Column - Spans 2 cols */}
                    <div className="hidden md:block col-span-2 text-gray-600 dark:text-gray-500 text-sm font-medium">
                        {node.type === 'folder' ? 'Carpeta de archivos' : 'Documento PDF'}
                    </div>

                    {/* Size Column - Spans 2 cols */}
                    <div className="hidden md:block col-span-2 text-right text-gray-800 dark:text-gray-300 text-sm font-mono font-bold">
                        {node.size || '-'}
                    </div>
                </div>

                {node.type === 'folder' && expandedFolders.has(node.path) && node.children && (
                    <div className="animate-in slide-in-from-top-1 duration-200">
                        {renderRows(node.children, level + 1)}
                    </div>
                )}
            </div>
        ));
    };

    return (
        <div className="select-none font-sans w-full">
            {/* Actions Bar Premium */}
            <div className="flex items-center gap-3 mb-6 px-2">
                <button
                    onClick={handleCreateFolder}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:shadow active:scale-95"
                >
                    <i className="fas fa-folder-plus text-yellow-500 text-lg"></i>
                    Crear Carpeta
                </button>
                <button
                    onClick={handleUploadFile}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                    <i className="fas fa-cloud-upload-alt text-white text-lg"></i>
                    Subir Archivo
                </button>
            </div>

            {/* Table Header Premium */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 bg-gray-50 text-xs font-black text-gray-600 uppercase tracking-widest sticky top-0 z-10 rounded-t-xl shadow-sm">
                <div className="col-span-5 pl-8">Nombre</div>
                <div className="col-span-3">Fecha de modificación</div>
                <div className="col-span-2">Tipo</div>
                <div className="col-span-2 text-right">Tamaño</div>
            </div>

            {/* Table Body */}
            <div className="bg-white min-h-[300px]">
                {renderRows(structure)}
            </div>
        </div>
    );
}
