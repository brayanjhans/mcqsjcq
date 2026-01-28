export interface Licitacion {
    id_convocatoria: string;
    ocid?: string;
    nomenclatura?: string;
    descripcion: string;
    comprador: string;
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

    // Campos para Consorcios
    miembros_consorcio?: MiembroConsorcio[];
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
