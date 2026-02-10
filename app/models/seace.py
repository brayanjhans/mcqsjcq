"""
SEACE database models (imported from existing models.py).
"""
from sqlalchemy import Column, Integer, String, Numeric, Date, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class LicitacionesCabecera(Base):
    """Licitaciones header/main table."""
    
    __tablename__ = "licitaciones_cabecera"
    
    id_convocatoria = Column(String(100), primary_key=True, index=True)
    ocid = Column(String(100), index=True)
    nomenclatura = Column(String(4000), index=True)
    descripcion = Column(Text)
    comprador = Column(String(500), index=True)  # Entidad compradora
    entidad_ruc = Column(String(11), index=True)  # RUC de la entidad
    categoria = Column(String(50), index=True)  # Obra/Bien/Servicio
    tipo_procedimiento = Column(String(100), index=True)
    monto_estimado = Column(Numeric(15, 2))
    moneda = Column(String(10))
    fecha_publicacion = Column(Date)
    fecha_adjudicacion = Column(Date)  # Fecha adjudicación a nivel cabecera
    estado_proceso = Column(String(50), index=True)
    ubicacion_completa = Column(String(500))
    departamento = Column(String(100), index=True)
    provincia = Column(String(100))
    distrito = Column(String(100))
    archivo_origen = Column(String(100))
    # fecha_carga column does not exist in DB, removed to fix ORM error
    last_update = Column(DateTime)
    
    # Relationship to adjudicaciones
    adjudicaciones = relationship("LicitacionesAdjudicaciones", back_populates="licitacion")


class LicitacionesAdjudicaciones(Base):
    """Licitaciones adjudications table."""
    
    __tablename__ = "licitaciones_adjudicaciones"
    
    id_adjudicacion = Column(String(100), primary_key=True, index=True)
    id_contrato = Column(String(100), index=True)
    id_convocatoria = Column(String(100), ForeignKey("licitaciones_cabecera.id_convocatoria"), index=True)
    ocid = Column(String(100))
    ganador_nombre = Column(String(500), index=True)
    ganador_ruc = Column(String(50), index=True)
    monto_adjudicado = Column(Numeric(15, 2))
    fecha_adjudicacion = Column(Date, index=True)
    estado_item = Column(String(50))
    entidad_financiera = Column(String(255), index=True)  # Banco garantía
    tipo_garantia = Column(String(50))
    url_pdf_contrato = Column(String(500))
    url_pdf_consorcio = Column(String(500))
    url_pdf_cartafianza = Column(String(500))
    ubicacion_completa = Column(String(500))  # Ubicación específica del item
    departamento = Column(String(100))  # Departamento del item
    provincia = Column(String(100))  # Provincia del item
    distrito = Column(String(100))  # Distrito del item
    fecha_registro = Column(DateTime)
    
    # Relationship back to licitacion
    licitacion = relationship("LicitacionesCabecera", back_populates="adjudicaciones")


class DetalleConsorcios(Base):
    """Consortium members detail table."""
    
    __tablename__ = "detalle_consorcios"
    
    id = Column(Integer, primary_key=True, index=True)
    id_contrato = Column(String(100), index=True)
    ruc_miembro = Column(String(20))
    nombre_miembro = Column(String(500))
    porcentaje_participacion = Column(Numeric(5, 2))
    fecha_registro = Column(DateTime)

