"""
Tendencias (Trends) analytics endpoints for advanced data visualization.
Provides 8 specialized endpoints for comprehensive trend analysis.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_, case, desc
from app.database import get_db
from app.models.seace import LicitacionesCabecera, LicitacionesAdjudicaciones, DetalleConsorcios
from decimal import Decimal
from typing import Optional, List, Dict, Any
from datetime import datetime, date

router = APIRouter(prefix="/api/tendencias", tags=["Tendencias"])


# ============================================
# 1. KPI SUMMARY CARDS
# ============================================

@router.get("/kpis")
def get_tendencias_kpis(
    objeto_contratacion: Optional[str] = Query(None, description="Filter by categoria (Obra/Bien/Servicio)"),
    tipo_procedimiento: Optional[str] = Query(None, description="Filter by tipo_procedimiento"),
    estado_proceso: Optional[str] = Query(None, description="Filter by estado_proceso"),
    departamento: Optional[str] = Query(None, description="Filter by departamento"),
    banco_garantia: Optional[str] = Query(None, description="Filter by entidad_financiera"),
    db: Session = Depends(get_db)
):
    """
    Get KPI summary cards:
    - Total Adjudicado (sum of monto_adjudicado)
    - Cantidad de Procesos (count of convocatorias)
    - Ahorro Total (monto_estimado - monto_adjudicado)
    """
    
    # Build base query with joins
    query = db.query(
        func.coalesce(func.sum(LicitacionesAdjudicaciones.monto_adjudicado), 0).label('total_adjudicado'),
        func.count(func.distinct(LicitacionesCabecera.id_convocatoria)).label('cantidad_procesos'),
        func.coalesce(func.sum(LicitacionesCabecera.monto_estimado), 0).label('total_estimado')
    ).join(
        LicitacionesAdjudicaciones,
        LicitacionesCabecera.id_convocatoria == LicitacionesAdjudicaciones.id_convocatoria
    )
    
    # Apply filters
    if objeto_contratacion:
        query = query.filter(LicitacionesCabecera.categoria == objeto_contratacion)
    if tipo_procedimiento:
        query = query.filter(LicitacionesCabecera.tipo_procedimiento == tipo_procedimiento)
    if estado_proceso:
        query = query.filter(LicitacionesCabecera.estado_proceso == estado_proceso)
    if departamento:
        query = query.filter(LicitacionesCabecera.departamento == departamento)
    if banco_garantia:
        query = query.filter(LicitacionesAdjudicaciones.entidad_financiera == banco_garantia)
    
    result = query.first()
    
    total_adjudicado = float(result.total_adjudicado) if result.total_adjudicado else 0
    total_estimado = float(result.total_estimado) if result.total_estimado else 0
    ahorro_total = total_estimado - total_adjudicado
    
    return {
        "total_adjudicado": total_adjudicado,
        "cantidad_procesos": result.cantidad_procesos or 0,
        "ahorro_total": ahorro_total,
        "total_estimado": total_estimado,
        "porcentaje_ahorro": (ahorro_total / total_estimado * 100) if total_estimado > 0 else 0
    }


# ============================================
# 2. GEOGRAPHIC HEAT MAP
# ============================================

@router.get("/geographic-heatmap")
def get_geographic_heatmap(
    objeto_contratacion: Optional[str] = Query(None, description="Filter by categoria"),
    departamento: Optional[str] = Query(None, description="Drill-down to specific department"),
    db: Session = Depends(get_db)
):
    """
    Get geographic heat map data.
    - Level 1: By Departamento (when departamento param is None)
    - Level 2: By Provincia (when departamento param is specified)
    """
    
    if departamento:
        # Level 2: Province drill-down
        query = db.query(
            LicitacionesCabecera.provincia.label('location'),
            LicitacionesCabecera.departamento.label('parent'),
            func.sum(LicitacionesAdjudicaciones.monto_adjudicado).label('monto_total'),
            func.count(func.distinct(LicitacionesCabecera.id_convocatoria)).label('cantidad_procesos')
        ).join(
            LicitacionesAdjudicaciones,
            LicitacionesCabecera.id_convocatoria == LicitacionesAdjudicaciones.id_convocatoria
        ).filter(
            LicitacionesCabecera.departamento == departamento,
            LicitacionesCabecera.provincia.isnot(None),
            LicitacionesCabecera.provincia != ""
        )
    else:
        # Level 1: Department view
        query = db.query(
            LicitacionesCabecera.departamento.label('location'),
            func.sum(LicitacionesAdjudicaciones.monto_adjudicado).label('monto_total'),
            func.count(func.distinct(LicitacionesCabecera.id_convocatoria)).label('cantidad_procesos')
        ).join(
            LicitacionesAdjudicaciones,
            LicitacionesCabecera.id_convocatoria == LicitacionesAdjudicaciones.id_convocatoria
        ).filter(
            LicitacionesCabecera.departamento.isnot(None),
            LicitacionesCabecera.departamento != ""
        )
    
    # Apply objeto_contratacion filter
    if objeto_contratacion:
        query = query.filter(LicitacionesCabecera.categoria == objeto_contratacion)
    
    # Group by location
    if departamento:
        query = query.group_by(LicitacionesCabecera.provincia, LicitacionesCabecera.departamento)
    else:
        query = query.group_by(LicitacionesCabecera.departamento)
    
    results = query.all()
    
    data = []
    for row in results:
        item = {
            "location": row.location,
            "monto_total": float(row.monto_total) if row.monto_total else 0,
            "cantidad_procesos": row.cantidad_procesos or 0
        }
        if departamento:
            item["parent"] = row.parent
        data.append(item)
    
    return {
        "level": "provincia" if departamento else "departamento",
        "parent": departamento,
        "data": data
    }


# ============================================
# 3. BANK RANKING
# ============================================

@router.get("/bank-ranking")
def get_bank_ranking(
    tipo_procedimiento: Optional[str] = Query(None, description="Filter by tipo_procedimiento"),
    limit: int = Query(10, description="Number of top banks to return"),
    db: Session = Depends(get_db)
):
    """
    Get ranking of banks by total adjudicated amount.
    Horizontal bar chart data.
    """
    
    query = db.query(
        LicitacionesAdjudicaciones.entidad_financiera.label('banco'),
        func.sum(LicitacionesAdjudicaciones.monto_adjudicado).label('monto_total'),
        func.count(LicitacionesAdjudicaciones.id_adjudicacion).label('cantidad_garantias')
    ).filter(
        LicitacionesAdjudicaciones.entidad_financiera.isnot(None),
        LicitacionesAdjudicaciones.entidad_financiera != ""
    )
    
    # Apply tipo_procedimiento filter
    if tipo_procedimiento:
        query = query.join(
            LicitacionesCabecera,
            LicitacionesAdjudicaciones.id_convocatoria == LicitacionesCabecera.id_convocatoria
        ).filter(
            LicitacionesCabecera.tipo_procedimiento == tipo_procedimiento
        )
    
    query = query.group_by(
        LicitacionesAdjudicaciones.entidad_financiera
    ).order_by(
        desc(func.sum(LicitacionesAdjudicaciones.monto_adjudicado))
    ).limit(limit)
    
    results = query.all()
    
    data = []
    for row in results:
        data.append({
            "banco": row.banco,
            "monto_total": float(row.monto_total) if row.monto_total else 0,
            "cantidad_garantias": row.cantidad_garantias or 0
        })
    
    return {"data": data}


# ============================================
# 4. TEMPORAL TREND
# ============================================

@router.get("/temporal-trend")
def get_temporal_trend(
    estado_proceso: Optional[str] = Query(None, description="Filter by estado_proceso"),
    year: Optional[int] = Query(None, description="Filter by year"),
    db: Session = Depends(get_db)
):
    """
    Get monthly temporal trend of adjudications.
    Line/Area chart data grouped by month.
    """
    
    current_year = year or datetime.now().year
    
    query = db.query(
        extract('year', LicitacionesAdjudicaciones.fecha_adjudicacion).label('year'),
        extract('month', LicitacionesAdjudicaciones.fecha_adjudicacion).label('month'),
        func.sum(LicitacionesAdjudicaciones.monto_adjudicado).label('monto_total'),
        func.count(LicitacionesAdjudicaciones.id_adjudicacion).label('cantidad')
    ).join(
        LicitacionesCabecera,
        LicitacionesAdjudicaciones.id_convocatoria == LicitacionesCabecera.id_convocatoria
    ).filter(
        LicitacionesAdjudicaciones.fecha_adjudicacion.isnot(None),
        extract('year', LicitacionesAdjudicaciones.fecha_adjudicacion) == current_year
    )
    
    # Apply estado_proceso filter
    if estado_proceso:
        query = query.filter(LicitacionesCabecera.estado_proceso == estado_proceso)
    
    query = query.group_by(
        extract('year', LicitacionesAdjudicaciones.fecha_adjudicacion),
        extract('month', LicitacionesAdjudicaciones.fecha_adjudicacion)
    ).order_by(
        extract('month', LicitacionesAdjudicaciones.fecha_adjudicacion)
    )
    
    results = query.all()
    
    months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    data = []
    
    for row in results:
        month_idx = int(row.month) - 1
        data.append({
            "month": months[month_idx],
            "month_num": int(row.month),
            "year": int(row.year),
            "monto_total": float(row.monto_total) if row.monto_total else 0,
            "cantidad": row.cantidad or 0
        })
    
    return {
        "year": current_year,
        "data": data
    }


# ============================================
# 5. TOP PROVIDERS TABLE
# ============================================

@router.get("/top-providers")
def get_top_providers(
    banco_garantia: Optional[str] = Query(None, description="Filter by entidad_financiera"),
    limit: int = Query(20, description="Number of top providers to return"),
    offset: int = Query(0, description="Pagination offset"),
    db: Session = Depends(get_db)
):
    """
    Get top winning providers with their statistics.
    Table data with pagination.
    """
    
    query = db.query(
        LicitacionesAdjudicaciones.ganador_nombre.label('proveedor'),
        LicitacionesAdjudicaciones.ganador_ruc.label('ruc'),
        func.sum(LicitacionesAdjudicaciones.monto_adjudicado).label('monto_total'),
        func.count(LicitacionesAdjudicaciones.id_adjudicacion).label('cantidad_contratos')
    ).filter(
        LicitacionesAdjudicaciones.ganador_nombre.isnot(None),
        LicitacionesAdjudicaciones.ganador_nombre != ""
    )
    
    # Apply banco_garantia filter
    if banco_garantia:
        query = query.filter(LicitacionesAdjudicaciones.entidad_financiera == banco_garantia)
    
    # Get total count for pagination
    count_query = query.group_by(
        LicitacionesAdjudicaciones.ganador_nombre,
        LicitacionesAdjudicaciones.ganador_ruc
    )
    total = count_query.count()
    
    # Apply grouping, ordering, and pagination
    query = query.group_by(
        LicitacionesAdjudicaciones.ganador_nombre,
        LicitacionesAdjudicaciones.ganador_ruc
    ).order_by(
        desc(func.sum(LicitacionesAdjudicaciones.monto_adjudicado))
    ).limit(limit).offset(offset)
    
    results = query.all()
    
    data = []
    for row in results:
        data.append({
            "proveedor": row.proveedor,
            "ruc": row.ruc,
            "monto_total": float(row.monto_total) if row.monto_total else 0,
            "cantidad_contratos": row.cantidad_contratos or 0
        })
    
    return {
        "data": data,
        "total": total,
        "limit": limit,
        "offset": offset
    }


# ============================================
# 6. SAVINGS GAUGE
# ============================================

@router.get("/savings-gauge")
def get_savings_gauge(
    departamento: Optional[str] = Query(None, description="Filter by departamento"),
    db: Session = Depends(get_db)
):
    """
    Get savings comparison data (Monto Referencial vs Monto Adjudicado).
    Gauge/Bullet chart data.
    """
    
    query = db.query(
        func.sum(LicitacionesCabecera.monto_estimado).label('monto_referencial'),
        func.sum(LicitacionesAdjudicaciones.monto_adjudicado).label('monto_adjudicado'),
        func.count(func.distinct(LicitacionesCabecera.id_convocatoria)).label('cantidad_procesos')
    ).join(
        LicitacionesAdjudicaciones,
        LicitacionesCabecera.id_convocatoria == LicitacionesAdjudicaciones.id_convocatoria
    )
    
    # Apply departamento filter
    if departamento:
        query = query.filter(LicitacionesCabecera.departamento == departamento)
    
    result = query.first()
    
    monto_referencial = float(result.monto_referencial) if result.monto_referencial else 0
    monto_adjudicado = float(result.monto_adjudicado) if result.monto_adjudicado else 0
    ahorro = monto_referencial - monto_adjudicado
    porcentaje_ahorro = (ahorro / monto_referencial * 100) if monto_referencial > 0 else 0
    porcentaje_ejecutado = (monto_adjudicado / monto_referencial * 100) if monto_referencial > 0 else 0
    
    return {
        "monto_referencial": monto_referencial,
        "monto_adjudicado": monto_adjudicado,
        "ahorro": ahorro,
        "porcentaje_ahorro": porcentaje_ahorro,
        "porcentaje_ejecutado": porcentaje_ejecutado,
        "cantidad_procesos": result.cantidad_procesos or 0,
        "status": "good" if porcentaje_ahorro > 5 else ("moderate" if porcentaje_ahorro > 0 else "over_budget")
    }


# ============================================
# 7. CONSORTIUM BREAKDOWN TREE
# ============================================

@router.get("/consortium-breakdown")
def get_consortium_breakdown(
    search: Optional[str] = Query(None, description="Search by RUC, Name, Code, Member, etc."),
    limit: int = Query(1000, description="Limit number of results"),
    db: Session = Depends(get_db)
):
    """
    Get consortium breakdown hierarchical data.
    Tree structure: Nomenclatura -> Proveedor -> Members
    """
    
    # Base query for consortiums
    query = db.query(
        LicitacionesCabecera.nomenclatura,
        LicitacionesCabecera.descripcion,
        LicitacionesAdjudicaciones.ganador_nombre,
        LicitacionesAdjudicaciones.ganador_ruc,
        LicitacionesAdjudicaciones.id_contrato,
        LicitacionesAdjudicaciones.monto_adjudicado
    ).join(
        LicitacionesAdjudicaciones,
        LicitacionesCabecera.id_convocatoria == LicitacionesAdjudicaciones.id_convocatoria
    ).filter(
        LicitacionesAdjudicaciones.id_contrato.isnot(None)
    )
    
    # Apply search filter (Enhanced)
    if search:
        search_term = f"%{search}%"
        query = query.outerjoin(
            DetalleConsorcios, 
            LicitacionesAdjudicaciones.id_contrato == DetalleConsorcios.id_contrato
        ).filter(
            or_(
                LicitacionesAdjudicaciones.ganador_ruc.ilike(search_term),
                LicitacionesAdjudicaciones.ganador_nombre.ilike(search_term),
                LicitacionesCabecera.nomenclatura.ilike(search_term),
                LicitacionesCabecera.descripcion.ilike(search_term),
                DetalleConsorcios.nombre_miembro.ilike(search_term),
                DetalleConsorcios.ruc_miembro.ilike(search_term)
            )
        ).distinct()
    
    query = query.limit(limit)
    consortiums = query.all()
    
    if not consortiums:
        return {"data": [], "total": 0}

    # --- OPTIMIZATION START (Fix N+1 Problem) ---
    
    # 1. Collect all contract IDs
    contract_ids = [c.id_contrato for c in consortiums if c.id_contrato]
    
    # 2. Bulk fetch all members for these contracts in ONE query
    members_map = {}
    if contract_ids:
        all_members = db.query(DetalleConsorcios).filter(
            DetalleConsorcios.id_contrato.in_(contract_ids)
        ).all()
        
        # 3. Group members by contract_id in memory
        for member in all_members:
            if member.id_contrato not in members_map:
                members_map[member.id_contrato] = []
            
            members_map[member.id_contrato].append({
                "nombre_miembro": member.nombre_miembro,
                "ruc_miembro": member.ruc_miembro,
                "porcentaje_participacion": float(member.porcentaje_participacion) if member.porcentaje_participacion else 0
            })
    
    # 4. Assemble the final response
    tree_data = []
    
    for consortium in consortiums:
        # Get members from memory map instead of DB query
        member_data = members_map.get(consortium.id_contrato, [])
        
        # Only include if has members (is a consortium)
        if member_data:
            tree_data.append({
                "nomenclatura": consortium.nomenclatura,
                "descripcion": consortium.descripcion,
                "proveedor_ganador": consortium.ganador_nombre,
                "ruc_ganador": consortium.ganador_ruc,
                "monto_adjudicado": float(consortium.monto_adjudicado) if consortium.monto_adjudicado else 0,
                "miembros": member_data,
                "cantidad_miembros": len(member_data)
            })
            
    # --- OPTIMIZATION END ---
    
    return {
        "data": tree_data,
        "total": len(tree_data)
    }


# ============================================
# 8. FILTER OPTIONS
# ============================================

@router.get("/filter-options")
def get_filter_options(db: Session = Depends(get_db)):
    """
    Get all available filter options for dropdowns.
    Returns distinct values for each filter dimension.
    """
    
    # Objeto Contratacion (categoria)
    objetos = db.query(LicitacionesCabecera.categoria).distinct().filter(
        LicitacionesCabecera.categoria.isnot(None),
        LicitacionesCabecera.categoria != ""
    ).all()
    
    # Tipo Procedimiento
    tipos = db.query(LicitacionesCabecera.tipo_procedimiento).distinct().filter(
        LicitacionesCabecera.tipo_procedimiento.isnot(None),
        LicitacionesCabecera.tipo_procedimiento != ""
    ).all()
    
    # Estado Proceso
    estados = db.query(LicitacionesCabecera.estado_proceso).distinct().filter(
        LicitacionesCabecera.estado_proceso.isnot(None),
        LicitacionesCabecera.estado_proceso != ""
    ).all()
    
    # Departamentos
    departamentos = db.query(LicitacionesCabecera.departamento).distinct().filter(
        LicitacionesCabecera.departamento.isnot(None),
        LicitacionesCabecera.departamento != ""
    ).order_by(LicitacionesCabecera.departamento).all()
    
    # Bancos (entidad_financiera)
    bancos = db.query(LicitacionesAdjudicaciones.entidad_financiera).distinct().filter(
        LicitacionesAdjudicaciones.entidad_financiera.isnot(None),
        LicitacionesAdjudicaciones.entidad_financiera != ""
    ).order_by(LicitacionesAdjudicaciones.entidad_financiera).all()
    
    return {
        "objetos_contratacion": sorted([o[0] for o in objetos]),
        "tipos_procedimiento": sorted([t[0] for t in tipos]),
        "estados_proceso": sorted([e[0] for e in estados]),
        "departamentos": [d[0] for d in departamentos],
        "bancos_garantia": [b[0] for b in bancos]
    }
