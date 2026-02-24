"""
Raw SQL licitaciones endpoint - bypasses SQLAlchemy mapper issues
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.data.financial_entities import ENTIDADES_FINANCIERAS
from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.models.user import User
from app.utils.dependencies import get_current_user
import uuid

router = APIRouter(prefix="/api/licitaciones", tags=["Licitaciones"])


@router.get("/suggestions")
def get_search_suggestions(
    query: str = Query(..., min_length=3),
    db: Session = Depends(get_db)
):
    """
    Get autocomplete suggestions for Universal Search.
    Searches: Comprador, Nomenclatura, Descripcion, RUC Ganador, Ganador Name, Entidad Financiera.
    """
    try:
        query_upper = query.upper().strip()
        # Restore wildcard search for comprehensive matches (substrings)
        # Keeping UNION ALL + LIMIT to maintain performance
        search_pattern = f"%{query_upper}%"
        
        suggestions = []
        
        # 1. Search Entidades, Nomenclaturas, Descripciones, Ubicaciones
        # MySQL requires parentheses for LIMIT within UNION
        sql_entidad = text("""
            (SELECT TRIM(comprador) FROM licitaciones_cabecera WHERE comprador LIKE :pattern LIMIT 5)
            UNION ALL
            (SELECT TRIM(nomenclatura) FROM licitaciones_cabecera WHERE nomenclatura LIKE :pattern LIMIT 5)
            UNION ALL
            (SELECT ocid FROM licitaciones_cabecera WHERE ocid LIKE :pattern LIMIT 5)
            UNION ALL
            (SELECT TRIM(departamento) FROM licitaciones_cabecera WHERE departamento LIKE :pattern LIMIT 3)
            UNION ALL
            (SELECT SUBSTRING(descripcion FROM 1 FOR 60) FROM licitaciones_cabecera WHERE descripcion LIKE :pattern LIMIT 3)
        """)
        entidad_rows = db.execute(sql_entidad, {"pattern": search_pattern}).fetchall()
        for row in entidad_rows:
            if row[0]:
                val = row[0]
                type_label = "General"
                val_upper = str(val).upper()
                if len(val) == 2 and val.isdigit(): type_label = "Departamento"
                elif "MUNICIPALIDAD" in val_upper or "GOBIERNO" in val_upper or "MINISTERIO" in val_upper: type_label = "Entidad"
                elif "-" in val and any(c.isdigit() for c in val): type_label = "Código"
                elif len(val) > 20 and " " in val: type_label = "Descripción"
                else: type_label = "Ubicación/Otro"
                
                suggestions.append({"value": val, "type": type_label})

        # 2. Search RUCs and Proveedores (Adjudicaciones)
        sql_details = text("""
            SELECT provider, type_label FROM (
                (SELECT TRIM(ganador_nombre) as provider, 'Proveedor' as type_label FROM licitaciones_adjudicaciones WHERE ganador_nombre LIKE :pattern LIMIT 5)
                UNION ALL
                (SELECT ganador_ruc as provider, 'RUC' as type_label FROM licitaciones_adjudicaciones WHERE ganador_ruc LIKE :pattern LIMIT 5)
                UNION ALL
                (SELECT TRIM(entidad_financiera) as provider, 'Banco' as type_label FROM licitaciones_adjudicaciones WHERE entidad_financiera LIKE :pattern LIMIT 3)
                UNION ALL
                (SELECT TRIM(nombre_miembro) as provider, 'Consorciado' as type_label FROM detalle_consorcios WHERE nombre_miembro LIKE :pattern LIMIT 10)
                UNION ALL
                (SELECT ruc_miembro as provider, 'RUC Consorciado' as type_label FROM detalle_consorcios WHERE ruc_miembro LIKE :pattern LIMIT 5)
            ) as sub
        """)
        detail_rows = db.execute(sql_details, {"pattern": search_pattern}).fetchall()
        for row in detail_rows:
            if row[0]:
                suggestions.append({"value": row[0], "type": row[1]})
        
        # Deduplicate
        seen = set()
        unique_results = []
        for s in suggestions:
            if s['value'] not in seen:
                seen.add(s['value'])
                unique_results.append(s)
        
        return unique_results[:10]
    except Exception as e:
        import traceback
        traceback.print_exc()
        return [{"value": f"Error: {str(e)}", "type": "Error"}]

@router.get("/filters/all")
def get_all_filters(db: Session = Depends(get_db)):
    """
    Get all available filter options. Returns defaults if DB is empty to prevent empty UI.
    """
    # Fix UnboundLocalError by explicitly referencing global or assigning local
    from app.data.financial_entities import ENTIDADES_FINANCIERAS as ALL_ENTITIES

    DEFAULTS = {
        "departamentos": ["AMAZONAS", "ANCASH", "APURIMAC", "AREQUIPA", "AYACUCHO", "CAJAMARCA", "CALLAO", 
                         "CUSCO", "HUANCAVELICA", "HUANUCO", "ICA", "JUNIN", "LA LIBERTAD", "LAMBAYEQUE",  
                         "LIMA", "LORETO", "MADRE DE DIOS", "MOQUEGUA", "PASCO", "PIURA", "PUNO", 
                         "SAN MARTIN", "TACNA", "TUMBES", "UCAYALI"],
        "estados": ["CONVOCADO", "ADJUDICADO", "CONTRATADO", "NULO", "DESIERTO", "CANCELADO", "SUSPENDIDO"],
        "categorias": ["BIENES", "SERVICIOS", "OBRAS", "CONSULTORIA DE OBRAS"],
        "aseguradoras": ALL_ENTITIES, # Dynamic from app/data/financial_entities.py
        "anios": [2026, 2025, 2024],
        "entidades": [],
        "tipos_garantia": [],
        "tipos_entidad": []
    }

    try:
        # 1. Departamentos
        depts = db.execute(text("SELECT DISTINCT UPPER(TRIM(departamento)) FROM licitaciones_cabecera WHERE departamento IS NOT NULL AND TRIM(departamento) != '' ORDER BY 1")).fetchall()
        departamentos = [r[0] for r in depts if r[0]]
        if not departamentos: departamentos = DEFAULTS["departamentos"]

        # 2. Categorias
        cats_raw = db.execute(text("SELECT DISTINCT UPPER(TRIM(categoria)) FROM licitaciones_cabecera WHERE categoria IS NOT NULL AND TRIM(categoria) != '' ORDER BY 1")).fetchall()
        
        # Normalization Map
        CAT_MAP = {
            'GOODS': 'BIENES',
            'WORKS': 'OBRAS',
            'SERVICES': 'SERVICIOS',
            'CONSULTING SERVICES': 'CONSULTORIA DE OBRAS',
            'CONSULTORIA': 'CONSULTORIA DE OBRAS'
        }
        
        normalized_cats = set()
        for r in cats_raw:
            val = r[0]
            if val:
                # Normalize if in map, otherwise keep original
                norm_val = CAT_MAP.get(val, val)
                normalized_cats.add(norm_val)
                
        categorias = sorted(list(normalized_cats))
        if not categorias: categorias = DEFAULTS["categorias"]

        # 3. Estados
        ests = db.execute(text("SELECT DISTINCT UPPER(TRIM(estado_proceso)) FROM licitaciones_cabecera WHERE estado_proceso IS NOT NULL AND TRIM(estado_proceso) != '' ORDER BY 1")).fetchall()
        estados = [r[0] for r in ests if r[0]]
        if not estados: estados = DEFAULTS["estados"]

        # 4. Aseguradoras in adjudicaciones
        # FORCE STATIC CLEAN LIST: We do not query the DB for this to avoid dirty data.
        # The normalization logic handles the search mapping.
        aseguradoras = ALL_ENTITIES
        if not aseguradoras: aseguradoras = DEFAULTS["aseguradoras"]

        # NEW: 5. Periodos (Años)
        # User requested to strictly define years as 2024, 2025, 2026
        anios = [2026, 2025, 2024]

        # NEW: 6. Entidades (Comprador) - Now using validated static list (2964 entities)
        from app.data.entidades_list import ENTIDADES_COMPRADORAS
        entidades = ENTIDADES_COMPRADORAS

        # NEW: 7. Tipos de Garantia
        garantia_sql = text("SELECT DISTINCT UPPER(TRIM(tipo_garantia)) FROM licitaciones_adjudicaciones WHERE tipo_garantia IS NOT NULL AND TRIM(tipo_garantia) != ''")
        raw_garantias = [r[0] for r in db.execute(garantia_sql).fetchall() if r[0]]
        
        if not raw_garantias:
             raw_garantias = ["CARTA FIANZA", "POLIZA DE CAUCION", "RETENCION", "FIDEICOMISO", "CERTIFICADO BANCARIO"]
             
        garantias_set = set()
        for g in raw_garantias:
            parts = [p.strip() for p in g.split('|')]
            garantias_set.update(parts)
        tipos_garantia = sorted(list(garantias_set))

        # NEW: 8. Tipos de Procedimiento (For Dashboard)
        proc_sql = text("SELECT DISTINCT UPPER(TRIM(tipo_procedimiento)) FROM licitaciones_cabecera WHERE tipo_procedimiento IS NOT NULL AND TRIM(tipo_procedimiento) != '' ORDER BY 1")
        tipos_entidad = [r[0] for r in db.execute(proc_sql).fetchall() if r[0]]
        
        return {
            "departamentos": departamentos,
            "categorias": categorias,
            "estados": estados,
            "aseguradoras": aseguradoras,
            "anios": anios,
            "entidades": entidades,
            "tipos_garantia": tipos_garantia,
            "tipos_entidad": tipos_entidad
        }
    except Exception as e:
        print(f"Error getting filters: {e}")
        import traceback
        traceback.print_exc()
        return DEFAULTS

@router.get("")
def get_licitaciones(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    departamento: Optional[str] = Query(None),
    provincia: Optional[str] = Query(None),
    distrito: Optional[str] = Query(None),
    anio: Optional[int] = Query(None),
    mes: Optional[str] = Query(None),
    tipo_garantia: Optional[str] = Query(None),
    entidad_financiera: Optional[str] = Query(None),
    comprador: Optional[str] = Query(None),
    tipo_procedimiento: Optional[str] = Query(None), # Manual/User requested filter
    origen: Optional[str] = Query(None), # New parameter
    db: Session = Depends(get_db)
):
    """
    Get paginated list of licitaciones using RAW SQL.
    Returns data from licitaciones_cabecera table.
    """
    
    try:
        # Build WHERE clause
        where_clauses = []
        params = {}
        

        if search:
            # OPTIMIZED APP-SIDE JOIN STRATEGY
            # 1. Execute subqueries separately to get IDs
            # This avoids MySQL optimizer issues with complex UNION joins
            
            found_ids = set()
            limit_subquery = 200 
            
            # A. Fulltext Search
            terms = [f"+{t.replace('*', '')}*" for t in search.strip().split() if len(t) > 1]
            if terms:
                boolean_search = " ".join(terms)
                try:
                    ft_sql = text("""
                        SELECT id_convocatoria FROM licitaciones_cabecera 
                        WHERE MATCH(nomenclatura, descripcion, comprador, id_convocatoria, ubicacion_completa) 
                        AGAINST(:search_ft IN BOOLEAN MODE)
                        LIMIT :limit
                    """)
                    ft_ids = db.execute(ft_sql, {"search_ft": boolean_search, "limit": limit_subquery}).scalars().all()
                    found_ids.update(ft_ids)
                except Exception as e:
                    print(f"Fulltext Error: {e}")

            # B. Relational Search (Split into granular lookups)
            search_like = f"%{search}%"
            try:
                # B1. Search Consortium Members directly (Get IDs first)
                cons_sql = text("""
                    SELECT id_contrato FROM detalle_consorcios 
                    WHERE UPPER(nombre_miembro) LIKE :search OR ruc_miembro LIKE :search
                    LIMIT :limit
                """)
                cons_contract_ids = db.execute(cons_sql, {"search": search_like, "limit": limit_subquery}).scalars().all()
                
                if cons_contract_ids:
                    # Get Convocatorias for these contracts
                    # Use DISTINCT to avoid duplicates
                    # Manual expansion for raw SQL
                    c_in_params = [f":cid_c{i}" for i in range(len(cons_contract_ids))]
                    c_params = {f"cid_c{i}": cid for i, cid in enumerate(cons_contract_ids)}
                    
                    conv_from_cons_sql = text(f"""
                        SELECT DISTINCT id_convocatoria FROM licitaciones_adjudicaciones 
                        WHERE id_contrato IN ({','.join(c_in_params)}) OR id_adjudicacion IN ({','.join(c_in_params)})
                    """) 
                    
                    c_ids = db.execute(conv_from_cons_sql, c_params).scalars().all()
                    found_ids.update(c_ids)

                # B2. Search Adjudication Details (Winners, Banks, guarantees)
                adj_sql = text("""
                    SELECT id_convocatoria FROM licitaciones_adjudicaciones 
                    WHERE (
                        UPPER(ganador_nombre) LIKE :search OR 
                        ganador_ruc LIKE :search OR 
                        UPPER(entidad_financiera) LIKE :search OR 
                        id_contrato LIKE :search
                    )
                    LIMIT :limit
                """)
                adj_ids = db.execute(adj_sql, {"search": search_like, "limit": limit_subquery}).scalars().all()
                found_ids.update(adj_ids)
                
            except Exception as e:
                print(f"Relational Search Error: {e}")

            # B3. Search Nomenclatura, Descripcion & OCID (Specific Fallback for Substrings)
            # Fulltext might miss "SM-3" if tokens are split, or fail on stopwords like "DE"/"EN" in BOOLEAN MODE. 
            # LIKE ensures we find it.
            try:
                cab_sql = text("""
                    SELECT id_convocatoria FROM licitaciones_cabecera 
                    WHERE nomenclatura LIKE :search OR descripcion LIKE :search OR ocid LIKE :search
                    LIMIT :limit
                """)
                cab_ids = db.execute(cab_sql, {"search": search_like, "limit": limit_subquery}).scalars().all()
                found_ids.update(cab_ids)
            except Exception as e:
                print(f"Cabecera Search Error: {e}")
            
            # C. Apply Filter
            if found_ids:
                # Manually expand IN clause for raw SQL text()
                in_params = [f":id{i}" for i in range(len(found_ids))]
                where_clauses.append(f"licitaciones_cabecera.id_convocatoria IN ({','.join(in_params)})")
                for i, id_val in enumerate(found_ids):
                    params[f"id{i}"] = id_val
            else:
                # Force no result if search yields nothing
                where_clauses.append("1=0")

        if estado:
            where_clauses.append("UPPER(TRIM(estado_proceso)) = :estado")
            params['estado'] = estado
        if categoria:
            # Reverse Normalization for Search (Handle English/Spanish mix)
            cat_search = [categoria]
            if categoria == 'BIENES': cat_search.append('GOODS')
            elif categoria == 'OBRAS': cat_search.append('WORKS')
            elif categoria == 'SERVICIOS': cat_search.append('SERVICES')
            elif categoria == 'CONSULTORIA DE OBRAS': 
                cat_search.extend(['CONSULTING SERVICES', 'CONSULTORIA'])
            
            if len(cat_search) > 1:
                where_clauses.append("UPPER(TRIM(categoria)) IN :categoria_list")
                params['categoria_list'] = tuple(cat_search)
            else:
                where_clauses.append("UPPER(TRIM(categoria)) = :categoria")
                params['categoria'] = categoria
        if departamento:
            where_clauses.append("UPPER(TRIM(departamento)) = :departamento")
            params['departamento'] = departamento
        if provincia:
            where_clauses.append("UPPER(TRIM(provincia)) = :provincia")
            params['provincia'] = provincia
        if distrito:
            where_clauses.append("UPPER(TRIM(distrito)) = :distrito")
            params['distrito'] = distrito
        if anio:
            where_clauses.append("anio = :anio")
            params['anio'] = anio
        if comprador:
            where_clauses.append("UPPER(TRIM(comprador)) = :comprador")
            params['comprador'] = comprador
        if tipo_procedimiento:
            # 1. Symbol Normalization (Ordinal 'º' -> Degree '°')
            normalized_proc = tipo_procedimiento.upper().replace('º', '°').replace('Nº', 'N°')
            
            # 2. Spacing Normalization (Handle "N° 123" vs "N°123")
            # We compare both sides with 'N° ' replaced by 'N°' to ignore that specific space.
            where_clauses.append("""
                REPLACE(UPPER(TRIM(tipo_procedimiento)), 'N° ', 'N°') = REPLACE(:tipo_procedimiento, 'N° ', 'N°')
            """)
            params['tipo_procedimiento'] = normalized_proc
            
        # Origin Filter (Manual vs Automatic) - Robust Implementation
        if origen and origen != "Todos":
            origen_norm = origen.lower().strip()
            
            if origen_norm == "manuales":
                # Manual tenders do not have an origin file (ETL sets this)
                where_clauses.append("archivo_origen IS NULL")
            elif origen_norm in ["automático", "automatico"]:
                # Automatic tenders come from JSON files
                where_clauses.append("archivo_origen IS NOT NULL")



        if mes:
            # Handle month filtering (1-12)
            try:
                mes_int = int(mes)
                where_clauses.append("EXTRACT(MONTH FROM fecha_publicacion) = :mes")
                params['mes'] = mes_int
            except ValueError:
                pass # Ignore invalid month inputs
            
        # Advanced Filters: Subqueries for Adjudicaciones
        if tipo_garantia:
            where_clauses.append("""
                EXISTS (
                    SELECT 1 FROM licitaciones_adjudicaciones la 
                    WHERE la.id_convocatoria = licitaciones_cabecera.id_convocatoria 
                    AND UPPER(la.tipo_garantia) LIKE :garantia
                )
            """)
            params['garantia'] = f"%{tipo_garantia.upper()}%"
            
        if entidad_financiera:
            # Handle Aliases
            search_entidad = entidad_financiera.upper().strip()
            
            # Special BCP Hybrid Match (Includes "MI" / "BPC")
            if "BANCO DE CREDITO" in search_entidad or search_entidad == "BCP":
                where_clauses.append("""
                    EXISTS (
                        SELECT 1 FROM licitaciones_adjudicaciones la 
                        WHERE la.id_convocatoria = licitaciones_cabecera.id_convocatoria 
                        AND (UPPER(la.entidad_financiera) LIKE '%CREDITO%' 
                             OR UPPER(la.entidad_financiera) LIKE '%BCP%'
                             OR UPPER(la.entidad_financiera) = 'MI'
                             OR UPPER(la.entidad_financiera) LIKE '%| MI'
                             OR UPPER(la.entidad_financiera) LIKE '%MI |%')
                    )
                """)
            elif search_entidad == "BBVA":
                where_clauses.append("""
                    EXISTS (
                        SELECT 1 FROM licitaciones_adjudicaciones la 
                        WHERE la.id_convocatoria = licitaciones_cabecera.id_convocatoria 
                        AND (UPPER(la.entidad_financiera) LIKE '%BBVA%' OR UPPER(la.entidad_financiera) LIKE '%CONTINENTAL%')
                    )
                """)
            elif search_entidad == "INTERBANK":
                where_clauses.append("""
                    EXISTS (
                        SELECT 1 FROM licitaciones_adjudicaciones la 
                        WHERE la.id_convocatoria = licitaciones_cabecera.id_convocatoria 
                        AND (UPPER(la.entidad_financiera) LIKE '%INTERBANK%' OR UPPER(la.entidad_financiera) LIKE '%INTERNACIONAL%')
                    )
                """)
            elif search_entidad == "CESCE":
                where_clauses.append("""
                    EXISTS (
                        SELECT 1 FROM licitaciones_adjudicaciones la 
                        WHERE la.id_convocatoria = licitaciones_cabecera.id_convocatoria 
                        AND (UPPER(la.entidad_financiera) LIKE '%CESCE%' OR UPPER(la.entidad_financiera) LIKE '%SECREX%')
                    )
                """)
            elif search_entidad == "BANCOM":
                 where_clauses.append("""
                    EXISTS (
                        SELECT 1 FROM licitaciones_adjudicaciones la 
                        WHERE la.id_convocatoria = licitaciones_cabecera.id_convocatoria 
                        AND (UPPER(la.entidad_financiera) LIKE '%BANCOM%' OR UPPER(la.entidad_financiera) = 'M')
                    )
                """)
            elif "PICHINCHA" in search_entidad:
                where_clauses.append("""
                    EXISTS (
                        SELECT 1 FROM licitaciones_adjudicaciones la 
                        WHERE la.id_convocatoria = licitaciones_cabecera.id_convocatoria 
                        AND (UPPER(la.entidad_financiera) LIKE '%PICHINCHA%' OR UPPER(la.entidad_financiera) LIKE '%FINANCIERO%')
                    )
                """)
            elif "SCOTIABANK" in search_entidad:
                 where_clauses.append("""
                    EXISTS (
                        SELECT 1 FROM licitaciones_adjudicaciones la 
                        WHERE la.id_convocatoria = licitaciones_cabecera.id_convocatoria 
                        AND (UPPER(la.entidad_financiera) LIKE '%SCOTIABANK%' OR UPPER(la.entidad_financiera) LIKE '%SCOTIA%')
                    )
                """)
            elif "GNB" in search_entidad:
                 where_clauses.append("""
                    EXISTS (
                        SELECT 1 FROM licitaciones_adjudicaciones la 
                        WHERE la.id_convocatoria = licitaciones_cabecera.id_convocatoria 
                        AND (UPPER(la.entidad_financiera) LIKE '%GNB%')
                    )
                """)
            elif "COMERCIO" in search_entidad:
                 where_clauses.append("""
                    EXISTS (
                        SELECT 1 FROM licitaciones_adjudicaciones la 
                        WHERE la.id_convocatoria = licitaciones_cabecera.id_convocatoria 
                        AND (UPPER(la.entidad_financiera) LIKE '%COMERCIO%')
                    )
                """)
            else:
                where_clauses.append("""
                    EXISTS (
                        SELECT 1 FROM licitaciones_adjudicaciones la 
                        WHERE la.id_convocatoria = licitaciones_cabecera.id_convocatoria 
                        AND UPPER(la.entidad_financiera) LIKE :entidad
                    )
                """)
                params['entidad'] = f"%{search_entidad}%"

        where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        
        # Get total count
        count_sql = text(f"""
            SELECT COUNT(DISTINCT id_convocatoria)
            FROM licitaciones_cabecera
            {where_sql}
        """)
        
        total = db.execute(count_sql, params).scalar() or 0
        # Get paginated data
        offset = (page - 1) * limit
        data_sql = text(f"""
            SELECT 
                lc.id_convocatoria,
                lc.ocid,
                lc.nomenclatura,
                lc.descripcion,
                lc.comprador,
                lc.categoria,
                lc.tipo_procedimiento,
                lc.monto_estimado,
                lc.moneda,
                lc.fecha_publicacion,
                lc.estado_proceso,
                lc.ubicacion_completa,
                lc.departamento,
                lc.provincia,
                lc.distrito,
                lc.entidad_ruc
            FROM licitaciones_cabecera lc
            {where_sql.replace('licitaciones_cabecera', 'lc') if where_sql else ''}
            ORDER BY lc.fecha_publicacion DESC
            LIMIT :limit OFFSET :offset
        """)
        
        params['limit'] = limit
        params['offset'] = offset
        
        rows = db.execute(data_sql, params).fetchall()
        
        # Format results
        items = []
        for row in rows:
            items.append({
                "id_convocatoria": row[0],
                "ocid": row[1],
                "nomenclatura": row[2],
                "descripcion": row[3],
                "comprador": row[4],
                "categoria": row[5],
                "tipo_procedimiento": row[6],
                "monto_estimado": float(row[7]) if row[7] else 0,
                "moneda": row[8],
                "fecha_publicacion": row[9].isoformat() if row[9] else None,
                "estado_proceso": row[10],
                "ubicacion_completa": row[11],
                "departamento": row[12],
                "provincia": row[13],
                "distrito": row[14],
                "entidad_ruc": row[15],
                # Default empty fields (filled by batch fetch)
                "ganador_nombre": None,
                "ganador_ruc": None,
                "entidades_financieras": None,
                "tipo_garantia": None,
                "monto_total_adjudicado": 0,
                "total_adjudicaciones": 0,
                "fecha_adjudicacion": None,
                "id_contrato": None,
                "nombres_consorciados": None,
                "rucs_consorciados": None,
                "miembros_consorcio": []
            })
            
        # --- BATCH FETCH EVERYTHING ---
        visible_ids = [item["id_convocatoria"] for item in items]
        
        if visible_ids:
            # 1. Fetch Adjudication Details (Batch)
            adj_in_params = [f":aid{i}" for i in range(len(visible_ids))]
            adj_params = {f"aid{i}": aid for i, aid in enumerate(visible_ids)}
            
            batch_adj_sql = text(f"""
                SELECT 
                    id_convocatoria, ganador_nombre, ganador_ruc, 
                    entidad_financiera, tipo_garantia, monto_adjudicado, 
                    fecha_adjudicacion, id_contrato, nombres_consorciados, rucs_consorciados
                FROM licitaciones_adjudicaciones
                WHERE id_convocatoria IN ({','.join(adj_in_params)})
            """)
            
            adj_rows = db.execute(batch_adj_sql, adj_params).fetchall()
            
            adj_map = {}
            for r in adj_rows:
                cid = r[0]
                if cid not in adj_map: adj_map[cid] = []
                adj_map[cid].append(r)
                
            for item in items:
                cid = item["id_convocatoria"]
                if cid in adj_map:
                    adjs = adj_map[cid]
                    item["ganador_nombre"] = " | ".join(sorted(list(set(filter(None, [a[1] for a in adjs])))))
                    item["ganador_ruc"] = " | ".join(sorted(list(set(filter(None, [a[2] for a in adjs])))))
                    item["entidades_financieras"] = " | ".join(sorted(list(set(filter(None, [a[3] for a in adjs])))))
                    item["tipo_garantia"] = ",".join(sorted(list(set(filter(None, [a[4] for a in adjs])))))
                    item["monto_total_adjudicado"] = sum([float(a[5]) for a in adjs if a[5]])
                    item["total_adjudicaciones"] = len(adjs)
                    # For date/id_contrato, pick the first one if multiple items exist (simplified list view)
                    first = adjs[0]
                    item["fecha_adjudicacion"] = first[6].isoformat() if first[6] else None
                    item["id_contrato"] = first[7]
                    item["nombres_consorciados"] = " | ".join(sorted(list(set(filter(None, [a[8] for a in adjs])))))
                    item["rucs_consorciados"] = " | ".join(sorted(list(set(filter(None, [a[9] for a in adjs])))))

            # 2. Fetch Consortium Members (Batch + UNION Optimized)
            cons_in_params = [f":cid{i}" for i in range(len(visible_ids))]
            batch_cons_params = {f"cid{i}": cid for i, cid in enumerate(visible_ids)}
            
            batch_cons_sql = text(f"""
                (
                    SELECT la.id_convocatoria, dc.nombre_miembro, dc.ruc_miembro, dc.porcentaje_participacion
                    FROM licitaciones_adjudicaciones la
                    JOIN detalle_consorcios dc ON dc.id_contrato = la.id_contrato
                    WHERE la.id_convocatoria IN ({','.join(cons_in_params)})
                )
                UNION
                (
                    SELECT la.id_convocatoria, dc.nombre_miembro, dc.ruc_miembro, dc.porcentaje_participacion
                    FROM licitaciones_adjudicaciones la
                    JOIN detalle_consorcios dc ON dc.id_contrato = la.id_adjudicacion
                    WHERE la.id_convocatoria IN ({','.join(cons_in_params)})
                )
            """)
            
            cons_rows = db.execute(batch_cons_sql, batch_cons_params).fetchall()
            
            cons_map = {}
            for r in cons_rows:
                cid = r[0]
                if cid not in cons_map: cons_map[cid] = []
                cons_map[cid].append({
                    "nombre_miembro": r[1],
                    "ruc_miembro": r[2],
                    "porcentaje_participacion": float(r[3]) if r[3] else 0
                })
            
            for item in items:
                if item["id_convocatoria"] in cons_map:
                    item["miembros_consorcio"] = cons_map[item["id_convocatoria"]]
        
        # Calculate pagination
        total_pages = (total + limit - 1) // limit if limit > 0 else 0
        
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "items": items
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "error": str(e),
            "total": 0,
            "page": page,
            "limit": limit,
            "total_pages": 0,
            "items": []
        }


@router.get("/locations")
def get_locations(
    departamento: Optional[str] = Query(None),
    provincia: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get cascading location options (Static Data Version)
    Uses app/data/ubigeo_data.py to ensure full coverage of Peru's geography.
    """
    try:
        from app.data.ubigeo_data import UBIGEO_PERU
        
        provincias = []
        distritos = []

        if departamento:
            deploy_norm = departamento.upper().strip()
            # If dept exists in our static map, get its provinces
            if deploy_norm in UBIGEO_PERU:
                provincias = sorted(list(UBIGEO_PERU[deploy_norm].keys()))
                
                if provincia:
                    prov_norm = provincia.upper().strip()
                    # If prov exists in that dept, get its districts
                    if prov_norm in UBIGEO_PERU[deploy_norm]:
                        distritos = sorted(UBIGEO_PERU[deploy_norm][prov_norm])
        
        return {
            "departamentos": sorted(list(UBIGEO_PERU.keys())),
            "provincias": provincias,
            "distritos": distritos
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "error": str(e),
            "departamentos": [],
            "provincias": [],
            "distritos": []
        }


