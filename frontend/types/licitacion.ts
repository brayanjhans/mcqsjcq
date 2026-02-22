export interface Licitacion {
    id_convocatoria: string;
    ocid?: string;
    nomenclatura?: string;
    descripcion: string;
    comprador: string;
    entidad_ruc?: string;
    categoria?: string;
    tipo_procedimiento?: string;
    monto_estimado?: number;
    moneda?: string;
    fecha_publicacion: string;
    estado_proceso?: string;
    ubicacion_completa?: string;
    departamento?: string;
    provincia?: string;
    distrito?: string;

    // Campos para Adjudicaciones / Contratado
    monto_total_adjudicado?: number;
    total_adjudicaciones?: number;
    con_garantia_bancaria?: number;
    entidades_financieras?: string;
    ganador_nombre?: string;
    ganador_ruc?: string;
    tipo_garantia?: string;
    banco?: string;
    fecha_adjudicacion?: string;
    id_contrato?: string;
    adjudicaciones?: Adjudicacion[];

    // Campos para Consorcios
    miembros_consorcio?: MiembroConsorcio[];
    nombres_consorciados?: string;
    rucs_consorciados?: string;
}

export interface MiembroConsorcio {
    nombre_miembro: string;
    ruc_miembro: string;
    porcentaje_participacion: number;
    monto_participacion?: number;
}

export interface Adjudicacion {
    id_adjudicacion: string;
    ganador_nombre: string;
    ganador_ruc: string;
    monto_adjudicado: number;
    fecha_adjudicacion: string;
    entidad_financiera?: string;
    tipo_garantia?: string;
    estado?: string;
    moneda?: string;
    consorcios?: MiembroConsorcio[];
    url_pdf_contrato?: string;
    url_pdf_consorcio?: string;
    url_pdf_cartafianza?: string;
    estado_item?: string;
}

export interface SearchFilters {
    search?: string;
    departamento?: string;
    provincia?: string;
    distrito?: string;
    estado_proceso?: string;
    categoria?: string;
    comprador?: string;
    aseguradora?: string;
    entidad?: string; // Nuevo campo
    year?: string;
    mes?: string;
    tipo_garantia?: string;
    tipo_procedimiento?: string;
}

export type ReportType = 'entidad' | 'departamento' | 'categoria' | 'estado' | 'personalizado';

export interface ReportData {
    nombre: string;
    garantias: number;
    monto: string; // Formatted string 'S/ 1,234.56'
    departamentos?: number;
    categorias?: string; // Comma separated or count
}

// --- Integration API types ---
export interface HistorialAnual {
    year: number;
    pia: number;
    pim: number;
    certificado: number;
    compromiso_anual: number;
    devengado: number;
    girado: number;
    avance_pct: number;
}

export interface EjecucionFinanciera {
    devengado: number;
    girado: number;
    pia: number;
    pim: number;
    certificado: number;
    compromiso_anual: number;
    monto_adjudicado: number;
    porcentaje_girado: number;
    encontrado: boolean;
    error?: string | null;
    ruc_consultado?: string;
    year?: number;
    year_found?: number;
    id_contrato?: string;
    cui?: string | null;
    // Match confidence fields (5.1)
    match_type?: string | null;
    match_score?: number | null;
    matched_name?: string | null;
    source?: string | null;
    // Historical yearly execution (B)
    historial?: HistorialAnual[];
}

export interface GarantiaItem {
    id?: string;
    tipo?: string;
    fecha_vencimiento?: string;
    monto_garantizado?: number;
    moneda?: string;
    estado_semaforo: 'verde' | 'ambar' | 'rojo' | 'gris';
    dias_restantes?: number | null;
    descripcion?: string;
    contrato_id?: string;
}

export interface GarantiasResponse {
    garantias: GarantiaItem[];
    error?: string | null;
    estado_semaforo: 'verde' | 'ambar' | 'rojo' | 'gris';
    entidad_financiera?: string;
    enlace_asbanc?: string;
    url_pdf_cartafianza?: string;
}

