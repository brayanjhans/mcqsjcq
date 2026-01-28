"""
Pydantic schemas for request/response serialization.
"""
from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from decimal import Decimal


class DetalleConsorcioSchema(BaseModel):
    """Consortium member details."""
    id_detalle: int
    id_contrato: Optional[str] = None
    ruc_miembro: Optional[str] = None
    nombre_miembro: Optional[str] = None
    porcentaje_participacion: Optional[Decimal] = None
    fecha_registro: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)



class AdjudicacionSchema(BaseModel):
    """Adjudication/award details."""
    id_adjudicacion: str
    id_contrato: Optional[str] = None
    id_convocatoria: str
    ocid: Optional[str] = None
    ganador_nombre: Optional[str] = None
    ganador_ruc: Optional[str] = None
    monto_adjudicado: Optional[Decimal] = None
    fecha_adjudicacion: Optional[date] = None
    estado_item: Optional[str] = None
    entidad_financiera: Optional[str] = None
    tipo_garantia: Optional[str] = None
    url_documento_contrato: Optional[str] = None
    url_documento_consorcio: Optional[str] = None
    ubicacion_completa: Optional[str] = None
    departamento: Optional[str] = None
    provincia: Optional[str] = None
    distrito: Optional[str] = None
    consorcios: List[DetalleConsorcioSchema] = []

    model_config = ConfigDict(from_attributes=True)



class LicitacionCabeceraSchema(BaseModel):
    """Tender header information."""
    id_convocatoria: str
    ocid: Optional[str] = None
    nomenclatura: Optional[str] = None
    descripcion: Optional[str] = None
    comprador: Optional[str] = None  # entidad_publica
    entidad_ruc: Optional[str] = None  # RUC de la entidad
    categoria: Optional[str] = None
    tipo_procedimiento: Optional[str] = None
    monto_estimado: Optional[Decimal] = None
    moneda: Optional[str] = None
    fecha_publicacion: Optional[date] = None
    fecha_adjudicacion: Optional[date] = None  # Fecha adjudicación cabecera
    estado_proceso: Optional[str] = None
    ubicacion_completa: Optional[str] = None
    departamento: Optional[str] = None
    provincia: Optional[str] = None
    distrito: Optional[str] = None
    archivo_origen: Optional[str] = None
    last_update: Optional[date] = None
    adjudicaciones: List[AdjudicacionSchema] = []


    model_config = ConfigDict(from_attributes=True)


class AdjudicacionCreate(BaseModel):
    """Schema for creating an adjudication."""
    id_adjudicacion: Optional[str] = None  # Permitir ID manual
    id_contrato: Optional[str] = None
    ocid: Optional[str] = None
    ganador_nombre: str
    ganador_ruc: str
    monto_adjudicado: Decimal
    fecha_adjudicacion: date
    estado_item: str = 'ADJUDICADO'
    tipo_garantia: Optional[str] = None
    entidad_financiera: Optional[str] = None
    url_documento_contrato: Optional[str] = None
    url_documento_consorcio: Optional[str] = None
    ubicacion_completa: Optional[str] = None
    departamento: Optional[str] = None
    provincia: Optional[str] = None
    distrito: Optional[str] = None
    consorcios: List[Dict[str, Any]] = []


class LicitacionCreate(BaseModel):
    """Schema for creating a new tender."""
    id_convocatoria: Optional[str] = None  # Permitir ID manual
    nomenclatura: str
    ocid: Optional[str] = None
    descripcion: str
    comprador: str
    entidad_ruc: Optional[str] = None
    categoria: str
    tipo_procedimiento: str = 'Licitación Pública'
    monto_estimado: Decimal
    moneda: str = 'PEN'
    fecha_publicacion: date
    fecha_adjudicacion: Optional[date] = None
    estado_proceso: str = 'CONVOCADO'
    ubicacion_completa: Optional[str] = None
    departamento: Optional[str] = None
    provincia: Optional[str] = None
    distrito: Optional[str] = None
    adjudicaciones: List[AdjudicacionCreate] = []