@router.get("/{id_convocatoria}")
def get_licitacion_detail(
    id_convocatoria: str,
    db: Session = Depends(get_db)
):
    """
    Get licitacion detail with adjudicaciones.
    """
    print(f"DEBUG: get_licitacion_detail received id='{id_convocatoria}' type={type(id_convocatoria)}")
    
    try:
        id_clean = id_convocatoria.strip()

        # Get main licitacion data
        main_sql = text("""
            SELECT 
                id_convocatoria, ocid, nomenclatura, descripcion,
                comprador, categoria, tipo_procedimiento,
                monto_estimado, moneda, fecha_publicacion,
                estado_proceso, ubicacion_completa,
                departamento, provincia, distrito,
                entidad_ruc
            FROM licitaciones_cabecera
            WHERE id_convocatoria = :id
        """)
        
        row = db.execute(main_sql, {"id": id_clean}).fetchone()
        
        # Fallback LIKE if not found
        if not row:
            print(f"DEBUG: Exact match failed via RAW SQL for '{id_clean}'. Trying LIKE.")
            like_sql = text("""
                SELECT 
                    id_convocatoria, ocid, nomenclatura, descripcion,
                    comprador, categoria, tipo_procedimiento,
                    monto_estimado, moneda, fecha_publicacion,
                    estado_proceso, ubicacion_completa,
                    departamento, provincia, distrito,
                    entidad_ruc
                FROM licitaciones_cabecera
                WHERE id_convocatoria LIKE :id_pattern
                LIMIT 1
            """)
            row = db.execute(like_sql, {"id_pattern": f"%{id_clean}%"}).fetchone()
        
        if not row:
            return {"error": "Not found"}
        
        licitacion = {
            "id_convocatoria": row[0],
            "ocid": row[1],
            "nomenclatura": row[2],
            "descripcion": row[3],
            "comprador": row[4],
            "categoria": row[5],
            "tipo_procedimiento": row[6],
            "monto_estimado": float(row[7]) if row[7] else 0,
            "moneda": row[8],
            "fecha_publicacion": row[9].isoformat() if row[9] else None,
            "estado_proceso": row[10],
            "ubicacion_completa": row[11],
            "departamento": row[12],
            "provincia": row[13],
            "distrito": row[14],
            "entidad_ruc": row[15]
        }
        
        # Get adjudicaciones
        adj_sql = text("""
            SELECT 
                id_adjudicacion, ganador_nombre, ganador_ruc,
                monto_adjudicado, fecha_adjudicacion,
                estado_item, entidad_financiera, tipo_garantia, moneda,
                id_contrato, url_pdf_cartafianza,
                url_pdf_contrato, url_pdf_consorcio
            FROM licitaciones_adjudicaciones
            WHERE id_convocatoria = :id
        """)
        
        # Use real ID from DB (row[0]) to match adjudicaciones
        real_id = licitacion["id_convocatoria"]
        adj_rows = db.execute(adj_sql, {"id": real_id}).fetchall()
        
        adjudicaciones = []
        for adj_row in adj_rows:
            adjudicaciones.append({
                "id_adjudicacion": adj_row[0],
                "ganador_nombre": adj_row[1],
                "ganador_ruc": adj_row[2],
                "monto_adjudicado": float(adj_row[3]) if adj_row[3] else 0,
                "fecha_adjudicacion": adj_row[4].isoformat() if adj_row[4] else None,
                "estado_item": adj_row[5],
                "entidad_financiera": adj_row[6],
                "tipo_garantia": adj_row[7],
                "moneda": adj_row[8],
                "id_contrato": adj_row[9],
                "url_pdf_cartafianza": adj_row[10],
                "url_pdf_contrato": adj_row[11],
                "url_pdf_consorcio": adj_row[12]
            })
        
        licitacion["adjudicaciones"] = adjudicaciones

        # --- NEW: Fetch Consorcios ---
        # --- NEW: Fetch Consorcios ---
        # Collect contract IDs and Adjudicacion IDs to fetch consorcios in batch
        all_ids = set()
        for adj in adjudicaciones:
            if adj.get("id_contrato"): 
                all_ids.add(str(adj["id_contrato"]).strip())
            if adj.get("id_adjudicacion"):
                all_ids.add(str(adj["id_adjudicacion"]).strip())
        
        if all_ids:
            # SQL to fetch consorcios
            # We use TRIM(CAST(...)) to be safe, matching against the set of IDs
            cons_sql = text("""
                SELECT 
                    TRIM(CAST(id_contrato AS CHAR)) as id_link,
                    ruc_miembro, nombre_miembro, 
                    porcentaje_participacion 
                FROM detalle_consorcios
                WHERE TRIM(CAST(id_contrato AS CHAR)) IN :ids
            """)
            
            # Execute with tuple of IDs
            cons_rows = db.execute(cons_sql, {"ids": tuple(all_ids)}).fetchall()
            
            # Group by id_link
            consorcios_map = {}
            for row in cons_rows:
                c_id = row[0]
                if c_id not in consorcios_map:
                    consorcios_map[c_id] = []
                
                consorcios_map[c_id].append({
                    "ruc_miembro": row[1],
                    "nombre_miembro": row[2],
                    "porcentaje_participacion": float(row[3]) if row[3] else 0
                })
            
            # Attach to adjudicaciones checking BOTH keys
            for adj in licitacion["adjudicaciones"]:
                c_id = str(adj.get("id_contrato") or '').strip()
                a_id = str(adj.get("id_adjudicacion") or '').strip()
                
                # Check match on id_contrato
                if c_id and c_id in consorcios_map:
                    adj["consorcios"] = consorcios_map[c_id]
                # Fallback: check match on id_adjudicacion
                elif a_id and a_id in consorcios_map:
                    adj["consorcios"] = consorcios_map[a_id]
                else:
                    adj["consorcios"] = []
        else:
            # Initialize empty list if no IDs
            for adj in licitacion["adjudicaciones"]:
                adj["consorcios"] = []

        # Calculate Totals
        total_monto = sum(item["monto_adjudicado"] for item in adjudicaciones)
        licitacion["monto_total_adjudicado"] = total_monto
        licitacion["total_adjudicaciones"] = len(adjudicaciones)

        return licitacion
        
    except Exception as e:
        print(f"ERROR Handled: {e}")
        import traceback
        traceback.print_exc()
        return {"error": f"Internal Error: {str(e)}"}






