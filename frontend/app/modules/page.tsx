'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCog, LineChart, ChevronRight, User, ShieldCheck, ArrowLeft, ArrowRight, Lock } from 'lucide-react';
import { HeaderActions } from '@/components/layout/header-actions';
import { useAuthProtection } from '@/hooks/use-auth-protection';

export default function ModulesPage() {
    const router = useRouter();
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [visible, setVisible] = useState(false);

    const { isAuthenticated, loading } = useAuthProtection();

    useEffect(() => {
        setTimeout(() => setVisible(true), 50);
    }, [router]);

    const handleMQSClick = () => {
        setShowRoleModal(true);
    };

    const handleSEACEClick = () => {
        router.push('/seace/dashboard');
    };

    if (loading || !isAuthenticated) return null;

    return (
        <div className={`min-h-screen w-full flex flex-col justify-center items-center relative overflow-hidden transition-all duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <HeaderActions />

            {/* Background Image with Overlay */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-fixed"
                style={{
                    backgroundImage: 'linear-gradient(to bottom, rgba(15, 44, 74, 0.5), rgba(15, 44, 74, 0.3)), url(/bg-building7.jpg)'
                }}
            />

            <div className="z-10 w-full max-w-6xl px-6">
                <div className="text-center mb-16 animate-in slide-in-from-top-10 duration-700 fade-in fill-mode-backwards delay-100">
                    <h1 className="text-white font-black text-6xl md:text-7xl mb-4 tracking-tight drop-shadow-2xl">
                        SISTEMA <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">MCQS</span>
                    </h1>
                    <div className="h-1.5 w-32 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full mx-auto shadow-[0_0_20px_rgba(59,130,246,0.6)]"></div>
                    <p className="mt-6 text-xl text-blue-100/80 font-light tracking-wide max-w-2xl mx-auto">
                        Seleccione el módulo operativo para comenzar su gestión
                    </p>
                </div>

                <div className="flex gap-8 justify-center flex-wrap perspective-1000">
                    {/* MQS Operations Card */}
                    <div
                        className="group relative w-full md:w-[380px] h-[420px] bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.2)] flex flex-col justify-between p-8 hover:-translate-y-4 hover:bg-white/10 hover:border-white/20 transition-all duration-500 cursor-pointer animate-in slide-in-from-bottom-10 fade-in fill-mode-backwards delay-200"
                        onClick={handleMQSClick}
                    >
                        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-blue-500/0 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="relative z-10 flex flex-col items-center flex-1 justify-center">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ring-4 ring-white/10">
                                <UserCog className="text-white w-14 h-14" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">Operaciones MQS</h2>
                            <p className="text-blue-200/70 text-center text-sm px-4">Gestión de obras, clientes y trámites administrativos.</p>
                        </div>

                        <div className="relative z-10">
                            <button className="w-full bg-white/10 hover:bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-blue-500/30 group-active:scale-[0.98]">
                                Acceder al Módulo
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* SEACE Dashboard Card */}
                    <div
                        className="group relative w-full md:w-[380px] h-[420px] bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.2)] flex flex-col justify-between p-8 hover:-translate-y-4 hover:bg-white/10 hover:border-white/20 transition-all duration-500 cursor-pointer animate-in slide-in-from-bottom-10 fade-in fill-mode-backwards delay-300"
                        onClick={handleSEACEClick}
                    >
                        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-cyan-500/0 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="relative z-10 flex flex-col items-center flex-1 justify-center">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-[#0F2C4A] to-blue-800 flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 ring-4 ring-white/10">
                                <LineChart className="text-white w-14 h-14" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">Dashboard SEACE</h2>
                            <p className="text-blue-200/70 text-center text-sm px-4">Análisis de datos, tendencias y métricas de licitaciones.</p>
                        </div>

                        <div className="relative z-10">
                            <button className="w-full bg-white/10 hover:bg-cyan-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-cyan-500/30 group-active:scale-[0.98]">
                                Acceder al Dashboard
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 text-blue-200/40 text-xs font-light tracking-wide">
                © 2024 MCQS System v3.0 | Secure Enterprise Portal
            </div>

            {/* Role Selection Modal */}
            {showRoleModal && <RoleModal onClose={() => setShowRoleModal(false)} />}
        </div>
    );
}

function RoleModal({ onClose }: { onClose: () => void }) {
    const router = useRouter();
    const [showPinEntry, setShowPinEntry] = useState(false);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');

    const handleColaboradorClick = () => {
        // Update role to colaborador in localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            user.role = 'colaborador';
            localStorage.setItem('user', JSON.stringify(user));
        }
        router.push('/mqs/obras');
    };

    const handleAdminClick = () => {
        // Admin requires PIN verification
        setShowPinEntry(true);
    };

    const handlePinSubmit = async () => {
        setPinError('');

        if (pin.length !== 6) {
            setPinError('El PIN debe tener 6 dígitos');
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch('/api/auth/verify-pin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ pin: pin })
            });

            if (!response.ok) {
                const errorData = await response.json();

                if (response.status === 403) {
                    setPinError('No tienes permisos de administrador');
                } else if (response.status === 401) {
                    setPinError('PIN incorrecto');
                } else {
                    setPinError(errorData.detail || 'Error al verificar PIN');
                }

                setPin('');
                return;
            }

            const userData = localStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                user.role = 'admin';
                localStorage.setItem('user', JSON.stringify(user));
            }
            router.push('/mqs/obras');
        } catch (error) {
            console.error('Error verificando PIN:', error);
            setPinError('Error de conexión');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-md bg-[#0F2C4A]/90 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] p-8 animate-in zoom-in-95 duration-300 overflow-hidden text-white">

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-bl-[100px] -z-0 blur-xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/20 rounded-tr-[80px] -z-0 blur-xl"></div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors z-20"
                >
                    <span className="sr-only">Cerrar</span>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                {!showPinEntry ? (
                    <div className="relative z-10">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4 transform -rotate-3 border border-white/10">
                                <User className="text-white w-8 h-8" />
                            </div>
                            <h3 className="text-white text-2xl font-black tracking-tight drop-shadow-md">Seleccionar Perfil</h3>
                            <p className="text-blue-200/70 text-sm mt-1 font-medium">Elija cómo desea ingresar al sistema</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div onClick={handleAdminClick}
                                className="group cursor-pointer bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center hover:bg-white/10 hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all duration-300 active:scale-95"
                            >
                                <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-600 transition-colors duration-300 ring-1 ring-white/5">
                                    <ShieldCheck className="text-blue-300 w-7 h-7 group-hover:text-white transition-colors" />
                                </div>
                                <span className="font-bold text-blue-100 group-hover:text-white transition-colors">Administrador</span>
                            </div>

                            <div onClick={handleColaboradorClick}
                                className="group cursor-pointer bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center hover:bg-white/10 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all duration-300 active:scale-95"
                            >
                                <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mb-3 group-hover:bg-cyan-600 transition-colors duration-300 ring-1 ring-white/5">
                                    <User className="text-cyan-300 w-7 h-7 group-hover:text-white transition-colors" />
                                </div>
                                <span className="font-bold text-blue-100 group-hover:text-white transition-colors">Colaborador</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="relative z-10 text-center px-4">
                        <button
                            onClick={() => setShowPinEntry(false)}
                            className="absolute left-0 top-0 text-blue-300 hover:text-white transition-colors flex items-center gap-1 text-sm font-semibold"
                        >
                            <ArrowLeft className="w-4 h-4" /> Volver
                        </button>

                        <div className="mb-8 mt-6">
                            <div className="w-16 h-16 bg-white/10 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-black/20 mb-4 border border-white/10">
                                <Lock className="text-white w-8 h-8" />
                            </div>
                            <h3 className="text-white text-2xl font-black drop-shadow-md">Acceso Seguro</h3>
                            <p className="text-blue-200/70 text-sm">Ingrese su PIN de 6 dígitos</p>
                        </div>

                        <div className="relative mb-6">
                            <input
                                type="password"
                                maxLength={6}
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && pin.length === 6) {
                                        handlePinSubmit();
                                    }
                                }}
                                placeholder="• • • • • •"
                                className="w-full text-center text-4xl font-mono tracking-[0.5em] py-4 border-b-2 border-white/20 outline-none focus:border-blue-400 transition-colors bg-transparent text-white placeholder-white/20"
                                autoFocus
                            />
                        </div>

                        {pinError && (
                            <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-sm py-2 px-3 rounded-lg mb-4 flex items-center justify-center gap-2 animate-in slide-in-from-top-2 backdrop-blur-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {pinError}
                            </div>
                        )}

                        <button
                            onClick={handlePinSubmit}
                            disabled={pin.length !== 6}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group border border-white/10"
                        >
                            <span className="flex items-center justify-center gap-2">
                                VERIFICAR ACCESO
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
