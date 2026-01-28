"""
Dashboard endpoints using RAW SQL - adapted to real database structure.
Uses licitaciones_cabecera (which has data) instead of empty licitaciones_adjudicaciones.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from typing import Optional
from decimal import Decimal

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/kpis")
def get_dashboard_kpis(
    year: Optional[int] = Query(None, description="Filter by year. 0 or None for All."),
    mes: Optional[int] = Query(None, description="Filter by month 1-12"),
    estado: Optional[str] = Query(None, description="Filter by estado_proceso"),
    tipo_procedimiento: Optional[str] = Query(None, description="Filter by tipo_procedimiento"),
    categoria: Optional[str] = Query(None, description="Filter by categoria"),
    departamento: Optional[str] = Query(None, description="Filter by departamento"),
    db: Session = Depends(get_db)
):
    """
    Get dashboard KPIs using data from licitaciones_cabecera.
    """
    try:
        # Build WHERE clause for filters
        where_clauses = []
        params = {}
        
        if year and year > 0:
            where_clauses.append("YEAR(fecha_publicacion) = :year")
            params['year'] = year
        if mes and mes > 0:
            where_clauses.append("MONTH(fecha_publicacion) = :mes")
            params['mes'] = mes
        if estado:
            where_clauses.append("estado_proceso = :estado")
            params['estado'] = estado
        if tipo_procedimiento:
            where_clauses.append("tipo_procedimiento = :tipo_proc")
            params['tipo_proc'] = tipo_procedimiento
        if categoria:
            where_clauses.append("categoria = :categoria")
            params['categoria'] = categoria
        if departamento:
            where_clauses.append("departamento = :departamento")
            params['departamento'] = departamento
        
        where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        
        # 1. Total monto estimado y cantidad de licitaciones
        sql_kpis = text(f"""
            SELECT 
                COALESCE(SUM(monto_estimado), 0) as monto_total,
                COUNT(DISTINCT id_convocatoria) as total_licitaciones
            FROM licitaciones_cabecera
            {where_sql}
        """)
        
        result = db.execute(sql_kpis, params).fetchone()
        monto_total = float(result[0]) if result[0] else 0
        total_licitaciones = result[1] or 0
        
        # 2. Top 5 departamentos
        sql_deptos = text(f"""
            SELECT 
                departamento as nombre,
                COUNT(*) as total,
                COALESCE(SUM(monto_estimado), 0) as monto
            FROM licitaciones_cabecera
            WHERE departamento IS NOT NULL AND departamento != ''
            {("AND " + " AND ".join(where_clauses)) if where_clauses else ""}
            GROUP BY departamento
            ORDER BY total DESC
            LIMIT 5
        """)
        
        deptos = db.execute(sql_deptos, params).fetchall()
        top_departamentos = [{"nombre": row[0], "total": row[1], "monto": float(row[2]) if row[2] else 0} for row in deptos]
        
        # 3. Top 5 entidades compradoras
        sql_entidades = text(f"""
            SELECT 
                comprador as nombre,
                COUNT(*) as total,
                COALESCE(SUM(monto_estimado), 0) as monto
            FROM licitaciones_cabecera
            WHERE comprador IS NOT NULL AND comprador != ''
            {("AND " + " AND ".join(where_clauses)) if where_clauses else ""}
            GROUP BY comprador
            ORDER BY total DESC
            LIMIT 5
        """)
        
        entidades = db.execute(sql_entidades, params).fetchall()
        top_entidades = [{"nombre": row[0], "total": row[1], "monto": float(row[2]) if row[2] else 0} for row in entidades]
        
        # 4. Distribución por categoría (Bien/Obra/Servicio/Consultoría)
        sql_categorias = text(f"""
            SELECT 
                categoria as nombre,
                COUNT(*) as total,
                COALESCE(SUM(monto_estimado), 0) as monto
            FROM licitaciones_cabecera
            WHERE categoria IS NOT NULL AND categoria != ''
            {("AND " + " AND ".join(where_clauses)) if where_clauses else ""}
            GROUP BY categoria
            ORDER BY total DESC
        """)
        
        categorias = db.execute(sql_categorias, params).fetchall()
        distribucion_categorias = [{"nombre": row[0], "total": row[1], "monto": float(row[2]) if row[2] else 0} for row in categorias]
        
        # 5. Licitaciones por estado
        sql_estados = text(f"""
            SELECT 
                estado_proceso as nombre,
                COUNT(*) as total
            FROM licitaciones_cabecera
            WHERE estado_proceso IS NOT NULL AND estado_proceso != ''
            {("AND " + " AND ".join(where_clauses)) if where_clauses else ""}
            GROUP BY estado_proceso
            ORDER BY total DESC
        """)
        
        estados = db.execute(sql_estados, params).fetchall()
        distribucion_estados = [{"nombre": row[0], "total": row[1]} for row in estados]
        
        return {
            "monto_total_estimado": str(Decimal(str(monto_total))),
            "total_licitaciones": total_licitaciones,
            "top_departamentos": top_departamentos,
            "top_entidades": top_entidades,
            "distribucion_categorias": distribucion_categorias,
            "distribucion_estados": distribucion_estados
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "error": str(e),
            "monto_total_estimado": "0",
            "total_licitaciones": 0,
            "top_departamentos": [],
            "top_entidades": [],
            "distribucion_estados": []
        }

@router.get("/distribution-by-type")
def get_distribution_by_type(
    year: int = 0,
    mes: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    tipo_procedimiento: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    departamento: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    try:
        # Build filters
        where_clauses = ["categoria IS NOT NULL", "categoria != ''"]
        params = {}
        
        if year > 0:
            where_clauses.append("YEAR(fecha_publicacion) = :year")
            params['year'] = year
        if mes and mes > 0:
            where_clauses.append("MONTH(fecha_publicacion) = :mes")
            params['mes'] = mes
        if estado:
            where_clauses.append("estado_proceso = :estado")
            params['estado'] = estado
        if tipo_procedimiento:
            where_clauses.append("tipo_procedimiento = :tipo_proc")
            params['tipo_proc'] = tipo_procedimiento
        if categoria:
            where_clauses.append("categoria = :categoria")
            params['categoria'] = categoria
        if departamento:
            where_clauses.append("departamento = :departamento")
            params['departamento'] = departamento
            
        where_sql = "AND " + " AND ".join(where_clauses)
        
        sql = text(f"""
            SELECT 
                categoria as name,
                COUNT(*) as value,
                COALESCE(SUM(monto_estimado), 0) as amount
            FROM licitaciones_cabecera
            WHERE 1=1 {where_sql}
            GROUP BY categoria
            ORDER BY value DESC
        """)
        
        result = db.execute(sql, params).fetchall()
        
        # Normalize and Aggregate Data (Merge English/Spanish)
        # DB has mixed: 'goods', 'services', 'works' AND 'BIENES', 'OBRAS', 'SERVICIOS'
        normalization_map = {
            'GOODS': 'BIENES',
            'BIENES': 'BIENES',
            'SERVICES': 'SERVICIOS',
            'SERVICIOS': 'SERVICIOS',
            'WORKS': 'OBRAS',
            'OBRAS': 'OBRAS',
            'CONSULTING SERVICES': 'CONSULTORIA DE OBRAS',
            'CONSULTORIA DE OBRAS': 'CONSULTORIA DE OBRAS'
        }
        
        aggregated = {}
        
        for row in result:
            raw_name = row[0]
            if not raw_name: continue
            
            clean_name = raw_name.upper().strip()
            # Default to original if not in map, or map it
            final_name = normalization_map.get(clean_name, clean_name)
            
            if final_name not in aggregated:
                aggregated[final_name] = {"value": 0, "amount": 0.0}
            
            aggregated[final_name]["value"] += int(row[1])
            aggregated[final_name]["amount"] += float(row[2])
            
        # Convert to list
        data = [
            {"name": k, "value": v["value"], "amount": v["amount"]} 
            for k, v in aggregated.items()
        ]
        
        # Sort by value DESC
        data.sort(key=lambda x: x["value"], reverse=True)
        
        return {"data": data}
    except Exception as e:
        return {"data": [], "error": str(e)}

@router.get("/stats-by-status")
def get_stats_by_status(
    year: int = 0,
    mes: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    tipo_procedimiento: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    departamento: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    try:
        # Build filters
        where_clauses = ["estado_proceso IS NOT NULL", "estado_proceso != ''"]
        params = {}
        
        if year > 0:
            where_clauses.append("YEAR(fecha_publicacion) = :year")
            params['year'] = year
        if mes and mes > 0:
            where_clauses.append("MONTH(fecha_publicacion) = :mes")
            params['mes'] = mes
        if estado:
            where_clauses.append("estado_proceso = :estado")
            params['estado'] = estado
        if tipo_procedimiento:
            where_clauses.append("tipo_procedimiento = :tipo_proc")
            params['tipo_proc'] = tipo_procedimiento
        if categoria:
            where_clauses.append("categoria = :categoria")
            params['categoria'] = categoria
        if departamento:
            where_clauses.append("departamento = :departamento")
            params['departamento'] = departamento

        where_sql = "AND " + " AND ".join(where_clauses)

        sql = text(f"""
            SELECT 
                estado_proceso as name,
                COUNT(*) as value
            FROM licitaciones_cabecera
            WHERE 1=1 {where_sql}
            GROUP BY estado_proceso
            ORDER BY value DESC
        """)
        result = db.execute(sql, params).fetchall()
        data = [{"name": row[0], "value": row[1]} for row in result]
        return {"data": data}
    except Exception as e:
        return {"data": [], "error": str(e)}

@router.get("/monthly-trend")
def get_monthly_trend(
    year: int = 0,
    mes: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    tipo_procedimiento: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    departamento: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    try:
        # Build filters
        where_clauses = []
        params = {}
        
        if year > 0:
            where_clauses.append("YEAR(fecha_publicacion) = :year")
            params['year'] = year
        if mes and mes > 0:
            where_clauses.append("MONTH(fecha_publicacion) = :mes")
            params['mes'] = mes
        if estado:
            where_clauses.append("estado_proceso = :estado")
            params['estado'] = estado
        if tipo_procedimiento:
            where_clauses.append("tipo_procedimiento = :tipo_proc")
            params['tipo_proc'] = tipo_procedimiento
        if categoria:
            where_clauses.append("categoria = :categoria")
            params['categoria'] = categoria
        if departamento:
            where_clauses.append("departamento = :departamento")
            params['departamento'] = departamento
            
        where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        
        sql = text(f"""
            SELECT 
                MONTH(fecha_publicacion) as mes,
                COUNT(*) as count,
                COALESCE(SUM(monto_estimado), 0) as amount
            FROM licitaciones_cabecera
            {where_sql}
            GROUP BY MONTH(fecha_publicacion)
            ORDER BY mes
        """)
        
        result = db.execute(sql, params).fetchall()
        
        months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
        data = []
        for i in range(12):
            month_idx = i + 1
            row = next((r for r in result if r[0] == month_idx), None)
            data.append({
                "name": months[i],
                "count": row[1] if row else 0,
                "value": float(row[2]) if row else 0
            })
            
        return {"data": data}
    except Exception as e:
        return {"data": [], "error": str(e)}

@router.get("/department-ranking")
def get_department_ranking(
    year: int = 0,
    mes: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    tipo_procedimiento: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    try:
        # Build filters
        where_clauses = ["departamento IS NOT NULL", "departamento != ''"]
        params = {}
        
        if year > 0:
            where_clauses.append("YEAR(fecha_publicacion) = :year")
            params['year'] = year
        if mes and mes > 0:
            where_clauses.append("MONTH(fecha_publicacion) = :mes")
            params['mes'] = mes
        if estado:
            where_clauses.append("estado_proceso = :estado")
            params['estado'] = estado
        if tipo_procedimiento:
            where_clauses.append("tipo_procedimiento = :tipo_proc")
            params['tipo_proc'] = tipo_procedimiento
        if categoria:
            where_clauses.append("categoria = :categoria")
            params['categoria'] = categoria
            
        where_sql = "AND " + " AND ".join(where_clauses)

        sql = text(f"""
            SELECT 
                departamento as name,
                COUNT(*) as count,
                COALESCE(SUM(monto_estimado), 0) as amount
            FROM licitaciones_cabecera
            WHERE 1=1 {where_sql}
            GROUP BY departamento
            ORDER BY count DESC
        """)
        
        result = db.execute(sql, params).fetchall()
        data = [{"name": row[0], "count": row[1], "amount": float(row[2])} for row in result]
        return {"data": data}
    except Exception as e:
        return {"data": [], "error": str(e)}

@router.get("/financial-entities-ranking")
def get_financial_entities_ranking(
    year: int = 0,
    mes: Optional[int] = Query(None),
    departamento: Optional[str] = Query(None, description="Filter by department"),
    estado: Optional[str] = Query(None),
    tipo_procedimiento: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    try:
        # Build SQL with filters - targeted at 'c' (cabecera)
        where_clauses = []
        params = {}
        
        if year > 0:
            where_clauses.append("YEAR(c.fecha_publicacion) = :year")
            params["year"] = year
        if mes and mes > 0:
            where_clauses.append("MONTH(c.fecha_publicacion) = :mes")
            params["mes"] = mes
        if departamento:
            where_clauses.append("c.departamento = :department")
            params["department"] = departamento
        if estado:
            where_clauses.append("c.estado_proceso = :estado")
            params['estado'] = estado
        if tipo_procedimiento:
            where_clauses.append("c.tipo_procedimiento = :tipo_proc")
            params['tipo_proc'] = tipo_procedimiento
        if categoria:
            where_clauses.append("c.categoria = :categoria")
            params['categoria'] = categoria

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        # Primary Query: Entidad Financiera (Insurers) from Adjudicaciones
        sql = text(f"""
            SELECT 
                a.entidad_financiera as name,
                c.departamento,
                COUNT(*) as count,
                COALESCE(SUM(a.monto_adjudicado), 0) as amount
            FROM licitaciones_adjudicaciones a
            JOIN licitaciones_cabecera c ON a.id_convocatoria = c.id_convocatoria
            WHERE a.entidad_financiera IS NOT NULL 
              AND a.entidad_financiera != '' 
              AND a.entidad_financiera != 'SIN_GARANTIA'
              AND a.entidad_financiera != 'ERROR_API_500'
              AND {where_sql}
            GROUP BY a.entidad_financiera, c.departamento
            ORDER BY amount DESC
            LIMIT 1000
        """)
        
        result = db.execute(sql, params).fetchall()
        
        # Apply Normalization
        from app.utils.normalization import normalize_insurer_name

        # Aggregate counts by normalized name
        aggregated = {}
        for row in result:
            raw_name = row[0]
            dept = row[1]
            count = row[2]
            amount = float(row[3])
            
            if not raw_name: continue
            
            # Normalize
            normalized_name = normalize_insurer_name(raw_name)
            
            if normalized_name not in aggregated:
                aggregated[normalized_name] = {
                    "count": 0, 
                    "amount": 0.0, 
                    "depts": set()
                }
            
            aggregated[normalized_name]["count"] += count
            aggregated[normalized_name]["amount"] += amount
            if dept:
                aggregated[normalized_name]["depts"].add(dept)

        # Convert back to list and sort
        data = [
            {
                "name": k, 
                "count": v["count"], 
                "amount": v["amount"],
                "dept_count": len(v["depts"])
            } 
            for k, v in aggregated.items()
        ]
        data.sort(key=lambda x: x["count"], reverse=True)
        
        # Safety check for empty results
        if not data:
            data = []

        return {"data": data}
    except Exception as e:
         return {"data": [], "error": str(e)}

@router.get("/province-ranking")
def get_province_ranking(
    department: str = Query(..., description="Department name"), 
    year: int = 0,
    mes: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    tipo_procedimiento: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    try:
        # Build filters
        where_clauses = ["departamento = :department", "provincia IS NOT NULL", "provincia != ''"]
        params = {"department": department}
        
        if year > 0:
            where_clauses.append("YEAR(fecha_publicacion) = :year")
            params["year"] = year
        if mes and mes > 0:
            where_clauses.append("MONTH(fecha_publicacion) = :mes")
            params['mes'] = mes
        if estado:
            where_clauses.append("estado_proceso = :estado")
            params['estado'] = estado
        if tipo_procedimiento:
            where_clauses.append("tipo_procedimiento = :tipo_proc")
            params['tipo_proc'] = tipo_procedimiento
        if categoria:
            where_clauses.append("categoria = :categoria")
            params['categoria'] = categoria

        where_sql = "AND " + " AND ".join(where_clauses)
        
        sql = text(f"""
            SELECT 
                provincia as name,
                COUNT(*) as count,
                COALESCE(SUM(monto_estimado), 0) as amount
            FROM licitaciones_cabecera
            WHERE 1=1 {where_sql}
            GROUP BY provincia
            ORDER BY count DESC
        """)
        
        result = db.execute(sql, params).fetchall()
        data = [{"name": row[0], "count": row[1], "amount": float(row[2])} for row in result]
        return {"data": data}
    except Exception as e:
        return {"data": [], "error": str(e)}
