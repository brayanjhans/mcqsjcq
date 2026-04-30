'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Mail, Briefcase, Camera, Key, Lock, Shield, Smartphone, PenLine, ChevronRight, Save, X, MoreVertical, Trash2, Edit, ShieldAlert, Plus, Search, Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { HeaderActions } from '@/components/layout/header-actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PinVerificationModal } from '@/components/admin/pin-verification-modal';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { api } from '@/lib/api';

import { useAuthProtection } from '@/hooks/use-auth-protection';

export default function ProfilePage() {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading } = useAuthProtection();

    const [user, setUser] = useState<any>(null);
    const [activeSection, setActiveSection] = useState<'info' | 'security' | 'admin'>('info');
    const [loading, setLoading] = useState(true);
    const [showDeleteAvatarModal, setShowDeleteAvatarModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isAuthenticated) return;
        // Load user from local storage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, [isAuthenticated]);

    if (authLoading || !isAuthenticated) return null;

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/api/users/me/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const updatedUser = { ...user, avatar_url: res.data.url };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            window.dispatchEvent(new Event('userUpdated'));
        } catch (error) {
            console.error('Error uploading avatar:', error);
        }
    };

    const handleDeleteAvatarClick = () => {
        setShowDeleteAvatarModal(true);
    };

    const confirmDeleteAvatar = async () => {
        try {
            await api.delete('/api/users/me/avatar');
            const updatedUser = { ...user, avatar_url: null };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            window.dispatchEvent(new Event('userUpdated'));
            setShowDeleteAvatarModal(false);
        } catch (error) {
            console.error('Error deleting avatar:', error);
        }
    };

    if (loading) return null;

    const isAdminOrDirector = ['admin', 'director', 'DIRECTOR', 'ADMIN'].includes(user?.role);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b122b] pb-20 transition-colors duration-300">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#0F2C4A] via-[#133657] to-[#0F2C4A] h-72 relative">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20"></div>
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(96, 165, 250, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)' }}></div>
                <div className="container mx-auto px-6 h-full flex items-center justify-between relative z-30">
                    <div className="mt-[-1rem]">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors font-medium text-sm group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Volver
                        </button>
                        <h1 className="text-4xl font-extrabold text-white mb-3 tracking-tight drop-shadow-lg">Mi Perfil</h1>

                        <p className="text-blue-100 font-medium text-lg">Gestiona tu información personal y seguridad de la cuenta.</p>
                    </div>
                    <div className="hidden md:block">
                        <HeaderActions />
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 -mt-24 relative z-40">
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                    {/* Sidebar / Profile Card */}
                    <div className="w-full lg:w-[320px] flex-shrink-0">
                        <div className="bg-white dark:bg-[#111c44] rounded-3xl shadow-2xl overflow-hidden border border-slate-200/50 dark:border-white/5 backdrop-blur-sm">
                            <div className="p-8 flex flex-col items-center border-b border-slate-100 dark:border-white/5">
                                <div className="w-36 h-36 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-slate-700 dark:to-slate-600 p-2 shadow-2xl relative group mb-5 ring-4 ring-white dark:ring-slate-800 transition-all duration-300 group-hover:ring-blue-200 dark:group-hover:ring-blue-900/50">
                                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-slate-600 bg-white">
                                        {user?.avatar_url ? (
                                            <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-blue-600 to-cyan-500 text-white text-4xl font-bold">
                                                {user?.nombre?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleAvatarClick}
                                        className="absolute bottom-1 right-1 p-2 bg-blue-600 rounded-full text-white shadow-lg border-2 border-white dark:border-slate-800 hover:bg-blue-700 transition-colors transform hover:scale-105"
                                        title="Cambiar foto"
                                    >
                                        <Camera className="w-4 h-4" />
                                    </button>
                                    {user?.avatar_url && (
                                        <button
                                            onClick={handleDeleteAvatarClick}
                                            className="absolute bottom-1 left-1 p-2 bg-red-600 rounded-full text-white shadow-lg border-2 border-white dark:border-slate-800 hover:bg-red-700 transition-colors transform hover:scale-105"
                                            title="Eliminar foto"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                    />
                                </div>
                            </div>
                            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white text-center mb-2 tracking-tight">{user?.nombre || 'Usuario'}</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 text-center">{user?.email}</p>
                            <div className="flex justify-center w-full mb-2">
                                <span className={cn(
                                    "px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest shadow-sm",
                                    isAdminOrDirector ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                )}>
                                    {user?.role || 'Colaborador'}
                                </span>
                            </div>

                        </div>
                        <div className="p-5">
                            <nav className="space-y-2">
                                <button
                                    onClick={() => setActiveSection('info')}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-semibold text-sm group",
                                        activeSection === 'info'
                                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:translate-x-1"
                                    )}
                                >
                                    <User className={cn("w-5 h-5 transition-transform group-hover:scale-110", activeSection === 'info' ? "text-white" : "")} />
                                    Información Personal
                                    <ChevronRight className={cn("w-4 h-4 ml-auto transition-transform", activeSection === 'info' ? "translate-x-1" : "opacity-40")} />
                                </button>
                                {isAdminOrDirector && (
                                    <button
                                        onClick={() => setActiveSection('security')}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-semibold text-sm group",
                                            activeSection === 'security'
                                                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:translate-x-1"
                                        )}
                                    >
                                        <Shield className={cn("w-5 h-5 transition-transform group-hover:scale-110", activeSection === 'security' ? "text-white" : "")} />
                                        Seguridad y Contraseña
                                        <ChevronRight className={cn("w-4 h-4 ml-auto transition-transform", activeSection === 'security' ? "translate-x-1" : "opacity-40")} />
                                    </button>
                                )}

                                {isAdminOrDirector && (
                                    <button
                                        onClick={() => setActiveSection('admin')}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-semibold text-sm mt-4 border-t border-slate-100 dark:border-white/5 pt-5 group",
                                            activeSection === 'admin'
                                                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:translate-x-1"
                                        )}
                                    >
                                        <ShieldAlert className={cn("w-5 h-5 transition-transform group-hover:scale-110", activeSection === 'admin' ? "text-white" : "")} />
                                        Administración
                                        <ChevronRight className={cn("w-4 h-4 ml-auto transition-transform", activeSection === 'admin' ? "translate-x-1" : "opacity-40")} />
                                    </button>
                                )}
                            </nav>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 relative z-20">
                        <div className="bg-white dark:bg-[#111c44] rounded-3xl shadow-2xl border border-slate-200/50 dark:border-white/5 p-8 md:p-10 min-h-[500px] max-h-[85vh] overflow-y-auto backdrop-blur-sm">
                            {activeSection === 'info' && <PersonalInfoForm user={user} setUser={setUser} />}
                            {activeSection === 'security' && isAdminOrDirector && <SecuritySettings />}
                            {activeSection === 'admin' && isAdminOrDirector && <UserManagement currentUser={user} />}
                        </div>
                    </div>
                </div>
            </div>
            {
                showDeleteAvatarModal && (
                    <DeleteAvatarModal
                        isOpen={showDeleteAvatarModal}
                        onClose={() => setShowDeleteAvatarModal(false)}
                        onConfirm={confirmDeleteAvatar}
                    />
                )
            }
        </div >
    );
}

