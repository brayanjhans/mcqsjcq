'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User, Lock, Eye, EyeOff, X, ArrowRight, ShieldCheck } from 'lucide-react';

export default function HomePage() {
    const router = useRouter();
    const [showLogin, setShowLogin] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
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

            {/* Global Footer */}
            <div className={`absolute bottom-6 left-0 w-full text-center z-10 transition-all duration-1000 delay-1000 ${imagesLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="flex flex-wrap justify-center items-center gap-4 text-xs md:text-sm font-medium text-white/70 px-4">
                    <button onClick={() => setShowTerms(true)} className="hover:text-white transition-colors hover:underline">Términos y Condiciones</button>
                    <span className="opacity-50">|</span>
                    <button onClick={() => setShowPrivacy(true)} className="hover:text-white transition-colors hover:underline">Política de Privacidad</button>
                    <span className="opacity-50 hidden sm:inline">|</span>
                    <span className="block sm:inline w-full sm:w-auto mt-2 sm:mt-0">© {new Date().getFullYear()} MCQS - Todos los derechos reservados</span>
                </div>
            </div>

            {/* Login Modal */}
            {showLogin && <LoginModal onClose={() => setShowLogin(false)} onOpenTerms={() => setShowTerms(true)} onOpenPrivacy={() => setShowPrivacy(true)} />}

            {/* Legal Modals */}
            {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
            {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
        </div>
    );
}

function LoginModal({ onClose, onOpenTerms, onOpenPrivacy }: { onClose: () => void, onOpenTerms: () => void, onOpenPrivacy: () => void }) {
    const router = useRouter();
    const [credentials, setCredentials] = useState({ id_corporativo: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [termsAccepted, setTermsAccepted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!termsAccepted) {
            setError('Debe aceptar los Términos y Condiciones y la Política de Privacidad para continuar.');
            return;
        }

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

                        <div className="pt-4 pb-2">
                            <label className="flex items-start gap-3 cursor-pointer group bg-gray-50/50 p-4 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                                <div className="relative flex items-center mt-0.5">
                                    <input 
                                        type="checkbox" 
                                        checked={termsAccepted}
                                        onChange={(e) => {
                                            setTermsAccepted(e.target.checked);
                                            if (e.target.checked && error.includes('Debe aceptar')) {
                                                setError('');
                                            }
                                        }}
                                        className="peer sr-only" 
                                    />
                                    <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:bg-[#0F2C4A] peer-checked:border-[#0F2C4A] transition-all bg-white flex items-center justify-center shadow-inner">
                                        <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                    </div>
                                </div>
                                <span className="text-[13px] text-gray-600 leading-snug">
                                    He leído y acepto los <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenTerms(); }} className="text-[#0F2C4A] font-bold hover:text-blue-600 hover:underline transition-colors">Términos y Condiciones</button> y la <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenPrivacy(); }} className="text-[#0F2C4A] font-bold hover:text-blue-600 hover:underline transition-colors">Política de Privacidad</button> obligatorios para acceder al sistema.
                                </span>
                            </label>
                        </div>
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

function TermsModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Animated Glassmorphism Backdrop */}
            <div className="absolute inset-0 bg-[#0F2C4A]/60 backdrop-blur-lg transition-opacity duration-500"></div>
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-500/30 blur-[120px] mix-blend-screen animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-cyan-400/20 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="relative bg-[#F8FAFC] rounded-[2rem] w-full max-w-5xl h-[90vh] flex flex-col shadow-[0_0_80px_rgba(15,44,74,0.5)] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 overflow-hidden ring-1 ring-white/20">
                
                {/* Premium Corporate Blue Header */}
                <div className="bg-gradient-to-r from-[#0F2C4A] via-[#1E3A8A] to-[#0F2C4A] px-8 py-5 relative shrink-0 overflow-hidden flex items-center justify-between border-b border-blue-400/30 shadow-md z-10">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-400/20 rounded-full blur-[80px]"></div>
                    
                    <div className="relative z-10 flex items-center gap-5">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-sm">Términos y Condiciones</h2>
                            <p className="mt-1 text-blue-200 text-xs sm:text-sm font-medium flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_10px_rgba(96,165,250,0.8)]"></span>
                                Acuerdo Legal Corporativo
                            </p>
                        </div>
                    </div>

                    <button onClick={onClose} className="relative z-10 w-10 h-10 flex items-center justify-center text-blue-200 hover:text-white rounded-full hover:bg-white/10 transition-all border border-transparent hover:border-white/20">
                        <X size={24} />
                    </button>
                </div>
                
                {/* Structured Content Area */}
                <div className="p-8 sm:p-10 overflow-y-auto text-base text-slate-600 space-y-6 custom-scrollbar bg-slate-50/50">
                    
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_2px_10px_-4px_rgba(15,44,74,0.05)] hover:shadow-[0_4px_20px_-4px_rgba(15,44,74,0.08)] transition-all">
                        <h3 className="text-sm font-bold text-blue-800 uppercase tracking-widest mb-4 pb-4 border-b border-slate-100">
                            Preámbulo Legal
                        </h3>
                        <p className="text-justify leading-loose text-slate-700">Bienvenido a la plataforma de Inteligencia de Contrataciones. Al acceder, navegar, interactuar o consumir cualquier dato de este sistema, usted establece un contrato legalmente vinculante y acepta someterse a la totalidad de las cláusulas estipuladas en los presentes Términos y Condiciones. Su uso constituye una firma electrónica de aceptación de estos términos.</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_2px_10px_-4px_rgba(15,44,74,0.05)] hover:shadow-[0_4px_20px_-4px_rgba(15,44,74,0.08)] transition-all">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-black">01</span>
                            Identidad del Titular y Operador
                        </h3>
                        <p className="text-justify leading-loose text-slate-700">La presente plataforma web de inteligencia de negocios (SaaS), sus bases de datos subyacentes, algoritmos de búsqueda federada, dashboards y servicios de consultoría asociados son desarrollados, mantenidos y operados de manera exclusiva por MICHAEL CESAR QUISPE SEBASTIAN, persona natural con negocio, identificado con Registro Único de Contribuyentes (RUC) N° 10423117864, en adelante referido como "El Titular" o "La Empresa".</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_2px_10px_-4px_rgba(15,44,74,0.05)] hover:shadow-[0_4px_20px_-4px_rgba(15,44,74,0.08)] transition-all">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-black">02</span>
                            Naturaleza del Servicio
                        </h3>
                        <p className="text-justify leading-loose text-slate-700 mb-4">La Plataforma constituye una herramienta avanzada de integración y análisis de datos enfocada en el gasto público peruano y la gestión de riesgos financieros. Permite a usuarios corporativos autorizados visualizar estadísticas de adjudicaciones, evaluar historiales de consorcios e identificar alertas en los procesos de contratación del Estado.</p>
                        <p className="text-justify leading-loose text-slate-700">El servicio tiene un carácter estrictamente consultivo e informativo, diseñado para apoyar la toma de decisiones empresariales, mas no para sustituir la diligencia debida legal o contable que cada Usuario debe realizar de forma independiente.</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_2px_10px_-4px_rgba(15,44,74,0.05)] hover:shadow-[0_4px_20px_-4px_rgba(15,44,74,0.08)] transition-all">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-black">03</span>
                            Credenciales y Seguridad
                        </h3>
                        <p className="text-justify leading-loose text-slate-700 mb-4">El acceso a los módulos operativos y reportes estructurados está severamente restringido a usuarios que hayan pasado por un proceso de verificación interna. Respecto a sus credenciales:</p>
                        <ul className="space-y-3 list-inside list-disc text-justify leading-loose text-slate-700">
                            <li>La licencia de uso es estrictamente personal, individual e intransferible. Queda prohibido compartir credenciales.</li>
                            <li>Es responsable de configurar contraseñas criptográficamente fuertes.</li>
                            <li>La detección de múltiples inicios de sesión simultáneos desde diferentes IPs resultará en la terminación automática del servicio.</li>
                        </ul>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_2px_10px_-4px_rgba(15,44,74,0.05)] hover:shadow-[0_4px_20px_-4px_rgba(15,44,74,0.08)] transition-all">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-black">04</span>
                            Restricción Estricta Anti-Scraping
                        </h3>
                        <p className="text-justify leading-loose text-slate-700 mb-4">El valor central de la Plataforma radica en la estructuración algorítmica de millones de registros. Se prohíbe terminantemente la extracción automatizada o manual a gran escala.</p>
                        <ul className="space-y-3 list-inside list-disc text-justify leading-loose text-slate-700">
                            <li>El Usuario acepta explícitamente no utilizar robots, scrapers, crawlers, o scripts de automatización (como Selenium) para extraer datos masivos o copiar la estructura de la base de datos.</li>
                            <li>El despliegue de firewalls (WAF) bloqueará accesos anómalos. El Titular se reserva el derecho de iniciar procesos judiciales y de indemnización por lucro cesante.</li>
                        </ul>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_2px_10px_-4px_rgba(15,44,74,0.05)] hover:shadow-[0_4px_20px_-4px_rgba(15,44,74,0.08)] transition-all">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-black">05</span>
                            Exoneración de Responsabilidades Técnicas
                        </h3>
                        <p className="text-justify leading-loose text-slate-700 mb-4">La materia prima analizada proviene de fuentes públicas estatales (SEACE, MEF, OSCE). Es indispensable comprender los límites de nuestra responsabilidad:</p>
                        <ul className="space-y-3 list-inside list-disc text-justify leading-loose text-slate-700">
                            <li>Procesamos la información "tal como se encuentra". No garantizamos que esté libre de errores tipográficos originados por el Estado.</li>
                            <li>La interpretación de las alertas recae únicamente en el Usuario. Declinamos responsabilidad por decisiones comerciales erróneas.</li>
                            <li>La Plataforma puede sufrir caídas temporales por mantenimientos, ataques o fallas en el proveedor de Cloud Hosting (Hostinger VPS).</li>
                        </ul>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_2px_10px_-4px_rgba(15,44,74,0.05)] hover:shadow-[0_4px_20px_-4px_rgba(15,44,74,0.08)] transition-all">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-black">06</span>
                            Confidencialidad y Propiedad Intelectual
                        </h3>
                        <p className="text-justify leading-loose text-slate-700 mb-4">Toda la interfaz, metodologías de cálculo y cruces de datos se consideran secretos comerciales. Queda terminantemente prohibido revender, ceder o distribuir comercialmente la información extraída.</p>
                        <p className="text-justify leading-loose text-slate-700">Los códigos fuente, interfaces (UI/UX), esquemas de bases de datos y algoritmos de indexación son propiedad exclusiva de El Titular y están amparados bajo las leyes internacionales de Propiedad Intelectual.</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_2px_10px_-4px_rgba(15,44,74,0.05)] hover:shadow-[0_4px_20px_-4px_rgba(15,44,74,0.08)] transition-all">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-black">07</span>
                            Modificaciones y Jurisdicción
                        </h3>
                        <p className="text-justify leading-loose text-slate-700 mb-4">El Titular podrá revisar unilateralmente estos Términos en cualquier momento. El uso continuado del sistema tras 15 días de su publicación constituye una aceptación irrevocable.</p>
                        <p className="text-justify leading-loose text-slate-700">Este contrato vinculante se rige por las leyes de la República del Perú. Las partes se someten a la jurisdicción exclusiva de los Jueces y Tribunales del Distrito Judicial de Lima Centro.</p>
                    </div>

                </div>

                {/* Sleek Blue Footer */}
                <div className="px-8 py-6 border-t border-slate-200 flex justify-between items-center shrink-0 bg-white z-10 gap-4">
                    <p className="text-xs text-slate-400 flex-1 hidden sm:block text-right">Al presionar el botón de confirmación, usted firma digitalmente su conformidad con la totalidad de estas cláusulas legales.</p>
                    <button onClick={onClose} className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-[#0F2C4A] to-[#1E3A8A] text-white font-black text-sm uppercase tracking-widest rounded-xl hover:from-[#163A5F] hover:to-[#254BA3] transition-all shadow-[0_10px_20px_-10px_rgba(15,44,74,0.6)] hover:shadow-[0_15px_30px_-10px_rgba(15,44,74,0.8)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 group shrink-0">
                        ACEPTO LOS TÉRMINOS
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function PrivacyModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Animated Glassmorphism Backdrop */}
            <div className="absolute inset-0 bg-[#064E3B]/60 backdrop-blur-lg transition-opacity duration-500"></div>
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-500/30 blur-[120px] mix-blend-screen animate-pulse"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-teal-400/20 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="relative bg-[#F8FAFC] rounded-[2rem] w-full max-w-5xl h-[90vh] flex flex-col shadow-[0_0_80px_rgba(6,78,59,0.5)] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 overflow-hidden ring-1 ring-white/20">
                
                {/* Premium Corporate Teal Header */}
                <div className="bg-gradient-to-r from-[#064E3B] via-[#047857] to-[#064E3B] px-8 py-5 relative shrink-0 overflow-hidden flex items-center justify-between border-b border-emerald-400/30 shadow-md z-10">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
                    <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-emerald-400/20 rounded-full blur-[80px]"></div>
                    
                    <div className="relative z-10 flex items-center gap-5">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-sm">Política de Privacidad</h2>
                            <p className="mt-1 text-emerald-200 text-xs sm:text-sm font-medium flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></span>
                                Cumplimiento Ley N° 29733 (Perú)
                            </p>
                        </div>
                    </div>

                    <button onClick={onClose} className="relative z-10 w-10 h-10 flex items-center justify-center text-emerald-200 hover:text-white rounded-full hover:bg-white/10 transition-all border border-transparent hover:border-white/20">
                        <X size={24} />
                    </button>
                </div>
                
                {/* Structured Content Area */}
                <div className="p-8 sm:p-10 overflow-y-auto text-base text-slate-600 space-y-6 custom-scrollbar bg-slate-50/50">
                    
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_2px_10px_-4px_rgba(6,78,59,0.05)] hover:shadow-[0_4px_20px_-4px_rgba(6,78,59,0.08)] transition-all">
                        <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-widest mb-4 pb-4 border-b border-slate-100">
                            Nuestro Compromiso
                        </h3>
                        <p className="text-justify leading-loose text-slate-700">En estricto cumplimiento de lo dispuesto por la Ley N° 29733, Ley de Protección de Datos Personales y su Reglamento (DS N° 003-2013-JUS), esta política describe de manera transparente cómo MICHAEL CESAR QUISPE SEBASTIAN recopila, utiliza, almacena, transfiere y protege la información que interactúa con la Plataforma.</p>
                    </div>

                    {/* Clauses wrapped in cards */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_2px_10px_-4px_rgba(6,78,59,0.05)] hover:shadow-[0_4px_20px_-4px_rgba(6,78,59,0.08)] transition-all">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                            <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-black">01</span>
                            Categorización de la Información Tratada
                        </h3>
                        <p className="text-justify leading-loose text-slate-700 mb-4">Nuestros sistemas arquitectónicos ingieren y procesan dos esferas documentales claramente delimitadas:</p>
                        <ul className="space-y-3 list-inside list-disc text-justify leading-loose text-slate-700">
                            <li>Información de Fuente Pública (No Confidencial): Data transaccional proveniente del SEACE, SUNAT, SBS y MEF. Según el Art. 14° de la Ley 29733, el tratamiento de datos personales en fuentes públicas no requiere consentimiento.</li>
                            <li>Datos Personales y Corporativos del Usuario: Para otorgarle acceso, recopilamos proactivamente nombres, cargo institucional, empresa, celular, correo corporativo, direcciones IP y logs completos de navegación.</li>
                        </ul>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_2px_10px_-4px_rgba(6,78,59,0.05)] hover:shadow-[0_4px_20px_-4px_rgba(6,78,59,0.08)] transition-all">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                            <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-black">02</span>
                            Finalidades Lícitas del Tratamiento
                        </h3>
                        <p className="text-justify leading-loose text-slate-700 mb-4">Sus datos, almacenados en el banco "Usuarios y Trazabilidad MQS", son procesados bajo las siguientes finalidades legítimas:</p>
                        <ol className="space-y-3 list-inside list-decimal text-justify leading-loose text-slate-700">
                            <li>Verificar su identidad y proveer acceso cifrado.</li>
                            <li>Prestar los servicios de analítica de datos e inteligencia de riesgos.</li>
                            <li>Mantener un registro inalterable de acciones (logs) para prevenir fraudes y responder a auditorías externas (como requerimientos de CESCE).</li>
                            <li>Remitir notificaciones sobre interrupciones o cambios en las políticas.</li>
                        </ol>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_2px_10px_-4px_rgba(6,78,59,0.05)] hover:shadow-[0_4px_20px_-4px_rgba(6,78,59,0.08)] transition-all">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                            <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-black">03</span>
                            Flujo Transfronterizo y Cloud Storage
                        </h3>
                        <p className="text-justify leading-loose text-slate-700 mb-4">Para garantizar alta disponibilidad (HA) y resiliencia frente a desastres, la infraestructura tecnológica se despliega sobre proveedores globales de Infraestructura como Servicio (IaaS).</p>
                        <p className="text-justify leading-loose text-slate-700">El Usuario consiente expresamente que sus datos personales y logs de uso son transferidos, alojados y procesados en servidores administrados por Hostinger International Ltd., específicamente mediante instancias de virtualización basada en kernel. Los centros de datos principales asignados a esta plataforma están ubicados físicamente en Brasil (América del Sur), operando bajo estándares internacionales ISO/IEC 27001 de seguridad de la información.</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_2px_10px_-4px_rgba(6,78,59,0.05)] hover:shadow-[0_4px_20px_-4px_rgba(6,78,59,0.08)] transition-all">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                            <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-black">04</span>
                            Medidas de Seguridad Arquitectónicas
                        </h3>
                        <p className="text-justify leading-loose text-slate-700 mb-4">Nos tomamos la protección de datos con extrema seriedad. El Titular ha implementado controles exhaustivos:</p>
                        <ul className="space-y-3 list-inside list-disc text-justify leading-loose text-slate-700">
                            <li>Cifrado de comunicaciones mediante túneles criptográficos SSL/TLS v1.3.</li>
                            <li>Cifrado en reposo donde las contraseñas son procesadas mediante algoritmos de hash unidireccional con salting.</li>
                            <li>Seguridad perimetral mediante firewalls, aislamiento de redes y protección contra inyecciones SQL.</li>
                        </ul>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_2px_10px_-4px_rgba(6,78,59,0.05)] hover:shadow-[0_4px_20px_-4px_rgba(6,78,59,0.08)] transition-all">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                            <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-black">05</span>
                            Cookies, Retención y Derechos ARCO
                        </h3>
                        <p className="text-justify leading-loose text-slate-700 mb-4">La Plataforma utiliza cookies operativas indispensables para mantener de forma segura su sesión mediante tokens JWT y equilibrar la carga de los servidores.</p>
                        <p className="text-justify leading-loose text-slate-700 mb-4">Usted tiene garantizado el ejercicio gratuito de sus Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición).</p>
                        <p className="text-justify leading-loose text-slate-700">Para hacer efectivos estos derechos, envíe una solicitud clara adjuntando copia de su DNI al correo oficial: privacidad@mcqs-jcq.com. Atenderemos las solicitudes dentro de los plazos perentorios del Reglamento de la Ley de Protección de Datos Personales.</p>
                    </div>

                </div>

                {/* Sleek Teal Footer */}
                <div className="px-8 py-6 border-t border-slate-200 flex justify-between items-center shrink-0 bg-white z-10 gap-4">
                    <p className="text-xs text-slate-400 flex-1 hidden sm:block text-right">Sus datos están protegidos por leyes peruanas y estándares internacionales de cifrado.</p>
                    <button onClick={onClose} className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-[#064E3B] to-[#047857] text-white font-black text-sm uppercase tracking-widest rounded-xl hover:from-[#065F46] hover:to-[#059669] transition-all shadow-[0_10px_20px_-10px_rgba(6,78,59,0.6)] hover:shadow-[0_15px_30px_-10px_rgba(6,78,59,0.8)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 group shrink-0">
                        ENTENDIDO Y CONFORME
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}
