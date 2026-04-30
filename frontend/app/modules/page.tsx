'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UserCog, LineChart, ChevronRight, User, ShieldCheck, ArrowLeft, ArrowRight, Lock } from 'lucide-react';

import { useAuthProtection } from '@/hooks/use-auth-protection';
import '../login_new.css';

const CircuitEffect = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        // Debounce: only update dimensions when the user stops resizing (150ms idle)
        let resizeTimer: ReturnType<typeof setTimeout>;
        const handleResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                width = window.innerWidth;
                height = window.innerHeight;
                canvas.width = width;
                canvas.height = height;
            }, 150);
        };
        window.addEventListener('resize', handleResize);

        // CircuitLine and Spark are defined below — types are used here forward-declared style
        const lines: CircuitLine[] = [];
        const maxLines = 70;
        const gridSize = 60;
        const nodes: {x: number, y: number, opacity: number}[] = [];
        const sparks: Spark[] = [];

        // Create nodes at intersections
        for (let x = 0; x < width; x += gridSize) {
            for (let y = 0; y < height; y += gridSize) {
                if (Math.random() > 0.95) {
                    nodes.push({x, y, opacity: 0});
                }
            }
        }

        class Spark {
            x: number;
            y: number;
            size: number;
            maxSize: number;
            opacity: number;
            color: string;

            constructor(x: number, y: number, color: string) {
                this.x = x;
                this.y = y;
                this.size = 0;
                this.maxSize = Math.random() * 20 + 15;
                this.opacity = 1;
                this.color = color;
            }

            draw() {
                ctx!.beginPath();
                ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx!.fillStyle = '#fff';
                ctx!.shadowBlur = 30;
                ctx!.shadowColor = this.color;
                ctx!.globalAlpha = this.opacity * 0.9;
                ctx!.fill();
                
                // Draw more rays
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI) / 4;
                    ctx!.beginPath();
                    ctx!.moveTo(this.x, this.y);
                    ctx!.lineTo(this.x + Math.cos(angle) * this.size * 2.5, this.y + Math.sin(angle) * this.size * 2.5);
                    ctx!.strokeStyle = '#fff';
                    ctx!.lineWidth = 1.5;
                    ctx!.stroke();
                }

                this.size += 2;
                this.opacity -= 0.03;
                ctx!.shadowBlur = 0;
                return this.opacity > 0;
            }
        }

        class CircuitLine {
            x: number;
            y: number;
            path: {x: number, y: number}[];
            maxLength: number;
            speed: number;
            color: string;
            opacity: number;
            life: number;
            direction: 'up' | 'down' | 'left' | 'right';
            packetPos: number;

            constructor() {
                this.x = Math.floor(Math.random() * (width / gridSize)) * gridSize;
                this.y = Math.floor(Math.random() * (height / gridSize)) * gridSize;
                this.path = [{x: this.x, y: this.y}];
                this.maxLength = Math.random() * 12 + 8;
                this.speed = Math.random() * 3 + 2;
                this.opacity = Math.random() * 0.4 + 0.3;
                this.life = 0;
                this.packetPos = 0;
                this.color = getComputedStyle(document.documentElement).getPropertyValue('--season-accent').trim() || '#38BDF8';
                
                const dirs: ('up' | 'down' | 'left' | 'right')[] = ['up', 'down', 'left', 'right'];
                this.direction = dirs[Math.floor(Math.random() * dirs.length)];
            }

            update() {
                this.life++;
                this.packetPos += 0.05;
                if (this.packetPos > 1) this.packetPos = 0;

                const head = this.path[this.path.length - 1];
                let nextX = head.x;
                let nextY = head.y;

                if (this.direction === 'up') nextY -= this.speed;
                else if (this.direction === 'down') nextY += this.speed;
                else if (this.direction === 'left') nextX -= this.speed;
                else if (this.direction === 'right') nextX += this.speed;

                if (this.life % gridSize === 0 && Math.random() > 0.5) {
                    const turns: Record<string, ('up' | 'down' | 'left' | 'right')[]> = {
                        up: ['left', 'right'],
                        down: ['left', 'right'],
                        left: ['up', 'down'],
                        right: ['up', 'down']
                    };
                    const possible = turns[this.direction];
                    this.direction = possible[Math.floor(Math.random() * possible.length)];
                    
                    nodes.forEach(n => {
                        if (Math.hypot(n.x - head.x, n.y - head.y) < gridSize) {
                            n.opacity = 1;
                        }
                    });
                }

                this.path.push({x: nextX, y: nextY});
                if (this.path.length > this.maxLength * 5) {
                    this.path.shift();
                }

                // Random Collision Check (Balanced frequency)
                if (this.life % 3 === 0) { // Check every 3 frames
                    lines.forEach(other => {
                        if (other !== this && other.path.length > 0) {
                            const otherHead = other.path[other.path.length - 1];
                            const dist = Math.hypot(head.x - otherHead.x, head.y - otherHead.y);
                            if (dist < 40) { // Balanced distance threshold
                                if (Math.random() > 0.6) { // 40% chance if close
                                    sparks.push(new Spark(head.x, head.y, this.color));
                                }
                            }
                        }
                    });
                }

                return !(nextX < -100 || nextX > width + 100 || nextY < -100 || nextY > height + 100);
            }

            draw() {
                if (this.path.length < 2) return;
                
                ctx!.shadowBlur = 10;
                ctx!.shadowColor = this.color;
                ctx!.strokeStyle = this.color;
                ctx!.lineWidth = 1.5;
                ctx!.globalAlpha = this.opacity;
                
                ctx!.beginPath();
                ctx!.moveTo(this.path[0].x, this.path[0].y);
                for (let i = 1; i < this.path.length; i++) {
                    ctx!.lineTo(this.path[i].x, this.path[i].y);
                }
                ctx!.stroke();

                // Draw Packet
                const packetIdx = Math.floor(this.packetPos * (this.path.length - 1));
                const packet = this.path[packetIdx];
                ctx!.fillStyle = '#fff';
                ctx!.shadowBlur = 15;
                ctx!.globalAlpha = this.opacity * 2;
                ctx!.beginPath();
                ctx!.arc(packet.x, packet.y, 2, 0, Math.PI * 2);
                ctx!.fill();
                
                ctx!.shadowBlur = 0;
            }
        }

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            
            // Draw Nodes
            nodes.forEach(n => {
                if (n.opacity > 0) {
                    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--season-accent');
                    ctx.globalAlpha = n.opacity * 0.3;
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                    n.opacity -= 0.01;
                }
            });

            // Draw Sparks
            for (let i = sparks.length - 1; i >= 0; i--) {
                if (!sparks[i].draw()) {
                    sparks.splice(i, 1);
                }
            }

            if (lines.length < maxLines && Math.random() > 0.95) {
                lines.push(new CircuitLine());
            }

            for (let i = lines.length - 1; i >= 0; i--) {
                if (!lines[i].update()) lines.splice(i, 1);
                else lines[i].draw();
            }

            requestAnimationFrame(animate);
        };

        animate();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[5]" style={{ opacity: 0.8 }} />;
};

