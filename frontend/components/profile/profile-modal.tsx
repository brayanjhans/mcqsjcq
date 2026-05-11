'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, User, Mail, Briefcase, Camera, Key, Lock, Shield, Smartphone, PenLine, Check, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export function ProfileModal({
    open,
    onOpenChange
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'security'>('info');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            const storedUser = sessionStorage.getItem('user_display');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        }
    }, [open]);

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md animate-in fade-in" />
                <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-[60] w-full max-w-md translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-[#0F172A] shadow-2xl rounded-[2rem] overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">

                    {/* Header Image Background */}
                    <div className="h-32 bg-gradient-to-r from-blue-600 to-cyan-500 relative flex-shrink-0">
                        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onOpenChange(false)}
                            className="absolute right-4 top-4 text-white hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Avatar & Content */}
                    <div className="px-6 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                        <div className="flex justify-center -mt-12 mb-6">
                            <div className="w-24 h-24 rounded-full bg-white dark:bg-[#0F172A] p-1.5 shadow-2xl relative group">
                                <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700">
                                    {user?.avatar_url ? (
                                        <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-3xl font-bold text-slate-400">
                                            {user?.nombre?.charAt(0).toUpperCase() || 'U'}
                                        </span>
                                    )}
                                </div>
                                <button className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white shadow-lg border-2 border-white dark:border-[#0F172A] hover:bg-blue-700 transition-colors transform hover:scale-105">
                                    <Camera className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{user?.nombre || 'Usuario'}</h2>
                            <p className="text-blue-600 dark:text-blue-400 text-sm font-medium px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full inline-block">
                                {user?.job_title || 'Sin cargo definido'}
                            </p>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl mb-6">
                            <button
                                onClick={() => setActiveTab('info')}
                                className={cn(
                                    "flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2",
                                    activeTab === 'info'
                                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                )}
                            >
                                <User className="w-4 h-4" />
                                Información
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                className={cn(
                                    "flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2",
                                    activeTab === 'security'
                                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                )}
                            >
                                <Shield className="w-4 h-4" />
                                Seguridad
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="pb-8">
                            {activeTab === 'info' ? (
                                <PersonalInfoTab user={user} setUser={setUser} />
                            ) : (
                                <SecurityTab />
                            )}
                        </div>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

function PersonalInfoTab({ user, setUser }: any) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        nombre: user?.nombre || '',
        email: user?.email || '',
        job_title: user?.job_title || '',
        username: user?.username || ''
    });

    const handleChange = (e: any) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        const newUser = { ...user, ...formData };
        sessionStorage.setItem('user_display', JSON.stringify(newUser));
        setUser(newUser);
        window.dispatchEvent(new Event('userUpdated'));
        setIsEditing(false);
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {isEditing ? (
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block pl-1">Nombre Completo</label>
                        <input name="nombre" value={formData.nombre} onChange={handleChange} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all dark:text-white" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block pl-1">Cargo / Puesto</label>
                        <input name="job_title" value={formData.job_title} onChange={handleChange} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all dark:text-white" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block pl-1">Correo Electrónico</label>
                        <input name="email" value={formData.email} onChange={handleChange} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all dark:text-white" />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setIsEditing(false)}>Cancelar</Button>
                        <Button className="flex-1 rounded-xl h-11 bg-blue-600 hover:bg-blue-700" onClick={handleSave}>Guardar Cambios</Button>
                    </div>
                </div>
            ) : (
                <>
                    <InfoItem icon={Mail} label="Correo Electrónico" value={user?.email} />
                    <InfoItem icon={User} label="Nombre de Usuario" value={`@${user?.username || 'user'}`} />
                    <InfoItem icon={Briefcase} label="Rol del Sistema" value={user?.role || 'Colaborador'} badge={user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'} />

                    <Button
                        variant="outline"
                        className="w-full mt-4 rounded-xl border-dashed border-2 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400 h-12"
                        onClick={() => setIsEditing(true)}
                    >
                        <PenLine className="w-4 h-4 mr-2" />
                        Editar Información
                    </Button>
                </>
            )}
        </div>
    );
}