class LicitacionUpdate(BaseModel):
    """Schema for updating an existing tender."""
    ocid: Optional[str] = None
    nomenclatura: Optional[str] = None
    descripcion: Optional[str] = None
    comprador: Optional[str] = None
    entidad_ruc: Optional[str] = None
    categoria: Optional[str] = None
    tipo_procedimiento: Optional[str] = None
    monto_estimado: Optional[Decimal] = None
    moneda: Optional[str] = None
    fecha_publicacion: Optional[date] = None
    fecha_adjudicacion: Optional[date] = None
    estado_proceso: Optional[str] = None
    ubicacion_completa: Optional[str] = None
    departamento: Optional[str] = None
    provincia: Optional[str] = None
    distrito: Optional[str] = None
    adjudicaciones: Optional[List[AdjudicacionCreate]] = None


class LicitacionListSchema(BaseModel):
    """Simplified tender schema for list view (without nested adjudicaciones)."""
    id_convocatoria: str
    nomenclatura: Optional[str] = None
    comprador: Optional[str] = None
    monto_estimado: Optional[Decimal] = None
    fecha_publicacion: Optional[date] = None
    estado_proceso: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)



class LicitacionDetalleSchema(BaseModel):
    """Complete tender details with adjudication and consortium."""
    id_convocatoria: str
    ocid: Optional[str] = None
    nomenclatura: Optional[str] = None
    descripcion: Optional[str] = None
    comprador: Optional[str] = None
    categoria: Optional[str] = None
    tipo_procedimiento: Optional[str] = None
    monto_estimado: Optional[Decimal] = None
    moneda: Optional[str] = None
    fecha_publicacion: Optional[date] = None
    estado_proceso: Optional[str] = None
    ubicacion_completa: Optional[str] = None
    departamento: Optional[str] = None
    provincia: Optional[str] = None
    distrito: Optional[str] = None
    adjudicacion: Optional[AdjudicacionSchema] = None

    model_config = ConfigDict(from_attributes=True)



class TopItemSchema(BaseModel):
    """Schema for top items (banks, entities)."""
    nombre: str
    total: int


class DashboardKPIsSchema(BaseModel):
    """Dashboard KPIs response."""
    monto_total_adjudicado: Decimal
    total_licitaciones: int
    top_bancos: List[TopItemSchema]
    top_entidades: List[TopItemSchema]


class PaginatedLicitacionesSchema(BaseModel):
    """Paginated list of tenders."""
    items: List[LicitacionListSchema]
    total: int
    page: int
    limit: int
    total_pages: int


# ============================================
# Authentication Schemas
# ============================================

class LoginRequest(BaseModel):
    """Login credentials."""
    id_corporativo: str
    password: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


class PinChange(BaseModel):
    current_pin: str
    new_pin: str
    confirm_pin: str


class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    job_title: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None


class AdminUserUpdate(BaseModel):
    """Schema for admin to update any user."""
    id_corporativo: Optional[str] = None
    password: Optional[str] = None
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    email: Optional[str] = None
    perfil: Optional[str] = None
    activo: Optional[bool] = None


class UserProfile(BaseModel):
    """User profile information."""
    id: int
    id_corporativo: str
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    email: Optional[str] = None
    email_verified: bool = False
    phone_number: Optional[str] = None
    job_title: Optional[str] = None
    avatar_url: Optional[str] = None
    digital_signature_url: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    perfil: Optional[str] = None
    activo: bool
    
    model_config = ConfigDict(from_attributes=True)


class UserSessionSchema(BaseModel):
    id: int
    ip_address: Optional[str]
    user_agent: Optional[str]
    device_type: Optional[str]
    is_active: bool
    last_active: datetime
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class AuditLogSchema(BaseModel):
    id: int
    action: str
    details: Optional[str]
    ip_address: Optional[str]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class LoginResponse(BaseModel):
    """Login response with token and user info."""
    access_token: str
    token_type: str
    user: UserProfile


# ========================================
# Notification Schemas
# ========================================

class NotificationCreate(BaseModel):
    user_id: int
    type: str
    priority: str = 'low'
    title: str
    message: str
    link: Optional[str] = None
    expires_days: Optional[int] = 30

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    priority: str
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime
    expires_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class NotificationList(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    unread_count: int

class UnreadCountResponse(BaseModel):
    count: int