const FuturisticOverlay = () => (
    <div className="absolute inset-0 pointer-events-none z-[6] overflow-hidden opacity-30">
        <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-blue-400/50 rounded-tl-3xl"></div>
        <div className="absolute top-10 right-10 w-20 h-20 border-t-2 border-r-2 border-blue-400/50 rounded-tr-3xl"></div>
        <div className="absolute bottom-10 left-10 w-20 h-20 border-b-2 border-l-2 border-blue-400/50 rounded-bl-3xl"></div>
        <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-blue-400/50 rounded-br-3xl"></div>
        
        <div className="absolute top-1/2 left-4 -translate-y-1/2 flex flex-col gap-4 text-[10px] font-mono text-blue-300/40 tracking-widest vertical-text">
            <span>CORE_STABILITY: 98.4%</span>
            <span>DATA_SYNC: ACTIVE</span>
            <span>SECURE_PORT: 443</span>
        </div>
        
        <div className="absolute bottom-10 right-20 text-[10px] font-mono text-blue-300/40 tracking-widest">
            LAT: -12.0464 | LON: -77.0428
        </div>
        
        <div className="scanline"></div>
    </div>
);

type Season = 'winter' | 'autumn' | 'summer' | 'spring';

export default function ModulesPage() {
    const router = useRouter();
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [visible, setVisible] = useState(false);
    const [season, setSeason] = useState<Season>('summer');

    const { isAuthenticated, loading } = useAuthProtection();

    // PRELOAD IMAGES
    useEffect(() => {
        const imagesToPreload = ['/mar.jpg', '/otonooo.jpg', '/fondo_seace.jpg', '/bg-building7.jpg'];
        imagesToPreload.forEach((src) => {
            const img = new Image();
            img.src = src;
        });
    }, []);

    // SEASON SWITCHER
    useEffect(() => {
        const seasons: Season[] = ['summer', 'autumn', 'winter', 'spring'];
        const randomStartIdx = Math.floor(Math.random() * seasons.length);
        
        setSeason(seasons[randomStartIdx]);
        
        const interval = setInterval(() => {
            setSeason(prevSeason => {
                const otherSeasons = seasons.filter(s => s !== prevSeason);
                const nextSeason = otherSeasons[Math.floor(Math.random() * otherSeasons.length)];
                return nextSeason;
            });
        }, 15000); // Switch every 15 seconds
        
        return () => clearInterval(interval);
    }, []);

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
        <div className={`login-container season-${season} min-h-screen w-full flex flex-col justify-center items-center relative overflow-hidden transition-all duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            {/* BACKGROUNDS */}
            <div className={`bg-blur-overlay bg-summer ${season === 'summer' ? 'active' : ''}`}></div>
            <div className={`bg-blur-overlay bg-autumn ${season === 'autumn' ? 'active' : ''}`}></div>
            <div className={`bg-blur-overlay bg-winter ${season === 'winter' ? 'active' : ''}`}></div>
            <div className={`bg-blur-overlay bg-spring ${season === 'spring' ? 'active' : ''}`}></div>
            
            {/* DYNAMIC CIRCUIT EFFECT (PREMIUM TECH AESTHETIC) */}
            <CircuitEffect />
            
            {/* FUTURISTIC HUD OVERLAY */}
            <FuturisticOverlay />

            <div className="z-10 w-full max-w-6xl px-6">
                <div className="text-center mb-16 animate-in slide-in-from-top-10 duration-700 fade-in fill-mode-backwards delay-100">
                    <h1 className="text-white font-black text-6xl md:text-7xl mb-4 tracking-tight drop-shadow-2xl">
                        SISTEMA <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(to right, #fff, var(--season-accent))' }}>MCQS</span>
                    </h1>
                    <div className="h-1.5 w-32 rounded-full mx-auto shadow-[0_0_20px_rgba(59,130,246,0.6)]" style={{ background: 'linear-gradient(to right, var(--season-accent), var(--season-secondary))' }}></div>
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
                        <div className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(to bottom, transparent, var(--season-hex))' }}></div>

                        <div className="relative z-10 flex flex-col items-center flex-1 justify-center">
                            <div className="w-32 h-32 rounded-full flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ring-4 ring-white/10 bg-white/10 backdrop-blur-md border border-white/20" style={{ boxShadow: '0 0 30px var(--season-hex)' }}>
                                <UserCog className="w-14 h-14 transition-colors duration-500" style={{ color: 'var(--season-accent)', filter: 'drop-shadow(0 0 8px var(--season-accent))' }} />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2 group-hover:transition-colors" style={{ color: 'white' }}>Operaciones MQS</h2>
                            <p className="text-blue-200/70 text-center text-sm px-4">Gestión de obras, clientes y trámites administrativos.</p>
                        </div>

                        <div className="relative z-10">
                            <button className="w-full bg-white/5 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 border transition-all duration-300 group-hover:shadow-lg group-active:scale-[0.98]" style={{ borderColor: 'var(--season-accent)', color: 'white' }}>
                                <style jsx>{`
                                    button:hover {
                                        background-color: var(--season-btn);
                                        border-color: var(--season-accent);
                                        box-shadow: 0 0 25px var(--season-hex);
                                    }
                                `}</style>
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
                        <div className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(to bottom, transparent, var(--season-hex))' }}></div>

                        <div className="relative z-10 flex flex-col items-center flex-1 justify-center">
                            <div className="w-32 h-32 rounded-full flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 ring-4 ring-white/10 bg-white/10 backdrop-blur-md border border-white/20" style={{ boxShadow: '0 0 30px var(--season-hex)' }}>
                                <LineChart className="w-14 h-14 transition-colors duration-500" style={{ color: 'var(--season-accent)', filter: 'drop-shadow(0 0 8px var(--season-accent))' }} />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2 group-hover:transition-colors">Dashboard SEACE</h2>
                            <p className="text-blue-200/70 text-center text-sm px-4">Análisis de datos, tendencias y métricas de licitaciones.</p>
                        </div>

                        <div className="relative z-10">
                            <button className="w-full bg-white/5 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 border transition-all duration-300 group-hover:shadow-lg group-active:scale-[0.98]" style={{ borderColor: 'var(--season-accent)', color: 'white' }}>
                                <style jsx>{`
                                    button:hover {
                                        background-color: var(--season-btn);
                                        border-color: var(--season-accent);
                                        box-shadow: 0 0 25px var(--season-hex);
                                    }
                                `}</style>
                                Acceder al Dashboard
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 text-blue-200/40 text-xs font-light tracking-wide">
                © 2026 MCQS System v3.0 | Secure Enterprise Port
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
