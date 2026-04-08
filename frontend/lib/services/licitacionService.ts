import api from '../api';
import type { Licitacion, SearchFilters } from '@/types/licitacion';

const searchCache = new Map<string, { timestamp: number, data: any }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export const licitacionService = {
    // Get paginated licitaciones with filters
    getAll: async (page: number, limit: number, filters: SearchFilters = {}) => {
        const params: any = {
            page,
            limit,
            ...filters
        };

        // Remove empty filters
        Object.keys(params).forEach(key =>
            (params[key] === undefined || params[key] === '' || params[key] === null) && delete params[key]
        );

        // Check cache before fetching
        const cacheKey = JSON.stringify(params);
        const cached = searchCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
            return cached.data;
        }

        // Add Timestamp to prevent axios/browser caching
        params._t = new Date().getTime();

        const response = await api.get('/api/licitaciones', { params });
        
        // Save to cache
        searchCache.set(cacheKey, { timestamp: Date.now(), data: response.data });
        return response.data;
    },

    // Get filter options
    getFilters: async (filters: SearchFilters = {}) => {
        const params: any = { ...filters };
        const response = await api.get('/api/licitaciones/filters/all', { params });
        return response.data;
    },

    // Get Autocomplete Suggestions
    getAutocomplete: async (query: string) => {
        const response = await api.get('/api/licitaciones/suggestions', {
            params: { query }
        });
        return response.data;
    },

    // Get cascading locations
    getLocations: async (departamento: string, provincia?: string) => {
        const params: any = {};
        if (departamento) params.departamento = departamento;
        if (provincia) params.provincia = provincia;

        const response = await api.get('/api/licitaciones/locations', { params });
        return response.data;
    },

    // Get single licitacion details
    getById: async (id: string) => {
        const safeId = encodeURIComponent(encodeURIComponent(id));
        const response = await api.get(`/api/licitaciones/${safeId}`, {
            params: { _t: new Date().getTime() }
        });
        return response.data;
    },

    // Create new licitacion
    create: async (data: Partial<Licitacion>) => {
        const response = await api.post('/api/licitaciones', data);
        return response.data;
    },

    // Update existing licitacion
    update: async (id: string, data: Partial<Licitacion>) => {
        const safeId = encodeURIComponent(encodeURIComponent(id));
        const response = await api.put(`/api/licitaciones/${safeId}`, data);
        return response.data;
    },

    // Delete licitacion
    delete: async (id: string, pin: string) => {
        const safeId = encodeURIComponent(encodeURIComponent(id));
        const response = await api.delete(`/api/licitaciones/${safeId}?pin=${pin}`);
        return response.data;
    },

    // Update Adjudicacion Oferta
    updateOferta: async (id_adjudicacion: string, url_pdf_oferta: string) => {
        const response = await api.put(`/api/licitaciones/adjudicaciones/${id_adjudicacion}/oferta`, { url_pdf_oferta });
        return response.data;
    },

    // Upload Oferta File
    uploadOfertaFile: async (id_adjudicacion: string, file: File, onProgress?: (pct: number) => void) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(
            `/api/licitaciones/adjudicaciones/${id_adjudicacion}/oferta_upload`,
            formData,
            {
                timeout: 0, // No timeout for large file uploads
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: onProgress ? (progressEvent: any) => {
                    const pct = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                    onProgress(pct);
                } : undefined,
            }
        );
        return response.data;
    },

    // Upload Fianza Document (fiel_cumplimiento | adelanto_materiales | adelanto_directo | doc_completo)
    uploadFianzaFile: async (id_adjudicacion: string, field: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(
            `/api/licitaciones/adjudicaciones/${id_adjudicacion}/fianza_upload/${field}`,
            formData,
            {
                timeout: 0,
                headers: { 'Content-Type': 'multipart/form-data' },
            }
        );
        return response.data;
    },

    // Update (clear) Fianza Document
    updateFianza: async (id_adjudicacion: string, field: string, url: string) => {
        const response = await api.put(
            `/api/licitaciones/adjudicaciones/${id_adjudicacion}/fianza/${field}`,
            { url }
        );
        return response.data;
    },

    // Export Data (PDF/Excel/CSV)
    exportData: async (format: 'pdf' | 'excel' | 'csv', ids: string[], allMatches: boolean, filters: SearchFilters = {}) => {
        const response = await api.post('/api/export', {
            format,
            ids,
            all_matches: allMatches,
            filters
        }, {
            responseType: 'blob' // Important for file download
        });

        // Trigger download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;

        // Try to get filename from headers if possible
        const contentDisposition = response.headers['content-disposition'];
        let filename = `reporte_seace.${format === 'excel' ? 'xlsx' : format}`;
        if (contentDisposition) {
            const match = contentDisposition.match(/filename=(.+)/);
            if (match && match[1]) filename = match[1];
        }

        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    // SUNAT RUC Consultation
    consultarSunatRuc: async (ruc: string, refresh: boolean = false) => {
        const response = await api.get(`/api/integraciones/sunat/ruc/${ruc}`, {
            params: { refresh, _t: new Date().getTime() }
        });
        return response.data;
    },

    // SUNAT Search by Company Name
    buscarSunatNombre: async (nombre: string) => {
        const response = await api.get('/api/integraciones/sunat/buscar', {
            params: { nombre, _t: new Date().getTime() }
        });
        return response.data;
    }
};

export default licitacionService;
