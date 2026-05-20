'use client';

import { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: {
        id: number;
        id_corporativo: string;
        nombre: string;
    } | null;
    onSuccess: () => void;
}

export function DeleteUserModal({ isOpen, onClose, user, onSuccess }: DeleteUserModalProps) {
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
        if (!user) return;

        setError('');

        if (confirmText !== user.id_corporativo) {
            setError('El ID Corporativo no coincide');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/users/${user.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Error al eliminar usuario');
            }

            onSuccess();
            handleClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setConfirmText('');
        setError('');
        onClose();
    };

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    disabled={loading}
                >
                    <X size={24} />
                </button>

                {/* Header */}
                <div className="mb-6 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Eliminar Usuario
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Esta acción no se puede deshacer
                        </p>
                    </div>
                </div>

                {/* Warning Message */}
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <p className="text-sm text-red-800 dark:text-red-300 mb-2">
                        <strong>¿Estás seguro?</strong> Vas a eliminar permanentemente al usuario:
                    </p>
                    <div className="mt-3 p-3 bg-white dark:bg-slate-700 rounded-lg">
                        <p className="font-bold text-gray-900 dark:text-white">{user.nombre}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.id_corporativo}</p>
                    </div>
                </div>

                {/* Confirmation Input */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Para confirmar, escribe el ID Corporativo: <strong className="text-red-600 dark:text-red-400">{user.id_corporativo}</strong>
                    </label>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => {
                            setConfirmText(e.target.value);
                            setError('');
                        }}
                        placeholder={user.id_corporativo}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                        disabled={loading}
                    />
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <p className="text-sm text-red-600 dark:text-red-400">
                            {error}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={confirmText !== user.id_corporativo || loading}
                        className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                    >
                        <Trash2 size={20} />
                        {loading ? 'Eliminando...' : 'Eliminar Usuario'}
                    </button>
                </div>
            </div>
        </div>
    );
}