function PersonalInfoForm({ user, setUser }: any) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        nombre: user?.nombre || '',
        email: user?.email || '',
        job_title: user?.job_title || '',
        username: user?.username || '',
        phone: user?.phone || ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e: any) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const response = await api.put('/api/users/me', {
                nombre: formData.nombre,
                email: formData.email,
                job_title: formData.job_title,
                // username not editable?
                // phone not in API?
            });
            const newUser = { ...user, ...response.data };
            localStorage.setItem('user', JSON.stringify(newUser));
            setUser(newUser);
            window.dispatchEvent(new Event('userUpdated'));
            setSuccess('Información actualizada correctamente');
            setTimeout(() => {
                setSuccess('');
                setIsEditing(false);
            }, 1000);
        } catch (err: any) {
            console.error('Error saving profile', err);
            let errorMsg = 'Error al guardar los cambios';
            if (err.response?.data?.detail) {
                if (typeof err.response.data.detail === 'string') {
                    errorMsg = err.response.data.detail;
                } else if (Array.isArray(err.response.data.detail)) {
                    errorMsg = err.response.data.detail.map((e: any) => e.msg).join(', ');
                } else {
                    errorMsg = JSON.stringify(err.response.data.detail);
                }
            }
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100 dark:border-white/5">
                <div>
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Información Personal</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Actualiza tus datos de contacto y perfil público.</p>
                </div>
                {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} variant="outline" className="gap-2 rounded-xl border-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">
                        <PenLine className="w-4 h-4" /> Editar
                    </Button>
                ) : (
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => setIsEditing(false)} className="rounded-xl hover:bg-slate-100 dark:hover:bg-white/5" disabled={loading}>Cancelar</Button>
                        <Button onClick={handleSave} className="gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg shadow-blue-500/30 transition-all" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>
                )}
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm mb-6 flex items-start gap-3">
                    <X className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}
            {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 text-green-700 dark:text-green-400 p-4 rounded-xl text-sm mb-6 flex items-start gap-3">
                    <Save className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <span>{success}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Nombre Completo</label>
                    <div className="relative group">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 transition-colors" />
                        <input
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:border-slate-100 dark:disabled:border-slate-800 disabled:text-slate-600 dark:disabled:text-slate-400 font-medium placeholder:text-slate-400"
                            placeholder="Ingresa tu nombre completo"
                        />
                    </div>
                </div>

                <div className="space-y-2.5">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Nombre de Usuario</label>
                    <div className="relative group">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold w-5 h-5 text-center flex items-center justify-center">@</span>
                        <input
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:border-slate-100 dark:disabled:border-slate-800 disabled:text-slate-600 dark:disabled:text-slate-400 font-medium placeholder:text-slate-400"
                            placeholder="Tu nombre de usuario"
                        />
                    </div>
                </div>

                <div className="space-y-2.5">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Correo Electrónico</label>
                    <div className="relative group">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 transition-colors" />
                        <input
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:border-slate-100 dark:disabled:border-slate-800 disabled:text-slate-600 dark:disabled:text-slate-400 font-medium placeholder:text-slate-400"
                            placeholder="tu@email.com"
                        />
                    </div>
                </div>

                <div className="space-y-2.5">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Cargo / Puesto</label>
                    <div className="relative group">
                        <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 transition-colors" />
                        <input
                            name="job_title"
                            value={formData.job_title}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:border-slate-100 dark:disabled:border-slate-800 disabled:text-slate-600 dark:disabled:text-slate-400 font-medium placeholder:text-slate-400"
                            placeholder="Ej: Analista de Datos"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function SecuritySettings() {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="border-b border-slate-100 dark:border-white/5 pb-6">
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Seguridad de la Cuenta</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gestiona tu contraseña y PIN de acceso para proteger tu cuenta.</p>
            </div>



            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 transition-colors hover:border-blue-500/30 dark:hover:border-blue-500/30">
                <div className="flex items-start gap-6 mb-8">
                    <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm ring-4 ring-white dark:ring-slate-800">
                        <Lock className="w-7 h-7" />
                    </div>
                    <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-xl tracking-tight">Contraseña</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Se recomienda cambiar tu contraseña cada 90 días para mantener tu cuenta segura.</p>
                    </div>
                </div>

                <div className="max-w-2xl">
                    <PasswordChangeForm />
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 transition-colors hover:border-blue-500/30 dark:hover:border-blue-500/30">
                <div className="flex items-start gap-6 mb-8">
                    <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm ring-4 ring-white dark:ring-slate-800">
                        <Smartphone className="w-7 h-7" />
                    </div>
                    <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-xl tracking-tight">PIN de Seguridad</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Código de 6 dígitos requerido para realizar operaciones sensibles.</p>
                    </div>
                </div>

                <div className="max-w-2xl">
                    <PinChangeForm />
                </div>
            </div>
        </div>
    );
}