@router.get("/locations_old")
def get_locations_old(
    departamento: Optional[str] = Query(None),
    provincia: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get cascading location options (Raw Repo Version)
    """
    try:
        provincias = []
        distritos = []

        if departamento:
            # Normalize input
            dept_normalized = departamento.upper().strip()
            
            # Get Provincias
            prov_sql = text("""
                SELECT DISTINCT UPPER(TRIM(provincia)) 
                FROM licitaciones_cabecera 
                WHERE UPPER(TRIM(departamento)) = :dept AND provincia IS NOT NULL AND TRIM(provincia) != '' 
                ORDER BY 1
            """)
            provincias = [row[0] for row in db.execute(prov_sql, {"dept": dept_normalized}).fetchall() if row[0]]

            if provincia:
                # Normalize input
                prov_normalized = provincia.upper().strip()
                
                # Get Distritos
                dist_sql = text("""
                    SELECT DISTINCT UPPER(TRIM(distrito)) 
                    FROM licitaciones_cabecera 
                    WHERE UPPER(TRIM(departamento)) = :dept AND UPPER(TRIM(provincia)) = :prov AND distrito IS NOT NULL AND TRIM(distrito) != '' 
                    ORDER BY 1
                """)
                distritos = [row[0] for row in db.execute(dist_sql, {"dept": dept_normalized, "prov": prov_normalized}).fetchall() if row[0]]

        return {
            "provincias": provincias,
            "distritos": distritos
        }
    except Exception as e:
        return {"error": str(e)}

from pydantic import BaseModel
from typing import List, Optional

# --- Pydantic Models for Write Operations ---
class ConsorcioItem(BaseModel):
    nombre: Optional[str] = None
    ruc: Optional[str] = None
    porcentaje: Optional[float] = 0

class AdjudicacionItem(BaseModel):
    id_adjudicacion: Optional[str] = None
    ganador_nombre: Optional[str] = None
    ganador_ruc: Optional[str] = None
    monto_adjudicado: Optional[float] = 0
    fecha_adjudicacion: Optional[str] = None
    estado_item: Optional[str] = None
    entidad_financiera: Optional[str] = None
    tipo_garantia: Optional[str] = None
    id_contrato: Optional[str] = None
    moneda: Optional[str] = 'PEN'
    url_pdf_contrato: Optional[str] = None
    url_pdf_consorcio: Optional[str] = None
    url_pdf_cartafianza: Optional[str] = None
    consorcios: Optional[List[ConsorcioItem]] = []

class LicitacionCreate(BaseModel):
    id_convocatoria: Optional[str] = None
    ocid: Optional[str] = None
    nomenclatura: Optional[str] = None
    descripcion: str
    comprador: str
    categoria: Optional[str] = None
    tipo_procedimiento: Optional[str] = None
    monto_estimado: Optional[float] = 0
    moneda: Optional[str] = 'PEN'
    fecha_publicacion: Optional[str] = None
    estado_proceso: Optional[str] = None
    entidad_ruc: Optional[str] = None
    ubicacion_completa: Optional[str] = None
    departamento: Optional[str] = None
    provincia: Optional[str] = None
    distrito: Optional[str] = None
    adjudicaciones: Optional[List[AdjudicacionItem]] = []

# --- Write Endpoints ---

@router.post("")
def create_licitacion(licitacion: LicitacionCreate, db: Session = Depends(get_db)):
    """
    Create a new licitacion and its adjudicaciones (Raw SQL)
    """
    try:
        # 1. Generate ID (or use provided one)
        if licitacion.id_convocatoria and licitacion.id_convocatoria.strip():
             new_id = licitacion.id_convocatoria.strip()
        else:
             new_id = str(uuid.uuid4())
        
        # 2. Insert Header
        sql_header = text("""
            INSERT INTO licitaciones_cabecera (
                id_convocatoria, ocid, nomenclatura, descripcion, comprador, 
                entidad_ruc, categoria, tipo_procedimiento, monto_estimado, moneda, 
                fecha_publicacion, estado_proceso, ubicacion_completa, 
                departamento, provincia, distrito
            ) VALUES (
                :id, :ocid, :nom, :desc, :comp, 
                :ruc, :cat, :proc, :monto, :mon, 
                :fecha, :estado, :ubic, 
                :dept, :prov, :dist
            )
        """)
        
        ubicacion = licitacion.ubicacion_completa
        if not ubicacion:
             ubicacion = f"{licitacion.departamento or ''} - {licitacion.provincia or ''} - {licitacion.distrito or ''}"
        
        # Sanitize Dates (Remove ISO T/Z)
        def clean_date(d):
            if d and isinstance(d, str):
                return d.replace('T', ' ').replace('Z', '').split('.')[0]
            return d

        fecha_pub = clean_date(licitacion.fecha_publicacion)

        db.execute(sql_header, {
            "id": new_id,
            "ocid": licitacion.ocid,
            "nom": licitacion.nomenclatura,
            "desc": licitacion.descripcion,
            "comp": licitacion.comprador,
            "ruc": licitacion.entidad_ruc,
            "cat": licitacion.categoria,
            "proc": licitacion.tipo_procedimiento,
            "monto": licitacion.monto_estimado,
            "mon": licitacion.moneda,
            "fecha": fecha_pub,
            "estado": licitacion.estado_proceso,
            "ubic": ubicacion,
            "dept": licitacion.departamento,
            "prov": licitacion.provincia,
            "dist": licitacion.distrito
        })
        
        # 3. Insert Adjudicaciones
        if licitacion.adjudicaciones:
            sql_adj = text("""
                INSERT INTO licitaciones_adjudicaciones (
                    id_adjudicacion, id_convocatoria, ganador_nombre, ganador_ruc,
                    monto_adjudicado, fecha_adjudicacion, estado_item, 
                    entidad_financiera, tipo_garantia, id_contrato, moneda,
                    url_pdf_contrato, url_pdf_consorcio, url_pdf_cartafianza
                ) VALUES (
                    :id_adj, :id_conv, :nombre, :ruc, 
                    :monto, :fecha, :estado, 
                    :banco, :garantia, :contrato, :moneda,
                    :url_contrato, :url_consorcio, :url_fianza
                )
            """)
            
            for adj in licitacion.adjudicaciones:
                # Use provided ID or generate new one
                if adj.id_adjudicacion and adj.id_adjudicacion.strip():
                    adj_id = adj.id_adjudicacion.strip()
                else:
                    adj_id = str(uuid.uuid4())
                    
                fecha_adj = clean_date(adj.fecha_adjudicacion)

                db.execute(sql_adj, {
                    "id_adj": adj_id,
                    "id_conv": new_id,
                    "nombre": adj.ganador_nombre,
                    "ruc": adj.ganador_ruc,
                    "monto": adj.monto_adjudicado,
                    "fecha": fecha_adj,
                    "estado": adj.estado_item,
                    "banco": adj.entidad_financiera,
                    "garantia": adj.tipo_garantia,
                    "contrato": adj.id_contrato,
                    "moneda": adj.moneda,
                    "url_contrato": adj.url_pdf_contrato,
                    "url_consorcio": adj.url_pdf_consorcio,
                    "url_fianza": adj.url_pdf_cartafianza
                })

                # 4. Insert Consorcios (if any)
                if adj.consorcios:
                    cons_sql = text("""
                        INSERT INTO detalle_consorcios (
                            id_contrato, ruc_miembro, nombre_miembro, 
                            porcentaje_participacion, fecha_registro
                        ) VALUES (
                            :contrato, :ruc, :nombre, :pct, NOW()
                        )
                    """)
                    
                    # Use provided contract ID or fallback to Adjudication ID (for consistent linking)
                    c_id = adj.id_contrato if adj.id_contrato else adj_id

                    for cons in adj.consorcios:
                        db.execute(cons_sql, {
                            "contrato": c_id,
                            "ruc": cons.ruc,
                            "nombre": cons.nombre,
                            "pct": cons.porcentaje
                        })
        
        db.commit()
        
        # NOTIFICATION
        try:
            from app.routers.notifications import create_notification_internal
            
            meta = {
                "categoria": licitacion.categoria or "GENERAL",
                "ubicacion": ubicacion or "PERU",
                "monto": float(licitacion.monto_estimado or 0),
                "orcid": licitacion.ocid or new_id,
                "estadoAnterior": None,
                "estadoNuevo": None,
                "licitacionId": new_id
            }
            
            proc_type_notif = licitacion.tipo_procedimiento or "Licitación"
            msg = f"{proc_type_notif}\n\nSe ha registrado una nueva licitación:\n{licitacion.descripcion[:100]}..."
            
            create_notification_internal(
                title="Nueva Licitación Creada",
                message=msg,
                type="licitacion",
                priority="low",
                link=f"/seace/busqueda/{new_id}",
                metadata=meta
            )
        except Exception as e:
            print(f"Error creating notification: {e}")

        return {"message": "Success", "id_convocatoria": new_id, "id": new_id}
        
    except Exception as e:
        db.rollback()
        return {"error": str(e)}

@router.put("/{id}")
def update_licitacion(id: str, licitacion: LicitacionCreate, db: Session = Depends(get_db)):
    """
    Update existing licitacion (Raw SQL)
    """
    try:
        # Detect State Change
        old_state = "DESCONOCIDO"
        try:
            current = db.execute(text("SELECT estado_proceso FROM licitaciones_cabecera WHERE id_convocatoria = :id"), {"id": id}).fetchone()
            if current:
                old_state = current[0]
        except:
            pass
            
        # 2. Cleanup Old Adjudicaciones & Consorcios (MOVED UP to allow ID change)
        try:
             # Find contracts linked to this licitacion
             # Fetch both id_contrato and id_adjudicacion to cover all linking possibilities
             linked_data = db.execute(text("SELECT id_contrato, id_adjudicacion FROM licitaciones_adjudicaciones WHERE id_convocatoria = :id"), {"id": id}).fetchall()
             
             ids_to_remove = set()
             for r in linked_data:
                 if r[0]: ids_to_remove.add(str(r[0])) # Real Contract ID
                 if r[1]: 
                     adj_id = str(r[1])
                     ids_to_remove.add(adj_id) # Adjudication ID
                     ids_to_remove.add(f"GEN-{adj_id[:8]}") # Generated ID pattern
                     ids_to_remove.add(f"UPD-{adj_id[:8]}") # Update ID pattern

             if ids_to_remove:
                 # Delete consorcios using parameter binding for safety
                 db.execute(text("DELETE FROM detalle_consorcios WHERE id_contrato IN :ids"), {"ids": list(ids_to_remove)})
                 
        except Exception as e:
            print(f"Warning cleanup consorcios: {e}")

        # Delete Adjudicaciones
        del_adj = text("DELETE FROM licitaciones_adjudicaciones WHERE id_convocatoria = :id")
        db.execute(del_adj, {"id": id})

        # 3. Update Header (now Safe to update PK)
        target_id = id
        if licitacion.id_convocatoria and licitacion.id_convocatoria.strip():
             target_id = licitacion.id_convocatoria.strip()

        sql_header = text("""
            UPDATE licitaciones_cabecera SET
                id_convocatoria = :new_id,
                ocid = :ocid, nomenclatura = :nom, descripcion = :desc, 
                comprador = :comp, entidad_ruc = :ruc, categoria = :cat, tipo_procedimiento = :proc, 
                monto_estimado = :monto, moneda = :mon, fecha_publicacion = :fecha, 
                estado_proceso = :estado, ubicacion_completa = :ubic, 
                departamento = :dept, provincia = :prov, distrito = :dist
            WHERE id_convocatoria = :old_id
        """)
        
        ubicacion = licitacion.ubicacion_completa
        if not ubicacion:
             ubicacion = f"{licitacion.departamento or ''} - {licitacion.provincia or ''} - {licitacion.distrito or ''}"
        
        # Sanitize Dates
        def clean_date(d):
            if d and isinstance(d, str):
                return d.replace('T', ' ').replace('Z', '').split('.')[0]
            return d

        fecha_pub = clean_date(licitacion.fecha_publicacion)

        result = db.execute(sql_header, {
            "new_id": target_id,
            "old_id": id,
            "ocid": licitacion.ocid,
            "nom": licitacion.nomenclatura,
            "desc": licitacion.descripcion,
            "comp": licitacion.comprador,
            "ruc": licitacion.entidad_ruc,
            "cat": licitacion.categoria,
            "proc": licitacion.tipo_procedimiento,
            "monto": licitacion.monto_estimado,
            "mon": licitacion.moneda,
            "fecha": fecha_pub,
            "estado": licitacion.estado_proceso,
            "ubic": ubicacion,
            "dept": licitacion.departamento,
            "prov": licitacion.provincia,
            "dist": licitacion.distrito
        })
        
        
        # 4. Re-insert (linked to target_id)
        if licitacion.adjudicaciones:
            sql_adj = text("""
                INSERT INTO licitaciones_adjudicaciones (
                    id_adjudicacion, id_convocatoria, ganador_nombre, ganador_ruc,
                    monto_adjudicado, fecha_adjudicacion, estado_item, 
                    entidad_financiera, tipo_garantia, id_contrato, moneda,
                    url_pdf_contrato, url_pdf_consorcio, url_pdf_cartafianza
                ) VALUES (
                    :id_adj, :id_conv, :nombre, :ruc, 
                    :monto, :fecha, :estado, 
                    :banco, :garantia, :contrato, :moneda,
                    :url_contrato, :url_consorcio, :url_fianza
                )
            """)
            
            for adj in licitacion.adjudicaciones:
                # Use provided ID or generate new one
                if adj.id_adjudicacion and adj.id_adjudicacion.strip():
                    adj_id = adj.id_adjudicacion.strip()
                else:
                    adj_id = str(uuid.uuid4()) # New ID for re-inserted items

                fecha_adj = clean_date(adj.fecha_adjudicacion)
                
                db.execute(sql_adj, {
                    "id_adj": adj_id,
                    "id_conv": target_id,
                    "nombre": adj.ganador_nombre,
                    "ruc": adj.ganador_ruc,
                    "monto": adj.monto_adjudicado,
                    "fecha": fecha_adj,
                    "estado": adj.estado_item,
                    "banco": adj.entidad_financiera,
                    "garantia": adj.tipo_garantia,
                    "contrato": adj.id_contrato,
                    "moneda": adj.moneda,
                    "url_contrato": adj.url_pdf_contrato,
                    "url_consorcio": adj.url_pdf_consorcio,
                    "url_fianza": adj.url_pdf_cartafianza
                })

                if adj.consorcios:
                    cons_sql = text("""
                        INSERT INTO detalle_consorcios (
                            id_contrato, ruc_miembro, nombre_miembro, 
                            porcentaje_participacion, fecha_registro
                        ) VALUES (
                            :contrato, :ruc, :nombre, :pct, NOW()
                        )
                    """)
                    
                    c_id = adj.id_contrato if adj.id_contrato else adj_id

                    for cons in adj.consorcios:
                        db.execute(cons_sql, {
                            "contrato": c_id,
                            "ruc": cons.ruc,
                            "nombre": cons.nombre,
                            "pct": cons.porcentaje
                        })
        
        db.commit()
        
        # NOTIFICATION (State Change)
        try:
            new_state = licitacion.estado_proceso
            if old_state and new_state and old_state != new_state:
                from app.routers.notifications import create_notification_internal
                
                # Fetch additional details for metadata AND readable text
                meta = {}
                proc_type_notif = licitacion.tipo_procedimiento or "Licitación" # Default or from payload
                title_ref = licitacion.nomenclatura or id
                
                try:
                    # Fetch extra info from DB to be sure (in case payload didn't have it)
                    res = db.execute(text("SELECT categoria, ubicacion_completa, monto_estimado, ocid, departamento, tipo_procedimiento, descripcion, nomenclatura FROM licitaciones_cabecera WHERE id_convocatoria = :id"), {"id": target_id}).fetchone()
                    if res:
                        meta = {
                            "categoria": res[0] or "GENERAL",
                            "ubicacion": res[1] or res[4] or "PERU", 
                            "monto": float(res[2] or 0),
                            "orcid": res[3] or target_id,
                            "estadoAnterior": old_state,
                            "estadoNuevo": new_state,
                            "licitacionId": target_id
                        }
                        # Prefer DB values if not in payload
                        if not licitacion.tipo_procedimiento and res[5]:
                            proc_type_notif = res[5]
                        
                        # Calculate best readable title: Nomenclatura > Description (short) > ID
                        db_nom = res[7]
                        db_desc = res[6]
                        if db_nom: title_ref = db_nom
                        elif db_desc: title_ref = (db_desc[:60] + "...") if len(db_desc) > 60 else db_desc
                        else: title_ref = target_id
                        
                except:
                    pass

                # Format specific string for frontend parsing: "TYPE \n\n BODY"
                # This triggers the gray capsule tag / abbreviation in UI
                msg = f"{proc_type_notif}\n\nEstado actualizado de {old_state} a {new_state}."
                
                create_notification_internal(
                    title=f"Cambio de Estado: {title_ref}",
                    message=msg,
                    type="licitacion",
                    priority="medium",
                    link=f"/seace/busqueda?q={target_id}",
                    metadata=meta
                )
        except Exception as e:
            print(f"Error creating notification: {e}")
            
        return {"message": "Updated successfully"}
        
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al actualizar: {str(e)}"
        )

@router.delete("/{id}")
def delete_licitacion(
    id: str, 
    pin: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete licitacion and cascade (Raw SQL).
    REQUIRES USER PIN for confirmation.
    """
    if not pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requiere el PIN de autorización"
        )

    if not current_user.pin_hash:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Su usuario no tiene un PIN de seguridad configurado"
        )

    # Verify PIN
    try:
        from app.utils.security import verify_password
        if not verify_password(pin, current_user.pin_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="PIN incorrecto"
            )
    except Exception as e:
        print(f"PIN Verify Error: {e}")
        raise HTTPException(status_code=401, detail="Error validando PIN")

    try:
        # Get info for notification before delete
        desc = "Licitación"
        try:
            row = db.execute(text("SELECT descripcion FROM licitaciones_cabecera WHERE id_convocatoria = :id"), {"id": id}).fetchone()
            if row: desc = row[0][:50]
        except: pass

        # Delete Adjudicaciones First (Manual Cascade)
        sql_del_adj = text("DELETE FROM licitaciones_adjudicaciones WHERE id_convocatoria = :id")
        db.execute(sql_del_adj, {"id": id})
        
        # Delete Header
        sql_del_head = text("DELETE FROM licitaciones_cabecera WHERE id_convocatoria = :id")
        result = db.execute(sql_del_head, {"id": id})
        
        db.commit()
        
        # NOTIFICATION
        try:
            from app.routers.notifications import create_notification_internal
            create_notification_internal(
                title="Licitación Eliminada",
                message=f"Se ha eliminado la licitación: {desc}",
                type="system",
                priority="high"
            )
        except Exception as e:
            print(f"Error creating notification: {e}")
            
        return {"message": "Deleted successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
