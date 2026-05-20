'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { SettingsProvider } from '@/contexts/settings-context';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 60 * 1000,  // 5 minutos — datos considerados frescos
                gcTime:    10 * 60 * 1000, // 10 minutos — retener en memoria aunque no activo
                refetchOnWindowFocus: false,
                refetchOnReconnect: false,  // no re-fetch al reconectar wifi
                retry: 1,                   // solo 1 reintento en caso de error
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <SettingsProvider>
                    {children}
                </SettingsProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}
