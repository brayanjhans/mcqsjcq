from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from typing import List, Dict, Optional, Literal, Union, Any
from pydantic import BaseModel
import pandas as pd
import io
from datetime import datetime

# ReportLab imports for PDF
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

router = APIRouter(prefix="/api/export", tags=["Exports"])

class ExportRequest(BaseModel):
    format: str # 'pdf', 'excel', 'csv'
    ids: List[str] = []
    all_matches: bool = False
    filters: Dict[str, Any] = {} # Use Any to avoid validation strictness causing issues

def build_query(req: ExportRequest):
    where_clauses = []
    params = {}

    # If specific IDs are selected and NOT "All Matches"
    if not req.all_matches and req.ids:
        where_ids = []
        for i, uid in enumerate(req.ids):
            param_name = f"id_{i}"
            where_ids.append(f":{param_name}")
            params[param_name] = uid
        where_clauses.append(f"lc.id_convocatoria IN ({','.join(where_ids)})")
    
    # If "All Matches" is true, ignore IDs and use filters
    elif req.all_matches:
        f = req.filters
        if f.get('search'):
            where_clauses.append("(lc.nomenclatura LIKE :search OR lc.comprador LIKE :search)")
            params['search'] = f"%{f['search']}%"
        if f.get('estado'):
            where_clauses.append("lc.estado_proceso = :estado")
            params['estado'] = f.get('estado')
        if f.get('categoria'):
            where_clauses.append("lc.categoria = :categoria")
            params['categoria'] = f.get('categoria')
        if f.get('departamento'):
            where_clauses.append("lc.departamento = :departamento")
            params['departamento'] = f.get('departamento')
        if f.get('provincia'):
            where_clauses.append("lc.provincia = :provincia")
            params['provincia'] = f.get('provincia')
        if f.get('distrito'):
            where_clauses.append("lc.distrito = :distrito")
            params['distrito'] = f.get('distrito')
        filter_year = req.filters.get('year')
        if filter_year:
            where_clauses.append("EXTRACT(YEAR FROM lc.fecha_publicacion) = :year")
            params['year'] = filter_year

        filter_mes = req.filters.get('mes')
        if filter_mes:
            where_clauses.append("EXTRACT(MONTH FROM lc.fecha_publicacion) = :mes")
            params['mes'] = filter_mes
        if f.get('comprador'):
            where_clauses.append("lc.comprador = :comprador")
            params['comprador'] = f.get('comprador')

        # Complex filters (Subqueries)
        if f.get('entidad_financiera'):
             where_clauses.append("""
                EXISTS (
                    SELECT 1 FROM licitaciones_adjudicaciones la 
                    WHERE la.id_convocatoria = lc.id_convocatoria 
                    AND la.entidad_financiera LIKE :entidad_financiera_filter
                )
            """)
             params['entidad_financiera_filter'] = f"%{f['entidad_financiera']}%"

        if f.get('tipo_garantia'):
            where_clauses.append("""
                EXISTS (
                    SELECT 1 FROM licitaciones_adjudicaciones la 
                    WHERE la.id_convocatoria = lc.id_convocatoria 
                    AND la.tipo_garantia LIKE :tipo_garantia_filter
                )
            """)
            params['tipo_garantia_filter'] = f"%{f['tipo_garantia']}%"
    
    else:
        # No IDs and No All Matches -> Empty Result or Error?
        # User implies exporting nothing? Or whole DB? Let's assume nothing.
        return None, {}

    where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
    
    # Query Data
    sql = text(f"""
        SELECT 
            lc.id_convocatoria,
            lc.nomenclatura,
            lc.comprador,
            lc.categoria,
            lc.monto_estimado,
            lc.fecha_publicacion,
            lc.estado_proceso,
            lc.departamento,
            lc.provincia,
            lc.distrito,
            (SELECT GROUP_CONCAT(DISTINCT tipo_garantia SEPARATOR ', ') FROM licitaciones_adjudicaciones WHERE id_convocatoria = lc.id_convocatoria) as tipos_garantia,
            (SELECT GROUP_CONCAT(DISTINCT entidad_financiera SEPARATOR ', ') FROM licitaciones_adjudicaciones WHERE id_convocatoria = lc.id_convocatoria) as entidades_financieras
        FROM licitaciones_cabecera lc
        {where_sql}
        ORDER BY lc.fecha_publicacion DESC
    """)
    
    return sql, params