function UserManagement({ currentUser }: { currentUser: any }) {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showPinModal, setShowPinModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<any>(null);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [resettingPasswordUser, setResettingPasswordUser] = useState<any>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Try fetch from primary users endpoint (directors)
            let response = await api.get('/api/users/');
            setUsers(response.data);
        } catch (error: any) {
            console.error("Failed to fetch from /api/users/", error);
            try {
                // Fallback to auth users endpoint if available/appropriate
                const response = await api.get('/api/auth/users');
                setUsers(response.data);
            } catch (err2) {
                console.error("Failed to fetch users", err2);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(user =>
        (user.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.id_corporativo?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const handleDeleteClick = (user: any) => {
        setUserToDelete(user);
        setShowPinModal(true);
    };

    const handlePinVerify = async (pin: string) => {
        try {
            // Verify PIN
            await api.post('/api/auth/verify-pin', { pin });

            // Delete User
            if (userToDelete) {
                await api.delete(`/api/users/${userToDelete.id}`);
                setUsers(users.filter(u => u.id !== userToDelete.id));
                setUserToDelete(null);
                setShowPinModal(false);
                return true;
            }
        } catch (error: any) {
            console.error("Error verifying PIN or deleting user", error);
            throw new Error(error.response?.data?.detail || "Error de verificación");
        }
        return false;
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-slate-100 dark:border-white/5 pb-6 mb-6">
                <div className="flex-1">
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Administración de Usuarios</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gestiona cuentas, contraseñas y accesos. Requiere privilegios de Admin/Director.</p>
                </div>
                <div className="w-full sm:w-auto flex-shrink-0 z-50">
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white gap-2 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:scale-105 cursor-pointer relative"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Usuario
                    </Button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative group mt-2 z-10">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 transition-colors group-focus-within:text-blue-500" />
                <input
                    type="text"
                    placeholder="Buscar por nombre, correo o ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium text-slate-700 dark:text-slate-200"
                />
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto overflow-y-auto max-h-[480px] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900/50 backdrop-blur-sm min-h-[200px]">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 transition-all">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                            <p className="text-sm font-bold text-blue-600 animate-pulse">Cargando usuarios...</p>
                        </div>
                    </div>
                ) : null}

                <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800 z-10">
                        <tr>
                            <th className="p-5 pl-8">Usuario</th>
                            <th className="p-5">Rol</th>
                            <th className="p-5">Estado</th>
                            <th className="p-5 text-right pr-8">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {filteredUsers.length === 0 && !loading && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500">
                                    No se encontraron usuarios.
                                </td>
                            </tr>
                        )}
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                <td className="p-4 pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 border border-slate-200 dark:border-slate-600 overflow-hidden">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt={user.nombre} className="w-full h-full object-cover" />
                                            ) : (
                                                user.nombre?.charAt(0) || 'U'
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{user.nombre} {user.apellidos || ''}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border",
                                        (user.role || user.perfil) === 'DIRECTOR' || (user.role || user.perfil) === 'admin' ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" :
                                            (user.role || user.perfil) === 'ANALISTA' ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" :
                                                "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                    )}>
                                        {user.role || user.perfil}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "w-2.5 h-2.5 rounded-full animate-pulse",
                                            user.activo ? "bg-green-500" : "bg-red-500"
                                        )}></span>
                                        <span className={cn(
                                            "text-sm font-medium",
                                            user.activo ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                                        )}>
                                            {user.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4 text-right pr-6">
                                    <DropdownMenu.Root>
                                        <DropdownMenu.Trigger asChild>
                                            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-white outline-none ring-offset-2 focus:ring-2 focus:ring-blue-500">
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                        </DropdownMenu.Trigger>
                                        <DropdownMenu.Portal>
                                            <DropdownMenu.Content className="min-w-[180px] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 p-1.5 animate-in zoom-in-95 duration-200 z-50 mr-8">
                                                <DropdownMenu.Item
                                                    onSelect={() => setEditingUser(user)}
                                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer outline-none font-medium transition-colors"
                                                >
                                                    <Edit className="w-4 h-4 text-blue-500" /> Editar información
                                                </DropdownMenu.Item>
                                                <DropdownMenu.Item
                                                    onSelect={() => setResettingPasswordUser(user)}
                                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer outline-none font-medium transition-colors"
                                                >
                                                    <Key className="w-4 h-4 text-amber-500" /> Restablecer clave
                                                </DropdownMenu.Item>
                                                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                                                <DropdownMenu.Item
                                                    onSelect={() => handleDeleteClick(user)}
                                                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg cursor-pointer outline-none font-bold transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" /> Eliminar usuario
                                                </DropdownMenu.Item>
                                            </DropdownMenu.Content>
                                        </DropdownMenu.Portal>
                                    </DropdownMenu.Root>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <PinVerificationModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                onVerify={handlePinVerify}
                title="Confirmar Eliminación"
                description={userToDelete ? `Para eliminar al usuario ${userToDelete.nombre}, ingresa tu PIN de seguridad personal.` : ''}
            />

            {showCreateModal && <CreateUserModal onClose={() => { setShowCreateModal(false); fetchUsers(); }} />}
            {editingUser && <EditUserDialog open={!!editingUser} user={editingUser} onClose={() => { setEditingUser(null); fetchUsers(); }} />}
            {resettingPasswordUser && <ResetPasswordDialog open={!!resettingPasswordUser} user={resettingPasswordUser} onClose={() => setResettingPasswordUser(null)} />}
        </div >
    );
}

