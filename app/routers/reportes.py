from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case, text
from typing import Optional, List, Any
from pydantic import BaseModel
from app.database import get_db
from app.models.seace import LicitacionesCabecera, LicitacionesAdjudicaciones
from datetime import datetime

router = APIRouter(prefix="/api/reportes", tags=["Reportes"])

class ReporteFiltros(BaseModel):
    search: Optional[str] = None
    departamento: Optional[str] = None
    provincia: Optional[str] = None
    distrito: Optional[str] = None
    estado_proceso: Optional[str] = None
    categoria: Optional[str] = None
    comprador: Optional[str] = None
    aseguradora: Optional[str] = None
    year: Optional[str] = None
    mes: Optional[str] = None

class GenerarReporteRequest(BaseModel):
    tipo: str  # 'entidad', 'departamento', 'categoria', 'estado', 'personalizado'
    filtros: ReporteFiltros

@router.post("/generar")
def generar_reporte(request: GenerarReporteRequest, db: Session = Depends(get_db)):
    """
    Genera reportes agrupados según el tipo seleccionado y filtros aplicados.
    """
    tipo = request.tipo
    filtros = request.filtros
    
    # Base query components
    query = db.query()
    
    # Define columns based on report type
    if tipo == 'entidad':
        # Logic to group by entidad_financiera cleaned
        # In SQLAlchemy we might need raw SQL expression for the CASE statement if it's complex
        # or use python-side processing if valid.
        pass # Will implement below
        
    # Since SQLAlchemy + massive string manipulation is tricky, we'll build a base query object
    # But for complex grouping like the 'entidad' logic (cleaning names), raw SQL or specific expressions are better.
    
    # Common joins
    # Most reports need headers + adjudications
    
    params = {}
    where_clauses = ["a.entidad_financiera IS NOT NULL", "a.entidad_financiera != ''", "a.entidad_financiera != 'SIN_GARANTIA'"] if tipo == 'entidad' else ["1=1"]
    
    # Apply filters to WHERE
    if filtros.departamento:
        where_clauses.append("c.departamento = :departamento")
        params['departamento'] = filtros.departamento
    if filtros.provincia:
        where_clauses.append("c.provincia = :provincia")
        params['provincia'] = filtros.provincia
    if filtros.distrito:
        where_clauses.append("c.distrito = :distrito")
        params['distrito'] = filtros.distrito
    if filtros.estado_proceso:
        where_clauses.append("c.estado_proceso = :estado_proceso")
        params['estado_proceso'] = filtros.estado_proceso
    if filtros.categoria:
        where_clauses.append("c.categoria = :categoria")
        params['categoria'] = filtros.categoria
    if filtros.comprador:
        where_clauses.append("c.comprador LIKE :comprador")
        params['comprador'] = f"%{filtros.comprador}%"
    if filtros.year:
        where_clauses.append("YEAR(c.fecha_publicacion) = :year")
        params['year'] = filtros.year
    if filtros.mes:
        where_clauses.append("MONTH(c.fecha_publicacion) = :mes")
        params['mes'] = filtros.mes
        
    # Additional specific filters
    if filtros.aseguradora and tipo != 'entidad': # If filtering by insurer
        where_clauses.append("a.entidad_financiera LIKE :aseguradora")
        params['aseguradora'] = f"%{filtros.aseguradora}%"

    where_str = " AND ".join(where_clauses)
    
    sql = ""
    
    if tipo == 'entidad':
        sql = f"""
            SELECT 
                CASE 
                    WHEN a.entidad_financiera IN ('ERROR_API_500', 'FINANCIERO') THEN 'OTROS'
                    WHEN a.entidad_financiera LIKE '%|%' 
                    THEN TRIM(SUBSTRING_INDEX(a.entidad_financiera, '|', 1))
                    ELSE a.entidad_financiera
                END as nombre,
                COUNT(*) as garantias,
                SUM(COALESCE(a.monto_adjudicado, 0)) as monto,
                COUNT(DISTINCT c.departamento) as departamentos
            FROM licitaciones_adjudicaciones a
            LEFT JOIN licitaciones_cabecera c ON a.id_convocatoria = c.id_convocatoria
            WHERE {where_str}
            GROUP BY 
                CASE 
                    WHEN a.entidad_financiera IN ('ERROR_API_500', 'FINANCIERO') THEN 'OTROS'
                    WHEN a.entidad_financiera LIKE '%|%' 
                    THEN TRIM(SUBSTRING_INDEX(a.entidad_financiera, '|', 1))
                    ELSE a.entidad_financiera
                END
            ORDER BY garantias DESC
            LIMIT 100
        """
    
    elif tipo == 'departamento':
        where_str += " AND c.departamento IS NOT NULL "
        sql = f"""
            SELECT 
                c.departamento as nombre,
                COUNT(DISTINCT c.id_convocatoria) as garantias,
                SUM(COALESCE(a.monto_adjudicado, 0)) as monto,
                COUNT(DISTINCT c.categoria) as categorias
            FROM licitaciones_cabecera c
            LEFT JOIN licitaciones_adjudicaciones a ON c.id_convocatoria = a.id_convocatoria
            WHERE {where_str}
            GROUP BY c.departamento
            ORDER BY garantias DESC
        """
        
    elif tipo == 'categoria':
        where_str += " AND c.categoria IS NOT NULL "
        sql = f"""
            SELECT 
                c.categoria as nombre,
                COUNT(DISTINCT c.id_convocatoria) as garantias,
                SUM(COALESCE(a.monto_adjudicado, 0)) as monto,
                COUNT(DISTINCT c.departamento) as departamentos
            FROM licitaciones_cabecera c
            LEFT JOIN licitaciones_adjudicaciones a ON c.id_convocatoria = a.id_convocatoria
            WHERE {where_str}
            GROUP BY c.categoria
            ORDER BY garantias DESC
        """
        
    elif tipo == 'estado':
        where_str += " AND c.estado_proceso IS NOT NULL "
        sql = f"""
            SELECT 
                c.estado_proceso as nombre,
                COUNT(DISTINCT c.id_convocatoria) as garantias,
                SUM(COALESCE(a.monto_adjudicado, 0)) as monto,
                COUNT(DISTINCT c.departamento) as departamentos
            FROM licitaciones_cabecera c
            LEFT JOIN licitaciones_adjudicaciones a ON c.id_convocatoria = a.id_convocatoria
            WHERE {where_str}
            GROUP BY c.estado_proceso
            ORDER BY garantias DESC
        """
    
    else: # personalizado or default
        sql = f"""
            SELECT 
                c.descripcion as nombre,
                COUNT(DISTINCT a.id_adjudicacion) as garantias,
                SUM(COALESCE(a.monto_adjudicado, 0)) as monto,
                c.departamento
            FROM licitaciones_cabecera c
            LEFT JOIN licitaciones_adjudicaciones a ON c.id_convocatoria = a.id_convocatoria
            WHERE {where_str}
            GROUP BY c.id_convocatoria
            LIMIT 100
        """

    try:
        result = db.execute(text(sql), params)
        rows = [dict(row._mapping) for row in result]
        
        # Format output
        formatted_rows = []
        for row in rows:
            # Clean up decimals for JSON serialization
            monto_val = row.get('monto', 0)
            formatted_rows.append({
                "nombre": row.get('nombre', 'Sin Nombre'),
                "garantias": row.get('garantias', 0),
                "monto": f"S/ {float(monto_val):,.2f}" if monto_val else "S/ 0.00",
                "departamentos": row.get('departamentos', 0) if 'departamentos' in row else row.get('departamento', '')
            })
            
        return {
            "success": True,
            "data": formatted_rows,
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "total_records": len(formatted_rows)
            }
        }
        
    except Exception as e:
        print(f"Error generating report: {e}")
        return {
            "success": False,
            "error": str(e)
        }