function SecurityTab() {
    const [viewState, setViewState] = useState<'menu' | 'password' | 'pin'>('menu');

    if (viewState === 'password') return <ChangePasswordForm onBack={() => setViewState('menu')} />;
    if (viewState === 'pin') return <ChangePinForm onBack={() => setViewState('menu')} />;

    return (
        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
            <button
                onClick={() => setViewState('password')}
                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center justify-between group"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Key className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <h4 className="font-semibold text-slate-900 dark:text-white">Contraseña</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Cambiar contraseña de acceso</p>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-600 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors shadow-sm">
                    →
                </div>
            </button>

            <button
                onClick={() => setViewState('pin')}
                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center justify-between group"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <h4 className="font-semibold text-slate-900 dark:text-white">PIN de Seguridad</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Código de 6 dígitos para operaciones</p>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-600 flex items-center justify-center text-slate-400 group-hover:text-purple-600 transition-colors shadow-sm">
                    →
                </div>
            </button>

            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 mt-4">
                <div className="flex gap-3">
                    <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div>
                        <h4 className="text-sm font-bold text-green-800 dark:text-green-400">Cuenta Protegida</h4>
                        <p className="text-xs text-green-600 dark:text-green-500 mt-1">Tu cuenta cumple con los estándares de seguridad.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ChangePasswordForm({ onBack }: { onBack: () => void }) {
    const [loading, setLoading] = useState(false);
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 mb-2 text-slate-400 hover:text-slate-600 cursor-pointer w-fit" onClick={onBack}>
                <span className="text-lg">←</span> <span className="text-sm font-medium">Volver</span>
            </div>
            <h3 className="font-bold text-lg dark:text-white">Cambiar Contraseña</h3>

            <PasswordInput placeholder="Contraseña Actual" />
            <PasswordInput placeholder="Nueva Contraseña" />
            <PasswordInput placeholder="Confirmar Contraseña" />

            <Button className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 mt-2 font-bold" onClick={() => {
                setLoading(true);
                setTimeout(() => { setLoading(false); onBack(); }, 1500);
            }}>
                {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
            </Button>
        </div>
    );
}

function ChangePinForm({ onBack }: { onBack: () => void }) {
    const [loading, setLoading] = useState(false);
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 mb-2 text-slate-400 hover:text-slate-600 cursor-pointer w-fit" onClick={onBack}>
                <span className="text-lg">←</span> <span className="text-sm font-medium">Volver</span>
            </div>
            <h3 className="font-bold text-lg dark:text-white">Cambiar PIN</h3>

            <input type="password" placeholder="PIN Actual (6 dígitos)" maxLength={6} className="w-full tracking-widest text-center text-lg p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-purple-500/20 dark:text-white" />
            <input type="password" placeholder="Nuevo PIN" maxLength={6} className="w-full tracking-widest text-center text-lg p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-purple-500/20 dark:text-white" />

            <Button className="w-full h-12 rounded-xl bg-purple-600 hover:bg-purple-700 mt-2 font-bold" onClick={() => {
                setLoading(true);
                setTimeout(() => { setLoading(false); onBack(); }, 1500);
            }}>
                {loading ? 'Actualizando...' : 'Actualizar PIN'}
            </Button>
        </div>
    );
}

function PasswordInput({ placeholder }: { placeholder: string }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                type={show ? "text" : "password"}
                placeholder={placeholder}
                className="w-full p-3.5 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm dark:text-white"
            />
            <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
            >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        </div>
    );
}

function InfoItem({ icon: Icon, label, value, badge }: any) {
    return (
        <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
            <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg text-slate-400 group-hover:text-blue-500 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{value || 'No definido'}</p>
                    {badge && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${badge}`}>{badge}</span>}
                </div>
            </div>
        </div>
    );
}