@router.post("")
def generate_export_file(req: ExportRequest, db: Session = Depends(get_db)):
    try:
        print(f"Export Request: {req.dict()}") # Debug log
        
        # Build query
        sql, params = build_query(req)
        
        # In exports.py, build_query returns a raw string or text() object? 
        # If it returns text(...), bool() fails.
        # We should assume if build_query returns, it's valid, unless it returns None.
        
        if sql is None:
             raise HTTPException(status_code=400, detail="No selection provided")

        # Load data into DataFrame
        print("Executing SQL query...") # Debug log
        # Ensure connection is valid
        # pd.read_sql with SQLAlchemy connection
        df = pd.read_sql(sql, db.bind, params=params)
        print(f"Data loaded. Rows: {len(df)}") # Debug log

        if df.empty:
             raise HTTPException(status_code=404, detail="No matching records found to export")

        # --- Calculations / Aggregations ---
        total_items = len(df)
        
        # Status Stats
        status_counts = df['estado_proceso'].value_counts()
        status_stats = []
        for status, count in status_counts.items():
            pct = (count / total_items) * 100
            status_stats.append({"Estado": status, "Cantidad": count, "Porcentaje": f"{pct:.1f}%"})
        df_status = pd.DataFrame(status_stats)

        # Category Stats
        cat_counts = df['categoria'].value_counts().reset_index()
        cat_counts.columns = ['Categoría', 'Cantidad']
        
        # Dept Stats (Top 10)
        dept_counts = df['departamento'].value_counts().head(10).reset_index()
        dept_counts.columns = ['Departamento', 'Cantidad']

        filename_prefix = f"reporte_seace_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # --- Output Generation ---

        if req.format == 'csv':
            # CSV Just Raw Data
            stream = io.StringIO()
            df.to_csv(stream, index=False)
            response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
            response.headers["Content-Disposition"] = f"attachment; filename={filename_prefix}.csv"
            return response

        elif req.format == 'excel':
            stream = io.BytesIO()
            with pd.ExcelWriter(stream, engine='openpyxl') as writer:
                # Sheet 1: Resumen
                pd.DataFrame([{"Total Licitaciones": total_items}]).to_excel(writer, sheet_name='Resumen', startrow=0, index=False)
                
                # Write aggregated tables with spacing
                row = 3
                df_status.to_excel(writer, sheet_name='Resumen', startrow=row, index=False)
                row += len(df_status) + 3
                
                cat_counts.to_excel(writer, sheet_name='Resumen', startrow=row, index=False)
                row += len(cat_counts) + 3
                
                dept_counts.to_excel(writer, sheet_name='Resumen', startrow=row, index=False)

                # Sheet 2: Data
                df.to_excel(writer, sheet_name='Detalle', index=False)
                
            stream.seek(0)
            response = StreamingResponse(stream, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            response.headers["Content-Disposition"] = f"attachment; filename={filename_prefix}.xlsx"
            return response

        elif req.format == 'pdf':
            stream = io.BytesIO()
            doc = SimpleDocTemplate(stream, pagesize=landscape(A4))
            elements = []
            styles = getSampleStyleSheet()
            
            # Title
            title_style = styles['Title']
            title_style.textColor = colors.HexColor("#1e3a8a")
            elements.append(Paragraph("Reporte de Licitaciones SEACE", title_style))
            elements.append(Spacer(1, 10))
            elements.append(Paragraph(f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal']))
            elements.append(Paragraph(f"Total de registros: {total_items}", styles['Normal']))
            elements.append(Spacer(1, 20))

            # Helper to create tables from DF
            def create_pdf_table(dataframe, title):
                data = [dataframe.columns.tolist()] + dataframe.values.tolist()
                table = Table(data)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2563EB")),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#eff6ff")),
                    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#bfdbfe")),
                ]))
                return table

            # Summaries Section
            elements.append(Paragraph("Resumen Ejecutivo", styles['Heading2']))

            # Status Table
            elements.append(Paragraph("Distribución por Estado", styles['Heading3']))
            if not df_status.empty:
                elements.append(create_pdf_table(df_status, "Estados"))
            elements.append(Spacer(1, 15))

            # Category Table
            elements.append(Paragraph("Distribución por Categoría", styles['Heading3']))
            if not cat_counts.empty:
                elements.append(create_pdf_table(cat_counts, "Categorías"))
            elements.append(Spacer(1, 20))

            # Detailed List (Limited to first 50)
            elements.append(Paragraph("Detalle de Licitaciones (Primeros 100 registros)", styles['Heading2']))
            
            list_df = df[['nomenclatura', 'comprador', 'estado_proceso', 'monto_estimado']].head(100)
            list_df.columns = ['Nomenclatura', 'Comprador', 'Estado', 'Monto (S/)']
            
            # Truncate long text
            list_df['Nomenclatura'] = list_df['Nomenclatura'].apply(lambda x: (str(x)[:40] + '...') if x and len(str(x)) > 40 else str(x))
            list_df['Comprador'] = list_df['Comprador'].apply(lambda x: (str(x)[:30] + '...') if x and len(str(x)) > 30 else str(x))
            
            data = [list_df.columns.tolist()] + list_df.values.tolist()
            
            # Adjust column widths
            col_widths = [250, 200, 100, 100]
            
            table = Table(data, colWidths=col_widths)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ]))
            
            elements.append(table)
            
            doc.build(elements)
            stream.seek(0)
            
            response = StreamingResponse(stream, media_type="application/pdf")
            response.headers["Content-Disposition"] = f"attachment; filename={filename_prefix}.pdf"
            return response

    except Exception as e:
        print(f"EXPORT ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
