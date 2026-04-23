'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import './login_new.css';

const SnowEffect = () => {
    const snowBgRef = useRef<HTMLDivElement>(null);
    const snowFgRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const snowBg = snowBgRef.current;
        const snowFg = snowFgRef.current;

        const createSnowflake = () => {
            const isForeground = Math.random() > 0.75;
            const container = isForeground ? snowFg : snowBg;
            if (!container) return;

            const snowflake = document.createElement('div');
            snowflake.classList.add('snowflake');

            const sizeValue = isForeground ? (Math.random() * 10 + 10) : (Math.random() * 5 + 3);
            const size = sizeValue + 'px';
            const left = (Math.random() * 100) + '%';

            const duration = isForeground ? (Math.random() * 3 + 4) : (Math.random() * 6 + 10);
            const drift = (Math.random() * 200 - 100) + 'px';
            const swayDuration = (Math.random() * 2 + 2) + 's';
            const opacity = isForeground ? (Math.random() * 0.3 + 0.3) : (Math.random() * 0.4 + 0.2);

            snowflake.style.width = size;
            snowflake.style.height = size;
            snowflake.style.left = left;
            snowflake.style.opacity = opacity.toString();

            snowflake.style.setProperty('--duration', duration + 's');
            snowflake.style.setProperty('--drift', drift);
            snowflake.style.setProperty('--sway-duration', swayDuration);

            container.appendChild(snowflake);

            setTimeout(() => {
                snowflake.remove();
            }, duration * 1000);
        };

        const interval = setInterval(createSnowflake, 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <div ref={snowBgRef} className="snow-bg"></div>
            <div ref={snowFgRef} className="snow-fg"></div>
        </>
    );
};

const LeafEffect = () => {
    const bgRef = useRef<HTMLDivElement>(null);
    const fgRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const bg = bgRef.current;
        const fg = fgRef.current;
        if (!bg || !fg) return;

        const leafColors = ['#D4612A', '#F29F05', '#8C2E14', '#591C0B', '#A64B29'];
        const leafSvg = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8.13,20C11,20 14.85,15.62 15,14C15.15,12.38 17,8 17,8M17,8C17,8 20,12 22,15C21,15 20,13 17,8M12,5C10,3 6,2 2,2C2,6 3,10 5,12C7,14 10,14 12,14V5Z"/></svg>')}`;

        const createLeaf = () => {
            const isForeground = Math.random() > 0.7;
            const container = isForeground ? fg : bg;
            if (!container) return;

            const leaf = document.createElement('div');
            leaf.classList.add('leaf');
            
            const sizeValue = isForeground ? (Math.random() * 15 + 20) : (Math.random() * 10 + 12);
            const size = sizeValue + 'px';
            const blur = isForeground ? '0px' : (Math.random() * 2 + 1) + 'px';
            const duration = isForeground ? (Math.random() * 3 + 4) : (Math.random() * 5 + 8);
            const opacity = isForeground ? (Math.random() * 0.2 + 0.8) : (Math.random() * 0.3 + 0.4);

            const left = (Math.random() * 100) + '%';
            const drift = (Math.random() * 600 - 300) + 'px';
            const rotateDuration = (Math.random() * 3 + 2) + 's';
            const color = leafColors[Math.floor(Math.random() * leafColors.length)];

            leaf.style.width = size;
            leaf.style.height = size;
            leaf.style.left = left;
            leaf.style.opacity = opacity.toString();
            leaf.style.backgroundImage = `url('${leafSvg.replace('currentColor', encodeURIComponent(color))}')`;
            
            leaf.style.setProperty('--duration', (parseFloat(duration.toString()) * (Math.random() * 0.5 + 0.75)) + 's');
            leaf.style.setProperty('--drift', drift);
            leaf.style.setProperty('--rotate-duration', rotateDuration);
            leaf.style.setProperty('--blur', blur);

            container.appendChild(leaf);

            setTimeout(() => {
                leaf.remove();
            }, parseFloat(duration.toString()) * 1000);
        };

        const interval = setInterval(createLeaf, 200);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <div ref={bgRef} className="leaf-bg"></div>
            <div ref={fgRef} className="leaf-fg"></div>
        </>
    );
};

