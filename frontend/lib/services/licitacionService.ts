import api from '../api';
import type { Licitacion, SearchFilters } from '@/types/licitacion';

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

        // Add Timestamp to prevent caching
        params._t = new Date().getTime();

        const response = await api.get('/api/licitaciones', { params });
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
        const response = await api.get(`/api/licitaciones/${id}`, {
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
        const response = await api.put(`/api/licitaciones/${id}`, data);
        return response.data;
    },

    // Delete licitacion
    delete: async (id: string, pin: string) => {
        const response = await api.delete(`/api/licitaciones/${id}?pin=${pin}`);
        return response.data;
    },

    // Update Adjudicacion Oferta
    updateOferta: async (id_adjudicacion: string, url_pdf_oferta: string) => {
        const response = await api.put(`/api/licitaciones/adjudicaciones/${id_adjudicacion}/oferta`, { url_pdf_oferta });
        return response.data;
    },

    // Upload Oferta File
    uploadOfertaFile: async (id_adjudicacion: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(
            `/api/licitaciones/adjudicaciones/${id_adjudicacion}/oferta_upload`,
            formData,
            {
                timeout: 0, // No timeout for large file uploads
                headers: { 'Content-Type': 'multipart/form-data' },
            }
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
    }
};

export default licitacionService;