function EditUserDialog({ open, user, onClose }: { open: boolean, user: any, onClose: () => void }) {
    const [formData, setFormData] = useState({
        id_corporativo: user.id_corporativo || '',
        nombre: user.nombre || '',
        email: user.email || '',
        perfil: user.perfil || 'COLABORADOR',
        job_title: user.job_title || ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.put(`/api/users/${user.id}`, formData);
            onClose();
        } catch (err: any) {
            console.error(err);
            const detail = err.response?.data?.detail;
            setError(typeof detail === 'string' ? detail : 'Error al actualizar usuario');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-2xl animate-in zoom-in-95 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto custom-scrollbar"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-white/5 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm ring-4 ring-blue-50 dark:ring-blue-900/10">
                            <Edit className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Editar Usuario</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Actualiza los datos del usuario.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors group">
                        <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white transition-colors" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2.5">
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">ID Corporativo</label>
                            <input
                                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                                value={formData.id_corporativo}
                                onChange={e => setFormData({ ...formData, id_corporativo: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2.5">
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Rol</label>
                            <select
                                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all font-medium appearance-none"
                                value={formData.perfil}
                                onChange={e => setFormData({ ...formData, perfil: e.target.value })}
                            >
                                <option value="COLABORADOR">Colaborador</option>
                                <option value="DIRECTOR">Director</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Nombre Completo</label>
                        <input
                            className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                            value={formData.nombre}
                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2.5">
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Email</label>
                            <input
                                type="email"
                                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2.5">
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Cargo</label>
                            <input
                                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                                value={formData.job_title}
                                onChange={e => setFormData({ ...formData, job_title: e.target.value })}
                            />
                        </div>
                    </div>

                    {error && <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/50 flex items-center gap-2 font-medium">
                        <ShieldAlert className="w-4 h-4" /> {error}
                    </div>}

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-white/5">
                        <Button type="button" variant="outline" onClick={onClose} className="rounded-xl border-2 hover:bg-slate-50 dark:hover:bg-slate-700 px-6">Cancelar</Button>
                        <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 px-6">
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );

}

function ResetPasswordDialog({ open, user, onClose }: { open: boolean, user: any, onClose: () => void }) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleReset = async () => {
        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }
        if (newPassword.length < 3) {
            setError('La contraseña es muy corta');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await api.put(`/api/users/${user.id}`, { password: newPassword });
            onClose();
        } catch (e: any) {
            console.error(e);
            const detail = e.response?.data?.detail;
            setError(typeof detail === 'string' ? detail : 'Error al restablecer contraseña');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-md animate-in zoom-in-95 shadow-2xl border border-slate-200 dark:border-slate-700"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm ring-4 ring-blue-50 dark:ring-blue-900/10">
                        <Key className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-extrabold dark:text-white tracking-tight">Restablecer Clave</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Usuario: <span className="font-bold text-slate-700 dark:text-slate-300">{user.nombre}</span></p>
                    </div>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="space-y-2.5">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Nueva Contraseña</label>
                        <input
                            type="password"
                            placeholder="Nueva contraseña"
                            className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Confirmar Contraseña</label>
                        <input
                            type="password"
                            placeholder="Confirmar nueva contraseña"
                            className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />
                    </div>
                </div>

                {error && <div className="text-red-500 text-sm mb-6 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/50 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> {error}
                </div>}

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} className="rounded-xl border-2 hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</Button>
                    <Button onClick={handleReset} disabled={loading} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl shadow-lg shadow-amber-500/20">
                        {loading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
    const [formData, setFormData] = useState({
        id_corporativo: '',
        nombre: '',
        email: '',
        password: '',
        perfil: 'COLABORADOR',
        job_title: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Submit clicked: ", formData);
        setError('');
        setLoading(true);

        // Remove empty optional string fields so Pydantic doesn't fail EmailStr with ""
        const payload = { ...formData };
        if (!payload.email) delete (payload as any).email;
        if (!payload.job_title) delete (payload as any).job_title;

        try {
            console.log("Sending POST to /api/auth/register");
            const res = await api.post('/api/auth/register', payload);
            console.log("Response successful: ", res.data);
            onClose(); // This will trigger fetchUsers
        } catch (err: any) {
            console.error('Error creating user full object:', err);
            console.error('Error response:', err.response);
            console.error('Error data:', err.response?.data);
            const detail = err.response?.data?.detail;
            setError(typeof detail === 'string' ? detail : 'Error al crear el usuario. Revisa la consola.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-2xl animate-in zoom-in-95 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-white/5 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm ring-4 ring-purple-50 dark:ring-purple-900/10">
                            <Plus className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Nuevo Usuario</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Crea una nueva cuenta de acceso al sistema.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors group"
                    >
                        <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white transition-colors" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2.5">
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">
                                ID Corporativo *
                            </label>
                            <input
                                type="text"
                                required
                                minLength={3}
                                maxLength={50}
                                value={formData.id_corporativo}
                                onChange={(e) => setFormData({ ...formData, id_corporativo: e.target.value })}
                                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all placeholder:text-slate-400 font-medium"
                                placeholder="admin, diana, etc."
                            />
                        </div>
                        <div className="space-y-2.5">
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">
                                Rol / Perfil *
                            </label>
                            <select
                                required
                                value={formData.perfil}
                                onChange={(e) => setFormData({ ...formData, perfil: e.target.value })}
                                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium appearance-none"
                            >
                                <option value="COLABORADOR">Colaborador</option>
                                <option value="DIRECTOR">Director</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">
                            Nombre completo *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all placeholder:text-slate-400 font-medium"
                            placeholder="Juan Pérez"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2.5">
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">
                                Correo electrónico
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all placeholder:text-slate-400 font-medium"
                                placeholder="usuario@mqs.com"
                            />
                        </div>
                        <div className="space-y-2.5">
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">
                                Cargo
                            </label>
                            <input
                                type="text"
                                value={formData.job_title}
                                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all placeholder:text-slate-400 font-medium"
                                placeholder="Analista, Director, etc."
                            />
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">
                            Contraseña *
                        </label>
                        <input
                            type="password"
                            required
                            minLength={3}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all placeholder:text-slate-400 font-medium"
                            placeholder="Contraseña temporal"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-700 dark:text-red-400 px-4 py-4 rounded-xl text-sm flex items-center gap-3 font-medium">
                            <ShieldAlert className="w-5 h-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-white/5">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="rounded-xl border-2 hover:bg-slate-50 dark:hover:bg-slate-700 px-6"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-xl shadow-lg shadow-purple-500/20 px-6 gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? 'Creando...' : 'Crear Usuario'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );

}

function PasswordChangeForm() {
    const [passData, setPassData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handlePasswordChange = async () => {
        if (passData.new_password !== passData.confirm_password) {
            setMessage({ type: 'error', text: 'Las nuevas contraseñas no coinciden' });
            return;
        }
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            await api.put('/api/users/me/password', passData);
            setMessage({ type: 'success', text: 'Contraseña actualizada correctamente' });
            setPassData({ current_password: '', new_password: '', confirm_password: '' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.detail || 'Error al actualizar contraseña' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {message.text && (
                <div className={`p-4 rounded-xl text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 border ${message.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-100 dark:border-red-900/50' : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-100 dark:border-green-900/50'}`}>
                    {message.type === 'error' ? <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" /> : <Shield className="w-5 h-5 shrink-0 mt-0.5" />}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            <div className="space-y-5">
                <div className="space-y-2.5">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Contraseña Actual</label>
                    <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 transition-colors" />
                        <input
                            type="password"
                            placeholder="Ingresa tu contraseña actual"
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                            value={passData.current_password}
                            onChange={(e) => setPassData({ ...passData, current_password: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2.5">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Nueva Contraseña</label>
                        <div className="relative group">
                            <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 transition-colors" />
                            <input
                                type="password"
                                placeholder="Nueva contraseña"
                                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                                value={passData.new_password}
                                onChange={(e) => setPassData({ ...passData, new_password: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Confirmar Contraseña</label>
                        <div className="relative group">
                            <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 transition-colors" />
                            <input
                                type="password"
                                placeholder="Repite la nueva contraseña"
                                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                                value={passData.confirm_password}
                                onChange={(e) => setPassData({ ...passData, confirm_password: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <Button
                onClick={handlePasswordChange}
                disabled={loading}
                className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-bold px-8 py-6 shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
                {loading ? <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Actualizando...</div> : 'Actualizar Contraseña'}
            </Button>
        </div>
    );
}

function PinChangeForm() {
    const [pinData, setPinData] = useState({
        current_pin: '',
        new_pin: '',
        confirm_pin: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handlePinChange = async () => {
        if (pinData.new_pin !== pinData.confirm_pin) {
            setMessage({ type: 'error', text: 'Los nuevos PINs no coinciden' });
            return;
        }
        if (pinData.new_pin.length !== 6 || !/^\d+$/.test(pinData.new_pin)) {
            setMessage({ type: 'error', text: 'El PIN debe ser de 6 dígitos numéricos' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            await api.put('/api/users/me/pin', pinData);
            setMessage({ type: 'success', text: 'PIN actualizado correctamente' });
            setPinData({ current_pin: '', new_pin: '', confirm_pin: '' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.detail || 'Error al actualizar PIN' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {message.text && (
                <div className={`p-4 rounded-xl text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 border ${message.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-100 dark:border-red-900/50' : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-100 dark:border-green-900/50'}`}>
                    {message.type === 'error' ? <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" /> : <Shield className="w-5 h-5 shrink-0 mt-0.5" />}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            <div className="space-y-5">
                <div className="space-y-2.5">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">PIN Actual</label>
                    <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 transition-colors" />
                        <input
                            type="password"
                            placeholder="• • • • • •"
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all placeholder:text-slate-400 tracking-[0.5em] text-center font-mono text-lg"
                            maxLength={6}
                            value={pinData.current_pin}
                            onChange={(e) => setPinData({ ...pinData, current_pin: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2.5">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Nuevo PIN</label>
                        <div className="relative group">
                            <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 transition-colors" />
                            <input
                                type="password"
                                placeholder="• • • • • •"
                                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all placeholder:text-slate-400 tracking-[0.5em] text-center font-mono text-lg"
                                maxLength={6}
                                value={pinData.new_pin}
                                onChange={(e) => setPinData({ ...pinData, new_pin: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Confirmar PIN</label>
                        <div className="relative group">
                            <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 transition-colors" />
                            <input
                                type="password"
                                placeholder="• • • • • •"
                                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all placeholder:text-slate-400 tracking-[0.5em] text-center font-mono text-lg"
                                maxLength={6}
                                value={pinData.confirm_pin}
                                onChange={(e) => setPinData({ ...pinData, confirm_pin: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <Button
                onClick={handlePinChange}
                disabled={loading}
                className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-bold px-8 py-6 shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
                {loading ? <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Actualizando...</div> : 'Actualizar PIN'}
            </Button>
        </div>
    );
}

function DeleteAvatarModal({ isOpen, onClose, onConfirm }: any) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 dark:border-slate-700 scale-100 animate-in zoom-in-95 duration-200">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        ¿Eliminar foto?
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">
                        ¿Estás seguro de que quieres eliminar tu foto de perfil actual? Esta acción no se puede deshacer.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all transform hover:scale-[1.02] font-medium"
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
}