const SummerEffect = () => {
    const bgRef = useRef<HTMLDivElement>(null);
    const fgRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const bg = bgRef.current;
        const fg = fgRef.current;
        if (!bg || !fg) return;

        const seagullSvg = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000000"><path d="M12,12C12,12 10,11 6,11C2,11 0,13 0,13C0,13 2,12 6,12C10,12 12,13 12,13C12,13 14,12 18,12C22,12 24,13 24,13C24,13 22,11 18,11C14,11 12,12 12,12Z"/></svg>')}`;
        const pelicanSvg = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000000"><path d="M24,12C24,12 20,10 14,10C8,10 4,12 4,12L0,11L4,13C4,13 8,15 14,15C20,15 24,13 24,13Z"/></svg>')}`;
        const dolphinSvg = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000000"><path d="M2,12C2,12 5,8 12,8C19,8 22,12 22,12C22,12 19,11 12,11C5,11 2,12 2,12ZM12,12C12,12 10,14 6,14C2,14 0,16 0,16C0,16 2,15 6,15C10,15 12,16 12,16Z"/></svg>')}`;

        const createParticle = () => {
            const rand = Math.random();
            let type = 'mist';
            if (rand > 0.8) type = 'pelican';
            else if (rand > 0.6) type = 'dolphin';
            else if (rand > 0.3) type = 'seagull';

            const isForeground = Math.random() > 0.8 && type !== 'mist';
            const container = isForeground ? fg : bg;
            if (!container) return;

            const p = document.createElement('div');
            p.classList.add(type);
            if (isForeground) p.classList.add('is-foreground');

            if (type === 'seagull' || type === 'pelican') {
                const isPelican = type === 'pelican';
                const baseWidth = isPelican ? 45 : 30;
                const sizeWidth = isForeground ? (baseWidth * 2.5) + 'px' : (Math.random() * 20 + baseWidth) + 'px';
                const sizeHeight = isForeground ? (baseWidth * 0.8) + 'px' : (Math.random() * 5 + 12) + 'px';
                const startY = isForeground ? (Math.random() * 60 + 20) + '%' : (Math.random() * 40 + 5) + '%';
                const duration = isForeground ? (Math.random() * 4 + 4) + 's' : (Math.random() * 10 + 15) + 's';
                
                p.style.width = sizeWidth;
                p.style.height = sizeHeight;
                p.style.top = startY;
                p.style.setProperty('--duration', duration);
                p.style.opacity = isForeground ? '1' : (Math.random() * 0.5 + 0.4).toString();
                if (!isForeground) p.style.filter = 'blur(1px)';

                // Bird Body for Flapping
                const body = document.createElement('div');
                body.classList.add('bird-body');
                body.style.width = '100%';
                body.style.height = '100%';
                body.style.backgroundImage = `url('${isPelican ? pelicanSvg : seagullSvg}')`;
                body.style.backgroundSize = 'contain';
                body.style.backgroundRepeat = 'no-repeat';
                body.style.setProperty('--flap-duration', (Math.random() * 0.2 + 0.2) + 's');
                p.appendChild(body);
            } else if (type === 'dolphin') {
                const left = (Math.random() * 70 + 15) + '%';
                const top = (Math.random() * 10 + 68) + '%';
                p.style.left = left;
                p.style.top = top;
                p.style.width = '50px';
                p.style.height = '25px';
                p.style.backgroundImage = `url('${dolphinSvg}')`;
                p.style.opacity = '0.8';
                p.style.filter = 'blur(0.5px)';
            } else {
                const size = (Math.random() * 100 + 100) + 'px';
                const left = (Math.random() * 100) + '%';
                const duration = (Math.random() * 5 + 5) + 's';
                p.style.width = size;
                p.style.height = size;
                p.style.left = left;
                p.style.setProperty('--duration', duration);
                p.style.setProperty('--drift', (Math.random() * 100 - 50) + 'px');
            }

            container.appendChild(p);
            setTimeout(() => p.remove(), type === 'dolphin' ? 3000 : 25000);
        };

        const interval = setInterval(createParticle, 600);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <div ref={bgRef} className="summer-bg-fx"></div>
            <div ref={fgRef} className="summer-fg-fx"></div>
        </>
    );
};

