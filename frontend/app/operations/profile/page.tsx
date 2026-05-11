'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, Users } from 'lucide-react'

import { useAuthProtection } from '@/hooks/use-auth-protection'

export default function ProfileSelectionPage() {
    const { isAuthenticated, loading } = useAuthProtection()
    const router = useRouter()
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        if (isAuthenticated) {
            const userData = sessionStorage.getItem('user_display')
            if (userData) {
                setUser(JSON.parse(userData))
            }
        }
    }, [isAuthenticated])

    const handleProfileClick = (profile: string) => {
        // Store selected profile
        localStorage.setItem('selectedProfile', profile)
        router.push('/dashboard')
    }

    if (!user) return null

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-12 max-w-3xl w-full">
                <div className="text-center space-y-4 mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-wide">
                        PERFIL DE ACCESO
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm tracking-wide">
                        Valide su nivel de autorización
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Director Profile */}
                    <button
                        onClick={() => handleProfileClick('DIRECTOR')}
                        disabled={user.perfil !== 'DIRECTOR'}
                        className={`group ${user.perfil?.toUpperCase() === 'DIRECTOR'
                            ? 'bg-gray-50 dark:bg-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/30 border-2 border-gray-200 dark:border-gray-600 hover:border-purple-500 cursor-pointer'
                            : 'bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 cursor-not-allowed opacity-50'
                            } rounded-lg p-8 transition-all duration-200 hover:shadow-lg`}
                    >
                        <div className="flex flex-col items-center space-y-4">
                            <div className={`p-4 bg-white dark:bg-gray-600 rounded-full ${user.perfil?.toUpperCase() === 'DIRECTOR' ? 'group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50' : ''
                                } transition-colors`}>
                                <Crown className={`w-12 h-12 ${user.perfil?.toUpperCase() === 'DIRECTOR'
                                    ? 'text-gray-600 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400'
                                    : 'text-gray-400 dark:text-gray-500'
                                    }`} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-wide">
                                DIRECTOR
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Acceso Total
                            </p>
                        </div>
                    </button>

                    {/* Collaborator Profile */}
                    <button
                        onClick={() => handleProfileClick('COLABORADOR')}
                        className="group bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 rounded-lg p-8 transition-all duration-200 hover:shadow-lg"
                    >
                        <div className="flex flex-col items-center space-y-4">
                            <div className="p-4 bg-white dark:bg-gray-600 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                                <Users className="w-12 h-12 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-wide">
                                COLABORADOR
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Acceso Operativo
                            </p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    )
}
