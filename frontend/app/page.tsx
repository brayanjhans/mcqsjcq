'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User, Lock, Eye, EyeOff, X, ArrowRight, ShieldCheck } from 'lucide-react';

export default function HomePage() {
    const router = useRouter();
    const [showLogin, setShowLogin] = useState(false);
    const [imagesLoaded, setImagesLoaded] = useState(false);

    useEffect(() => {
        // Trigger animations after mount
        setTimeout(() => setImagesLoaded(true), 100);
    }, []);

    return (
        <div className="relative min-h-screen w-full flex flex-col justify-center items-center text-center px-5 overflow-hidden">
            {/* Background Image with Ken Burns Effect */}
            <div className="absolute inset-0 z-0">
                <div
                    className="absolute inset-0 bg-cover bg-center animate-ken-burns"
                    style={{ backgroundImage: 'url(/lobo.jpg)' }}
                ></div>
            </div>

            {/* Fog/Mist Animation Layers */}
            <div className="absolute inset-0 z-0 opacity-50 pointer-events-none mix-blend-screen">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)] animate-fog-slow"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(200,220,255,0.15),transparent_50%)] animate-fog-fast"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(200,220,255,0.1),transparent_60%)] animate-fog-slow" style={{ animationDelay: '-5s' }}></div>
            </div>

            {/* Overlay Cinematográfico */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50/80 via-white/40 to-blue-100/60 transition-opacity"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(15,44,74,0.1)_100%)]"></div>

            {/* Decorative Images (Logos Premium) */}
            <div className={`absolute top-10 left-8 md:left-12 transition-all duration-1000 ease-out z-20 ${imagesLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
                <div className="w-24 h-24 md:w-28 md:h-28 bg-white/40 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:scale-110 transition-transform duration-500 cursor-pointer group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <img src="/logo-mqs.png" alt="MQS Logo" className="w-full h-full object-cover relative z-10" />
                </div>
            </div>

            <div className={`absolute top-10 right-8 md:right-12 transition-all duration-1000 ease-out z-20 delay-100 ${imagesLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
                <div className="w-24 h-24 md:w-28 md:h-28 bg-white/40 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:scale-110 transition-transform duration-500 cursor-pointer group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <img src="/logo-jcq.png" alt="JCQ Logo" className="w-full h-full object-cover relative z-10" />
                </div>
            </div>

            {/* Hero Content */}
            <div className="max-w-5xl z-10 relative">
                {/* Etiqueta Superior */}
                <div className={`mb-8 overflow-hidden`}>
                    <span className={`inline-block py-2 px-6 rounded-full bg-[#0F2C4A]/5 backdrop-blur-sm border border-[#0F2C4A]/10 text-sm md:text-base tracking-[4px] font-bold text-[#0F2C4A] uppercase shadow-sm transition-all duration-1000 delay-200 ${imagesLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
                        JCQ  <span className="text-blue-500 mx-2">/</span> MCQS MICHAEL CESAR QUISPE SEBASTIAN
                    </span>
                </div>

                {/* Título Principal Impactante */}
                <h1 className={`text-6xl md:text-8xl leading-tight font-black mb-4 text-[#0F2C4A] tracking-tighter transition-all duration-1000 delay-300 drop-shadow-2xl ${imagesLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                    ANTICIPAR ES <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0F2C4A] to-[#2563EB]">GANAR</span>
                </h1>

                {/* Subtítulo Elegante */}
                <h2 className={`text-3xl md:text-5xl font-light mb-12 text-[#133657] transition-all duration-1000 delay-500 ${imagesLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                    CUMPLIR ES <span className="font-semibold italic">CRECER</span>
                </h2>

                {/* Botón de Acción Principal Modificado */}
                <button
                    onClick={() => setShowLogin(true)}
                    className={`
                        group relative overflow-hidden inline-flex items-center gap-3
                        bg-[#0F2C4A] text-white px-12 py-5 
                        text-lg font-bold tracking-wide rounded-full 
                        shadow-[0_20px_50px_-12px_rgba(15,44,74,0.5)] 
                        hover:shadow-[0_30px_60px_-15px_rgba(15,44,74,0.6)]
                        hover:-translate-y-1 active:scale-95
                        transition-all duration-300 delay-700
                        ${imagesLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}
                    `}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-[#0F2C4A] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative z-10">ACCEDER A MQS</span>
                    <i className="fas fa-arrow-right relative z-10 group-hover:translate-x-1 transition-transform"></i>
                </button>
            </div>

            {/* Login Modal */}
            {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
        </div>
    );
}

function LoginModal({ onClose }: { onClose: () => void }) {
    const router = useRouter();
    const [credentials, setCredentials] = useState({ id_corporativo: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Real authentication with backend - always use relative URL for Next.js proxy
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id_corporativo: credentials.id_corporativo,
                    password: credentials.password
                })
            });

            if (!response.ok) {
                // Safely parse error body — server might return HTML on 502/timeout
                let errorMessage = 'Credenciales inválidas';
                try {
                    const contentType = response.headers.get('content-type') || '';
                    if (contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errorMessage = errorData.detail || errorMessage;
                    } else {
                        errorMessage = `Error del servidor (${response.status})`;
                    }
                } catch {
                    errorMessage = `Error del servidor (${response.status})`;
                }
                setError(errorMessage);
                setLoading(false);
                return;
            }

            const data = await response.json();

            // Store token and user data
            const perfilRaw = data.user?.perfil || 'COLABORADOR';
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('user', JSON.stringify({
                id: data.user.id,
                username: data.user.id_corporativo,
                email: data.user.email,
                role: perfilRaw.toLowerCase(),
                perfil: perfilRaw,
                nombre: data.user.nombre,
                job_title: data.user.job_title
            }));

            // Use window.location for hard redirect to ensure localStorage is committed
            setLoading(false);
            onClose();
            window.location.href = '/modules';
        } catch (error) {
            console.error('Error en login:', error);
            setError('Error de conexión con el servidor');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className="relative w-full max-w-md overflow-hidden bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_70px_rgba(0,0,0,0.15)] border border-white/60 transform transition-all animate-in zoom-in-95 slide-in-from-bottom-5 duration-500 group"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative gradients matching modules page */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white/80 opacity-100 pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-400/10 rounded-full blur-[60px] -z-0"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/10 rounded-full blur-[60px] -z-0"></div>

                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all z-20"
                >
                    <X size={22} />
                </button>

                <div className="p-10 pb-8 relative z-10">
                    <div className="text-center mb-10 relative">
                        <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-blue-500/30 transform hover:rotate-6 hover:scale-110 transition-all duration-500 ring-4 ring-white/10">
                            <ShieldCheck className="text-white w-10 h-10 drop-shadow-md" />
                        </div>
                        <h3 className="text-4xl font-black text-[#0F2C4A] tracking-tight mb-2 drop-shadow-sm">
                            Bienvenido
                        </h3>
                        <p className="text-blue-900/60 text-sm font-bold tracking-wide">Portales Corporativos MQS & SEACE</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-5">
                            {/* User Input */}
                            <div className={`relative group transition-all duration-300 ${focusedField === 'user' ? 'scale-[1.02]' : ''}`}>
                                <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${focusedField === 'user' ? 'text-blue-600' : 'text-gray-400'}`}>
                                    <User size={20} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="ID Corporativo"
                                    value={credentials.id_corporativo}
                                    onChange={(e) => setCredentials({ ...credentials, id_corporativo: e.target.value })}
                                    onFocus={() => setFocusedField('user')}
                                    onBlur={() => setFocusedField(null)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSubmit(e as any);
                                        }
                                    }}
                                    className={`w-full pl-12 pr-4 py-4 rounded-xl border-2 outline-none transition-all duration-300 bg-gray-50/50 text-gray-800 placeholder-gray-400 backdrop-blur-sm
                                        ${focusedField === 'user'
                                            ? 'border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.1)] bg-white'
                                            : 'border-gray-100 hover:border-blue-200 hover:bg-white'}`}
                                    required
                                />
                            </div>

                            {/* Password Input */}
                            <div className={`relative group transition-all duration-300 ${focusedField === 'pass' ? 'scale-[1.02]' : ''}`}>
                                <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${focusedField === 'pass' ? 'text-blue-600' : 'text-gray-400'}`}>
                                    <Lock size={20} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Contraseña"
                                    value={credentials.password}
                                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                    onFocus={() => setFocusedField('pass')}
                                    onBlur={() => setFocusedField(null)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSubmit(e as any);
                                        }
                                    }}
                                    className={`w-full pl-12 pr-12 py-4 rounded-xl border-2 outline-none transition-all duration-300 bg-gray-50/50 text-gray-800 placeholder-gray-400 backdrop-blur-sm
                                        ${focusedField === 'pass'
                                            ? 'border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.1)] bg-white'
                                            : 'border-gray-100 hover:border-blue-200 hover:bg-white'}`}
                                    required
                                />
                                <button
                                    type="button"
                                    onMouseEnter={() => setShowPassword(true)}
                                    onMouseLeave={() => setShowPassword(false)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>

                            <div className="flex items-center justify-between text-sm pt-1 px-1">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input type="checkbox" className="peer sr-only" />
                                        <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all bg-white"></div>
                                        <div className="absolute inset-0 text-white opacity-0 peer-checked:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                        </div>
                                    </div>
                                    <span className="text-gray-500 group-hover:text-blue-700 transition-colors font-medium">Recordar sesión</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowForgotPassword(true)}
                                    className="text-blue-600 hover:text-blue-800 font-bold hover:underline transition-all"
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-100 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-in slide-in-from-top-2 shadow-sm font-medium">
                                <div className="w-2 h-2 rounded-full bg-red-600 shrink-0 animate-pulse"></div>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#0F2C4A] text-white py-4 rounded-xl font-bold text-lg 
                            hover:shadow-[0_10px_40px_-10px_rgba(15,44,74,0.5)] hover:bg-[#163A5F] hover:scale-[1.02] active:scale-[0.98]
                            disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none
                            transition-all duration-300 group relative overflow-hidden shadow-lg"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            <span className="relative flex items-center justify-center gap-2 drop-shadow-sm">
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <>
                                        INICIAR SESIÓN
                                        <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </span>
                        </button>
                    </form>
                </div>

                {/* Footer Gradient Line */}
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-80"></div>
            </div>

            {/* Forgot Password Modal Overlay */}
            {showForgotPassword && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0F2C4A]/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-white/20">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-[#0F2C4A]">Recuperar Contraseña</h3>
                            <button
                                onClick={() => setShowForgotPassword(false)}
                                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-gray-600 leading-relaxed">
                                Por razones de seguridad, las contraseñas corporativas deben ser restablecidas por el departamento de IT.
                            </p>

                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-4">
                                <div className="mt-1 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0 text-blue-600">
                                    <ShieldCheck size={16} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">Contacto Soporte</p>
                                    <p className="text-sm text-blue-900 font-medium">soporte@mqs-garantias.com</p>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowForgotPassword(false)}
                                className="w-full bg-[#0F2C4A] text-white py-3.5 rounded-xl font-bold hover:bg-[#163A5F] transition-all hover:shadow-lg mt-2 active:scale-95"
                            >
                                Entendido, gracias
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
