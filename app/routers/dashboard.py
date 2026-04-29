"""
Dashboard endpoints for KPIs and analytics.
Enhanced version with filters and additional data for executive dashboard.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_
from app.database import get_db
from app.models.seace import LicitacionesCabecera, LicitacionesAdjudicaciones
from app.schemas import DashboardKPIsSchema, TopItemSchema
from decimal import Decimal
from typing import Optional, List
from datetime import datetime, date, timedelta

from cachetools import cached, LRUCache
from cachetools.keys import hashkey

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

# --- Cache Configuration (6 AM / 6 PM Windows) ---
def get_dashboard_cache_key(*args, **kwargs):
    # Ignorar la sesión de base de datos para no afectar el hash
    filtered_kwargs = {k: v for k, v in kwargs.items() if k != 'db'}
    # Determinar la franja horaria (Día: 6:00 a 17:59, Noche: 18:00 a 05:59)
    now = datetime.now()
    if 6 <= now.hour < 18:
        window = f"{now.date()}_day"
    else:
        d = now.date() if now.hour >= 18 else (now.date() - timedelta(days=1))
        window = f"{d}_night"
    return hashkey(window, *args, **filtered_kwargs)

kpis_cache = LRUCache(maxsize=128)
trend_cache = LRUCache(maxsize=128)
dist_cache = LRUCache(maxsize=128)
status_cache = LRUCache(maxsize=128)
dept_cache = LRUCache(maxsize=128)
fin_cache = LRUCache(maxsize=128)

# --- Helper Functions (Cached) ---

@cached(cache=kpis_cache, key=get_dashboard_cache_key)
def _get_kpis_data(estado, aseguradora, tipo_entidad, objeto, db):
    cabecera_query = db.query(LicitacionesCabecera)
    adjudicacion_query = db.query(LicitacionesAdjudicaciones)
    
    if estado:
        cabecera_query = cabecera_query.filter(LicitacionesCabecera.estado_proceso == estado)
    if tipo_entidad:
        cabecera_query = cabecera_query.filter(LicitacionesCabecera.tipo_procedimiento == tipo_entidad)
    if objeto:
        cabecera_query = cabecera_query.filter(LicitacionesCabecera.categoria == objeto)
    
    if aseguradora:
        adjudicacion_query = adjudicacion_query.filter(LicitacionesAdjudicaciones.entidad_financiera == aseguradora)
    
    if estado or tipo_entidad or objeto:
        adjudicacion_query = adjudicacion_query.join(
            LicitacionesCabecera,
            LicitacionesAdjudicaciones.id_convocatoria == LicitacionesCabecera.id_convocatoria
        )
        if estado:
            adjudicacion_query = adjudicacion_query.filter(LicitacionesCabecera.estado_proceso == estado)
        if tipo_entidad:
            adjudicacion_query = adjudicacion_query.filter(LicitacionesCabecera.tipo_procedimiento == tipo_entidad)
        if objeto:
            adjudicacion_query = adjudicacion_query.filter(LicitacionesCabecera.categoria == objeto)
    
    monto_total = adjudicacion_query.with_entities(
        func.coalesce(func.sum(LicitacionesAdjudicaciones.monto_adjudicado), 0)
    ).scalar()
    
    total_licitaciones = cabecera_query.count()
    
    top_bancos_query = adjudicacion_query.with_entities(
        LicitacionesAdjudicaciones.entidad_financiera.label("nombre"),
        func.count(LicitacionesAdjudicaciones.id_adjudicacion).label("total")
    ).filter(
        LicitacionesAdjudicaciones.entidad_financiera.isnot(None),
        LicitacionesAdjudicaciones.entidad_financiera != ""
    ).group_by(
        LicitacionesAdjudicaciones.entidad_financiera
    ).order_by(
        func.count(LicitacionesAdjudicaciones.id_adjudicacion).desc()
    ).limit(5).all()
    
    top_bancos = [TopItemSchema(nombre=row.nombre, total=row.total) for row in top_bancos_query]
    
    top_entidades_query = cabecera_query.with_entities(
        LicitacionesCabecera.comprador.label("nombre"),
        func.count(LicitacionesCabecera.id_convocatoria).label("total")
    ).filter(
        LicitacionesCabecera.comprador.isnot(None),
        LicitacionesCabecera.comprador != ""
    ).group_by(
        LicitacionesCabecera.comprador
    ).order_by(
        func.count(LicitacionesCabecera.id_convocatoria).desc()
    ).limit(5).all()
    
    top_entidades = [TopItemSchema(nombre=row.nombre, total=row.total) for row in top_entidades_query]
    
    return DashboardKPIsSchema(
        monto_total_adjudicado=Decimal(str(monto_total)) if monto_total else Decimal('0'),
        total_licitaciones=total_licitaciones or 0,
        top_bancos=top_bancos,
        top_entidades=top_entidades
    )


@cached(cache=trend_cache, key=get_dashboard_cache_key)
def _get_monthly_trend_data(current_year, db):
    monthly_data = db.query(
        extract('month', LicitacionesAdjudicaciones.fecha_adjudicacion).label('month'),
        func.sum(LicitacionesAdjudicaciones.monto_adjudicado).label('total')
    ).join(
        LicitacionesCabecera,
        LicitacionesAdjudicaciones.id_convocatoria == LicitacionesCabecera.id_convocatoria
    ).filter(
        extract('year', LicitacionesAdjudicaciones.fecha_adjudicacion) == current_year
    ).group_by(
        extract('month', LicitacionesAdjudicaciones.fecha_adjudicacion)
    ).order_by(
        extract('month', LicitacionesAdjudicaciones.fecha_adjudicacion)
    ).all()
    
    months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    result = []
    
    for month_num, total in monthly_data:
        result.append({
            'month': months[int(month_num) - 1],
            'total': float(total) if total else 0
        })
    
    return {
        'year': current_year,
        'data': result
    }


@cached(cache=dist_cache, key=get_dashboard_cache_key)
def _get_distribution_data(db):
    distribution = db.query(
        LicitacionesCabecera.categoria.label('type'),
        func.sum(LicitacionesAdjudicaciones.monto_adjudicado).label('total')
    ).join(
        LicitacionesAdjudicaciones,
        LicitacionesCabecera.id_convocatoria == LicitacionesAdjudicaciones.id_convocatoria
    ).filter(
        LicitacionesCabecera.categoria.isnot(None),
        LicitacionesCabecera.categoria != ""
    ).group_by(
        LicitacionesCabecera.categoria
    ).order_by(
        func.sum(LicitacionesAdjudicaciones.monto_adjudicado).desc()
    ).limit(10).all()
    
    result = []
    for type_name, total in distribution:
        result.append({
            'type': type_name,
            'total': float(total) if total else 0
        })
    
    return {'data': result}


@cached(cache=status_cache, key=get_dashboard_cache_key)
def _get_stats_by_status_data(db):
    stats = db.query(
        LicitacionesCabecera.estado_proceso.label('status'),
        func.count(LicitacionesCabecera.id_convocatoria).label('count'),
        func.sum(LicitacionesCabecera.monto_estimado).label('total_estimated')
    ).filter(
        LicitacionesCabecera.estado_proceso.isnot(None),
        LicitacionesCabecera.estado_proceso != ""
    ).group_by(
        LicitacionesCabecera.estado_proceso
    ).all()
    
    result = []
    for status, count, total in stats:
        result.append({
            'status': status,
            'count': count,
            'total': float(total) if total else 0
        })
    
    return {'data': result}


@cached(cache=dept_cache, key=get_dashboard_cache_key)
def _get_department_ranking_data(db):
    ranking = db.query(
        LicitacionesCabecera.departamento.label('name'),
        func.count(LicitacionesCabecera.id_convocatoria).label('count')
    ).filter(
        LicitacionesCabecera.departamento.isnot(None),
        LicitacionesCabecera.departamento != ""
    ).group_by(
        LicitacionesCabecera.departamento
    ).order_by(
        func.count(LicitacionesCabecera.id_convocatoria).desc()
    ).all()
    
    total_licitaciones = sum(r.count for r in ranking)
    
    result = []
    for rank, (name, count) in enumerate(ranking, 1):
        result.append({
            'rank': rank,
            'name': name,
            'count': count,
            'percentage': round((count / total_licitaciones * 100), 1) if total_licitaciones > 0 else 0
        })
    
    return {'data': result}


@cached(cache=fin_cache, key=get_dashboard_cache_key)
def _get_financial_entities_ranking_data(db):
    dept_coverage = db.query(
        LicitacionesAdjudicaciones.entidad_financiera,
        func.count(func.distinct(LicitacionesCabecera.departamento)).label('dept_count')
    ).join(
        LicitacionesCabecera,
        LicitacionesAdjudicaciones.id_convocatoria == LicitacionesCabecera.id_convocatoria
    ).group_by(
        LicitacionesAdjudicaciones.entidad_financiera
    ).subquery()

    ranking = db.query(
        LicitacionesAdjudicaciones.entidad_financiera.label('name'),
        func.count(LicitacionesAdjudicaciones.id_adjudicacion).label('garantias'),
        func.sum(LicitacionesAdjudicaciones.monto_adjudicado).label('monto'),
        dept_coverage.c.dept_count
    ).join(
        dept_coverage,
        LicitacionesAdjudicaciones.entidad_financiera == dept_coverage.c.entidad_financiera
    ).filter(
        LicitacionesAdjudicaciones.entidad_financiera.isnot(None),
        LicitacionesAdjudicaciones.entidad_financiera != ""
    ).group_by(
        LicitacionesAdjudicaciones.entidad_financiera,
        dept_coverage.c.dept_count
    ).order_by(
        func.sum(LicitacionesAdjudicaciones.monto_adjudicado).desc()
    ).limit(40).all()
    
    result = []
    for r in ranking:
        result.append({
            'name': r.name,
            'garantias': r.garantias,
            'monto': float(r.monto) if r.monto else 0,
            'depts': f"{r.dept_count} Depts.",
            'cobertura': "Nacional" if r.dept_count >= 15 else "Regional"
        })
    
    return {'data': result}

# --- Router Endpoints ---

@router.get("/kpis", response_model=DashboardKPIsSchema)
def get_dashboard_kpis(
    estado: Optional[str] = Query(None, description="Filter by estado_proceso"),
    aseguradora: Optional[str] = Query(None, description="Filter by entidad_financiera"),
    tipo_entidad: Optional[str] = Query(None, description="Filter by tipo_procedimiento"),
    objeto: Optional[str] = Query(None, description="Filter by categoria"),
    db: Session = Depends(get_db)
):
    return _get_kpis_data(estado, aseguradora, tipo_entidad, objeto, db=db)


@router.get("/monthly-trend")
def get_monthly_trend(
    year: Optional[int] = Query(None, description="Filter by year"),
    db: Session = Depends(get_db)
):
    current_year = year or datetime.now().year
    return _get_monthly_trend_data(current_year, db=db)


@router.get("/distribution-by-type")
def get_distribution_by_type(db: Session = Depends(get_db)):
    return _get_distribution_data(db=db)


@router.get("/stats-by-status")
def get_stats_by_status(db: Session = Depends(get_db)):
    return _get_stats_by_status_data(db=db)


@router.get("/filter-options")
def get_filter_options(db: Session = Depends(get_db)):
    # Optional: Cache this as well if needed, but usually these are light queries (distinct)
    # Get unique estados
    estados = db.query(LicitacionesCabecera.estado_proceso).distinct().filter(
        LicitacionesCabecera.estado_proceso.isnot(None),
        LicitacionesCabecera.estado_proceso != ""
    ).all()
    
    # Get unique aseguradoras
    aseguradoras = db.query(LicitacionesAdjudicaciones.entidad_financiera).distinct().filter(
        LicitacionesAdjudicaciones.entidad_financiera.isnot(None),
        LicitacionesAdjudicaciones.entidad_financiera != ""
    ).all()
    
    # Get unique tipos de entidad
    tipos = db.query(LicitacionesCabecera.tipo_procedimiento).distinct().filter(
        LicitacionesCabecera.tipo_procedimiento.isnot(None),
        LicitacionesCabecera.tipo_procedimiento != ""
    ).all()
    
    # Get unique categorias (objetos)
    categorias = db.query(LicitacionesCabecera.categoria).distinct().filter(
        LicitacionesCabecera.categoria.isnot(None),
        LicitacionesCabecera.categoria != ""
    ).all()

    # Get unique departamentos
    departamentos = db.query(LicitacionesCabecera.departamento).distinct().filter(
        LicitacionesCabecera.departamento.isnot(None),
        LicitacionesCabecera.departamento != ""
    ).order_by(LicitacionesCabecera.departamento).all()
    
    return {
        'estados': [e[0] for e in estados],
        'aseguradoras': [a[0] for a in aseguradoras],
        'tipos_entidad': [t[0] for t in tipos],
        'objetos': [c[0] for c in categorias],
        'departamentos': [d[0] for d in departamentos]
    }


@router.get("/department-ranking")
def get_department_ranking(db: Session = Depends(get_db)):
    return _get_department_ranking_data(db=db)


@router.get("/financial-entities-ranking")
def get_financial_entities_ranking(db: Session = Depends(get_db)):
    return _get_financial_entities_ranking_data(db=db)
