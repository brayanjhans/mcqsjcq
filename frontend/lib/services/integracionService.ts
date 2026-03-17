import api from '../api';
import type { EjecucionFinanciera, GarantiasResponse } from '@/types/licitacion';

export const integracionService = {
    /**
     * Fetch financial execution data from MEF for a given licitacion.
     * Uses a 200s timeout because the MEF API is notoriously slow.
     */
    getEjecucion: async (idConvocatoria: string): Promise<EjecucionFinanciera> => {
        const response = await api.get(`/api/integraciones/ejecucion/${idConvocatoria}`, {
            timeout: 200_000, // 200s — MEF API can take 180s
        });
        return response.data;
    },

    /**
     * Fetch guarantee data from OCDS for a given licitacion.
     */
    getGarantias: async (idConvocatoria: string): Promise<GarantiasResponse> => {
        const response = await api.get(`/api/integraciones/garantias/${idConvocatoria}`, {
            timeout: 30_000, // 30s for OCDS
        });
        return response.data;
    },

    /**
     * Trigger the MEF data update process (CSV import) in the background.
     */
    triggerMefUpdate: async (): Promise<{ message: string }> => {
        const response = await api.post('/api/integraciones/update-mef');
        return response.data;
    },

    /**
     * Get the last updated timestamp of the MEF data.
     */
    getMefLastUpdated: async (): Promise<{ last_updated: string | null }> => {
        const response = await api.get('/api/integraciones/update-mef/last-updated');
        return response.data;
    },
    /**
     * Fetch cached Infobras data for a given CUI.
     */
    getInfobras: async (cui: string): Promise<{ status: string, data: any }> => {
        const response = await api.get(`/api/integraciones/infobras/${cui}`);
        return response.data;
    },
};

export default integracionService;

