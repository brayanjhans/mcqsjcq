// Core entities matching backend schemas

export interface Licitacion {
    id_convocatoria: number
    ocid: string | null
    cui: string | null
    nomenclatura: string | null
    descripcion: string | null
    comprador: string | null
    categoria: string | null
    tipo_procedimiento: string | null
    monto_estimado: number | null
    moneda: string | null
    fecha_publicacion: string | null
    estado_proceso: string | null
    ubicacion_completa: string | null
    departamento: string | null
    provincia: string | null
    distrito: string | null
    archivo_origen: string | null
    last_update: string | null
}

export interface Adjudicacion {
    id_adjudicacion: number
    id_contrato: string | null
    id_convocatoria: number
    ganador_nombre: string | null
    ganador_ruc: string | null
    monto_adjudicado: number | null
    fecha_adjudicacion: string | null
    estado_item: string | null
    entidad_financiera: string | null
    consorcios: Consorcio[]
}

export interface Consorcio {
    id_detalle: number
    id_contrato: string | null
    ruc_miembro: string | null
    nombre_miembro: string | null
    porcentaje_participacion: number | null
    fecha_registro: string | null
}

export interface LicitacionDetalle extends Licitacion {
    adjudicacion: Adjudicacion | null
}

export interface LicitacionList {
    id_convocatoria: number
    nomenclatura: string | null
    comprador: string | null
    monto_estimado: number | null
    fecha_publicacion: string | null
    estado_proceso: string | null
}

// Dashboard types

export interface TopItem {
    nombre: string
    total: number
}

export interface DashboardKPIs {
    monto_total_adjudicado: number
    total_licitaciones: number
    top_bancos: TopItem[]
    top_entidades: TopItem[]
}

// API response types

export interface PaginatedResponse<T> {
    items: T[]
    total: number
    page: number
    limit: number
    total_pages: number
}

// Filter types

export interface LicitacionesFilters {
    page?: number
    limit?: number
    ruc_ganador?: string
    entidad_financiera?: string
    fecha_desde?: string
    fecha_hasta?: string
    search?: string
}

// Bank types for badge component

export type BankName =
    | 'SCOTIABANK'
    | 'BCP'
    | 'BBVA'
    | 'INTERBANK'
    | 'FOGAPI'
    | 'SECREX'
    | null

export interface BankBadgeProps {
    bank: string | null
    className?: string
}

// Status types

export type EstadoProceso =
    | 'Adjudicado'
    | 'Desierto'
    | 'Convocado'
    | 'Cancelado'
    | string

export interface StatusBadgeProps {
    status: string | null
    className?: string
}