type Season = 'winter' | 'autumn' | 'summer';

export default function LoginPage() {
    const router = useRouter();
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Random initial season
    const [season, setSeason] = useState<Season>('summer');
    
    const submitBtnRef = useRef<HTMLButtonElement>(null);

    // PRELOAD IMAGES
    useEffect(() => {
        const imagesToPreload = ['/mar.jpg', '/otonooo.jpg', '/fondo_seace.jpg'];
        imagesToPreload.forEach((src) => {
            const img = new Image();
            img.src = src;
        });
    }, []);

    // SEASON SWITCHER
    useEffect(() => {
        const seasons: Season[] = ['summer', 'autumn', 'winter'];
        const randomStartIdx = Math.floor(Math.random() * seasons.length);
        
        setSeason(seasons[randomStartIdx]);
        let currentIdx = randomStartIdx;
        
        const interval = setInterval(() => {
            currentIdx = (currentIdx + 1) % seasons.length;
            setSeason(seasons[currentIdx]);
        }, 15000); // Switch every 15 seconds
        
        return () => clearInterval(interval);
    }, []);

    const handleMouseMove = (e: React.MouseEvent) => {
        const submitBtn = submitBtnRef.current;
        if (submitBtn) {
            const rect = submitBtn.getBoundingClientRect();
            const btnX = rect.left + rect.width / 2;
            const btnY = rect.top + rect.height / 2;

            const distance = Math.hypot(e.clientX - btnX, e.clientY - btnY);
            const radius = 100;

            if (distance < radius) {
                const moveX = (e.clientX - btnX) * 0.3;
                const moveY = (e.clientY - btnY) * 0.3;
                submitBtn.style.transform = `translate(${moveX}px, ${moveY}px)`;
            } else {
                submitBtn.style.transform = `translate(0px, 0px)`;
            }
        }
    };

    const handleMouseLeave = () => {
        if (submitBtnRef.current) {
            submitBtnRef.current.style.transform = `translate(0px, 0px)`;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
            const response = await fetch(`${apiUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id_corporativo: credentials.username,
                    password: credentials.password
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.detail || 'Credenciales inválidas');
                setLoading(false);
                return;
            }

            const data = await response.json();
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('user', JSON.stringify({
                id: data.user.id,
                username: data.user.id_corporativo,
                email: data.user.email,
                role: data.user.perfil.toLowerCase(),
                perfil: data.user.perfil,
                nombre: data.user.nombre,
                job_title: data.user.job_title
            }));

            setLoading(false);
            router.push('/modules');
        } catch (error) {
            console.error('Error en login:', error);
            setError('Error de conexión con el servidor');
            setLoading(false);
        }
    };

    return (
        <div className={`login-container season-${season}`} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
            {/* BACKGROUNDS */}
            <div className={`bg-blur-overlay bg-summer ${season === 'summer' ? 'active' : ''}`}></div>
            <div className={`bg-blur-overlay bg-autumn ${season === 'autumn' ? 'active' : ''}`}></div>
            <div className={`bg-blur-overlay bg-winter ${season === 'winter' ? 'active' : ''}`}></div>
            
            {/* BACKGROUND WEATHER LAYER */}
            {season === 'winter' && <div className="snow-bg"></div>}
            {season === 'autumn' && <div className="leaf-bg"></div>}
            {season === 'summer' && <div className="summer-bg-fx"></div>}
            
            {/* WEATHER EFFECTS */}
            {season === 'winter' && <SnowEffect />}
            {season === 'autumn' && <LeafEffect />}
            {season === 'summer' && <SummerEffect />}

            <header className="top-header">
                <div className="logo header-logo-left">
                    <img src="/logo-mqs.png" alt="MQS Logo" className="brand-image" />
                </div>
                <div className="logo header-logo-right">
                    <img src="/logo-jcq.png" alt="JCQ Logo" className="brand-image" />
                </div>
            </header>

            <main className="login-card">
                <div className="shine-overlay"></div>

                <div className="left-panel">
                    {[...Array(24)].map((_, i) => (
                        <div key={i} className={`decor-circle shape-${i + 1}`}></div>
                    ))}

                    <div className="left-content">
                        <div className="branding-group">
                            <h1 className="reveal-text">MCQS</h1>
                            <div className="main-names animate-stagger" style={{ animationDelay: '0.2s' }}>
                                <span>MICHAEL</span>
                                <span>CESAR</span>
                                <span>QUISPE</span>
                                <span>SEBASTIAN</span>
                            </div>
                        </div>
                        <div className="slogan-group">
                            <h3 className="animate-stagger" style={{ animationDelay: '0.4s' }}>ANTICIPAR ES GANAR</h3>
                            <p className="animate-stagger" style={{ animationDelay: '0.6s' }}>CUMPLIR ES CRECER</p>
                        </div>
                    </div>
                </div>

                <div className="right-panel">
                    <div className="form-wrapper">
                        <h2 className="form-title animate-stagger" style={{ animationDelay: '0.6s' }}>Iniciar sesión</h2>
                        <p className="form-subtitle animate-stagger" style={{ animationDelay: '0.7s' }}>
                            Bienvenido de nuevo, por favor ingrese sus credenciales de acceso.
                        </p>

                        <form id="loginForm" onSubmit={handleSubmit} className={error ? 'shake' : ''}>
                            <div className="input-group animate-stagger" style={{ animationDelay: '0.8s' }}>
                                <div className="icon-wrapper">
                                    <svg fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    id="username"
                                    placeholder=" "
                                    required
                                    value={credentials.username}
                                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                                />
                                <label htmlFor="username">Usuario</label>
                            </div>

                            <div className="input-group animate-stagger" style={{ animationDelay: '0.9s' }}>
                                <div className="icon-wrapper">
                                    <svg fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path>
                                    </svg>
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    placeholder=" "
                                    required
                                    value={credentials.password}
                                    onChange={(e) => setCredentials({ ...credentials, username: credentials.username, password: e.target.value })}
                                />
                                <label htmlFor="password">Contraseña</label>
                                <button
                                    type="button"
                                    className="btn-show"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                          <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M17.5 19L19 21" />
                                          <path d="M12 20V23" />
                                          <path d="M6.5 19L5 21" />
                                          <path d="M2 12S5 17 12 17S22 12 22 12" />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            {error && (
                                <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center', fontWeight: '600' }}>
                                    {error}
                                </p>
                            )}

                            <div className="form-options animate-stagger" style={{ animationDelay: '1.0s' }}>
                                <label className="remember-me">
                                    <input type="checkbox" />
                                    <span className="custom-checkbox"></span>
                                    <span className="label-text">Recordarme</span>
                                </label>
                                <a href="#" className="forgot-pwd underline-anim">¿Olvidó su contraseña?</a>
                            </div>

                            <div className="button-magnetic-area">
                                <button
                                    type="submit"
                                    className="btn-primary animate-stagger btn-magnetic"
                                    id="submitBtn"
                                    ref={submitBtnRef}
                                    disabled={loading}
                                    style={{ animationDelay: '1.1s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                                >
                                    {loading ? (
                                        <div className="snowflake-loader"></div>
                                    ) : (
                                        'Ingresar'
                                    )}
                                </button>
                            </div>

                            <div className="security-notice animate-stagger" style={{ animationDelay: '1.2s' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '-3px', marginRight: '6px' }}>
                                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                                Sistema de uso exclusivo para personal autorizado de MCQS
                            </div>
                        </form>
                    </div>
                </div>
            </main>

            {/* FOREGROUND WEATHER LAYER */}
            {season === 'winter' && <div className="snow-fg"></div>}
            {season === 'autumn' && <div className="leaf-fg"></div>}
            {season === 'summer' && <div className="summer-fg-fx"></div>}
        </div>
    );
}
