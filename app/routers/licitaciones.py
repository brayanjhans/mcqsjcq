"""
Licitaciones endpoints for listing and detail views.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from pathlib import Path
from app.database import get_db
from app.models.seace import LicitacionesCabecera, LicitacionesAdjudicaciones
from app.schemas import (
    LicitacionListSchema,
    LicitacionDetalleSchema,
    PaginatedLicitacionesSchema,
    LicitacionCreate,
    LicitacionCreate,
    LicitacionUpdate
)
from app.utils.dependencies import get_current_user
from app.models.user import User
from typing import Optional
from datetime import date, datetime
from urllib.parse import unquote
import math
import uuid

router = APIRouter(prefix="/api/licitaciones", tags=["Licitaciones"])



@router.get("/suggestions")
def get_licitaciones_suggestions(
    query: str = Query(..., min_length=3, description="Search term"),
    limit: int = Query(10, le=50, description="Max results per type"),
    db: Session = Depends(get_db)
):
    """
    Get autocomplete suggestions for Search Bar.
    """
    query_str = f"%{query}%"
    results = []
    
    # 1. Search in Compradores (Entidades)
    compradores = db.query(LicitacionesCabecera.comprador).filter(
        LicitacionesCabecera.comprador.ilike(query_str)
    ).distinct().limit(limit).all()
    
    for c in compradores:
        if c.comprador:
            results.append({"value": c.comprador, "type": "Entidad"})

    # 2. Search in Proveedores (Ganadores)
    ganadores = db.query(LicitacionesAdjudicaciones.ganador_nombre).filter(
        LicitacionesAdjudicaciones.ganador_nombre.ilike(query_str)
    ).distinct().limit(limit).all()
    
    for g in ganadores:
        if g.ganador_nombre:
            results.append({"value": g.ganador_nombre, "type": "Proveedor"})
            
    # 3. Search in Procesos (Nomenclatura)
    procesos = db.query(LicitacionesCabecera.nomenclatura).filter(
        LicitacionesCabecera.nomenclatura.ilike(query_str)
    ).distinct().limit(limit).all()
    
    for p in procesos:
        if p.nomenclatura:
             results.append({"value": p.nomenclatura, "type": "Proceso"})
             
    # 4. Search in Description (Generic)
    # Only if we don't have many results yet
    if len(results) < 5:
        descripciones = db.query(LicitacionesCabecera.descripcion).filter(
            LicitacionesCabecera.descripcion.ilike(query_str)
        ).distinct().limit(limit).all()
        for d in descripciones:
            if d.descripcion:
                # Truncate long descriptions for suggestion
                val = (d.descripcion[:75] + '..') if len(d.descripcion) > 75 else d.descripcion
                results.append({"value": val, "type": "Descripción"})

    return results

@router.get("", response_model=PaginatedLicitacionesSchema)
def get_licitaciones(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=1000, description="Items per page (max 1000)"),
    search: Optional[str] = Query(None, description="Search in nomenclatura, comprador, descripcion"),
    estado: Optional[str] = Query(None, description="Filter by estado_proceso"),
    # Alias for frontend consistency
    estado_proceso: Optional[str] = Query(None, description="Alias for estado"),
    ruc_ganador: Optional[str] = Query(None, description="Filter by winner RUC"),
    entidad_financiera: Optional[str] = Query(None, description="Filter by bank/financial entity"),
    # Alias for frontend
    aseguradora: Optional[str] = Query(None, description="Alias for entidad_financiera"),
    # New filters
    departamento: Optional[str] = Query(None, description="Filter by department"),
    provincia: Optional[str] = Query(None, description="Filter by province"),
    distrito: Optional[str] = Query(None, description="Filter by district"),
    year: Optional[int] = Query(None, description="Filter by publication year"),
    mes: Optional[int] = Query(None, description="Filter by publication month"),
    categoria: Optional[str] = Query(None, description="Filter by category"),
    tipo_garantia: Optional[str] = Query(None, description="Filter by guarantee type"),
    tipo_procedimiento: Optional[str] = Query(None, description="Filter by procedure type"), # NEW
    fecha_desde: Optional[date] = Query(None, description="Filter from date (ISO format)"),
    fecha_hasta: Optional[date] = Query(None, description="Filter to date (ISO format)"),
    origen: Optional[str] = Query(None, description="Filter by origin (Manuales/Automático)"),
    db: Session = Depends(get_db)
):
    """
    Get paginated list of tenders with optional filters.
    
    Filters:
    - search: Search in nomenclatura, comprador, or descripcion
    - estado: Filter by estado_proceso
    - ruc_ganador: Filter by winner's RUC
    - entidad_financiera: Filter by bank/guarantee issuer
    - fecha_desde/fecha_hasta: Filter by adjudication date range
    - location: departamento, provincia, distrito
    - time: year, mes
    - details: categoria, tipo_garantia
    - origen: Manuales (API created) or Automático (ETL loaded)
    """
    
    from sqlalchemy import extract

    # Base query
    query = db.query(LicitacionesCabecera)
    
    # Apply comprehensive search filter across ALL relevant fields
    if search:
        try:
            print(f"DEBUG SEARCH: '{search}'")
            # Split search into words for AND logic (keyword search)
            keywords = search.strip().split()
            print(f"DEBUG KEYWORDS: {keywords}")
            if not keywords: # If search was just spaces, use the original search string
                keywords = [search]

            # Ensure join happens if we need it (checking all fields usually implies joining)
            query = query.outerjoin(LicitacionesCabecera.adjudicaciones)
            
            for keyword in keywords:
                term = f"%{keyword}%"
                query = query.filter(
                    or_(
                        # === TABLA CABECERA ===
                        LicitacionesCabecera.id_convocatoria.ilike(term),
                        LicitacionesCabecera.ocid.ilike(term),
                        LicitacionesCabecera.nomenclatura.ilike(term),
                        LicitacionesCabecera.descripcion.ilike(term),
                        LicitacionesCabecera.comprador.ilike(term),
                        LicitacionesCabecera.categoria.ilike(term),
                        LicitacionesCabecera.tipo_procedimiento.ilike(term),
                        LicitacionesCabecera.estado_proceso.ilike(term),
                        LicitacionesCabecera.ubicacion_completa.ilike(term),
                        
                        # === TABLA ADJUDICACIONES ===
                        LicitacionesCabecera.adjudicaciones.any(
                            or_(
                                LicitacionesAdjudicaciones.ganador_nombre.ilike(term),
                                LicitacionesAdjudicaciones.ganador_ruc.ilike(term),
                                LicitacionesAdjudicaciones.entidad_financiera.ilike(term),
                                LicitacionesAdjudicaciones.tipo_garantia.ilike(term),
                                LicitacionesAdjudicaciones.estado_item.ilike(term),
                            )
                        )
                    )
                )
        except Exception as e:
            with open("backend_debug_log.txt", "a") as f:
                f.write(f"Error in search filter: {str(e)}\n")
            raise e
        
    with open("backend_debug_log.txt", "w", encoding="utf-8") as f:
        f.write(f"DEBUG After Search, count: {query.distinct().count()}\n")
        f.write(f"DEBUG Params: {str({k: v for k, v in locals().items() if k not in ['db', 'query', 'ensure_adj_join']})}\n")
    
    # Alias Mapping
    if estado_proceso and not estado:
        estado = estado_proceso
    if aseguradora and not entidad_financiera:
        entidad_financiera = aseguradora

    # Simple filters (Case Insensitive Support)
    if estado:
        query = query.filter(LicitacionesCabecera.estado_proceso == estado)
    if departamento:
        query = query.filter(LicitacionesCabecera.departamento == departamento)
    if provincia:
        query = query.filter(LicitacionesCabecera.provincia == provincia)
    if distrito:
        query = query.filter(LicitacionesCabecera.distrito == distrito)
    if categoria:
        query = query.filter(LicitacionesCabecera.categoria == categoria)
    
    # Procedure Type Filter
    if tipo_procedimiento:
        query = query.filter(LicitacionesCabecera.tipo_procedimiento == tipo_procedimiento)

    # Origin Filter
    if origen:
        if origen == "Manuales":
            query = query.filter(LicitacionesCabecera.archivo_origen == None)
        elif origen == "Automático":
            query = query.filter(LicitacionesCabecera.archivo_origen != None)
        
    # Date filters on Cabecera
    if year:
        query = query.filter(extract('year', LicitacionesCabecera.fecha_publicacion) == year)
    if mes:
        query = query.filter(extract('month', LicitacionesCabecera.fecha_publicacion) == mes)

    # Filters requiring Join with Adjudicaciones
    # Initialize flag (may be set to True by search filter above)
    if 'adjudicacion_joined' not in locals():
        adjudicacion_joined = False
    
    # Helper to ensure join only happens once
    def ensure_adj_join(q, joined):
        if not joined:
            # Use outerjoin to include licitaciones without adjudicaciones
            q = q.outerjoin(LicitacionesCabecera.adjudicaciones)
            return q, True
        return q, True

    if ruc_ganador:
        query, adjudicacion_joined = ensure_adj_join(query, adjudicacion_joined)
        query = query.filter(LicitacionesAdjudicaciones.ganador_ruc == ruc_ganador)
    
    if entidad_financiera:
        query, adjudicacion_joined = ensure_adj_join(query, adjudicacion_joined)
        query = query.filter(
            LicitacionesAdjudicaciones.entidad_financiera.ilike(f"%{entidad_financiera}%")
        )

    if tipo_garantia:
        query, adjudicacion_joined = ensure_adj_join(query, adjudicacion_joined)
        query = query.filter(LicitacionesAdjudicaciones.tipo_garantia == tipo_garantia)

    if fecha_desde or fecha_hasta:
        query, adjudicacion_joined = ensure_adj_join(query, adjudicacion_joined)
        if fecha_desde:
            query = query.filter(LicitacionesAdjudicaciones.fecha_adjudicacion >= fecha_desde)
        if fecha_hasta:
            query = query.filter(LicitacionesAdjudicaciones.fecha_adjudicacion <= fecha_hasta)
    
    # Get total count
    total = query.distinct().count()
    
    # Calculate pagination
    total_pages = math.ceil(total / limit) if total > 0 else 0
    offset = (page - 1) * limit
    
    # Get paginated results - order by most recent and eagerly load adjudications to compute banks
    items = query.distinct().options(
        joinedload(LicitacionesCabecera.adjudicaciones)
    ).order_by(
        LicitacionesCabecera.fecha_publicacion.desc()
    ).offset(offset).limit(limit).all()
    
    # Enrich with consortium members for list view (Cards)
    results = []
    if items:
        # Avoid circular imports
        from app.models.seace import DetalleConsorcios
        from app.schemas import DetalleConsorcioSchema

        for item in items:
            # 1. Base dict from SQLAlchemy ORM
            base_data = {
                "id_convocatoria": item.id_convocatoria,
                "nomenclatura": item.nomenclatura,
                "comprador": item.comprador,
                "monto_estimado": item.monto_estimado,
                "fecha_publicacion": item.fecha_publicacion,
                "estado_proceso": item.estado_proceso,
                "entidades_financieras": None,
                "tipo_garantia": None,
                "miembros_consorcio": []
            }
            
            # Aggregate members from all adjudications
            consortium_members = []
            entidades_set = set()
            garantias_set = set()
            
            from app.models.seace import LicitacionesAdjudicaciones
            adjudicaciones_db = db.query(LicitacionesAdjudicaciones).filter(
                LicitacionesAdjudicaciones.id_convocatoria == item.id_convocatoria
            ).all()
            
            if adjudicaciones_db:
                for adj in adjudicaciones_db:
                    # Capturar financieras
                    if adj.entidad_financiera:
                        entidades_set.add(adj.entidad_financiera)
                    if adj.tipo_garantia and adj.tipo_garantia != 'SIN_GARANTIA':
                        garantias_set.add(adj.tipo_garantia)
                        
                    # Logic similar to get_licitacion_detalle
                    consorcios_adj = []
                    if adj.id_contrato:
                        consorcios_adj = db.query(DetalleConsorcios).filter(
                            DetalleConsorcios.id_contrato == str(adj.id_contrato)
                        ).all()
                    
                    if not consorcios_adj and adj.id_adjudicacion:
                         consorcios_adj = db.query(DetalleConsorcios).filter(
                            DetalleConsorcios.id_contrato == str(adj.id_adjudicacion)
                        ).all()
                    
                    for c in consorcios_adj:
                        consortium_members.append(c)
            
            base_data["miembros_consorcio"] = consortium_members
            base_data["entidades_financieras"] = " | ".join(sorted(entidades_set)) if entidades_set else None
            base_data["tipo_garantia"] = ",".join(sorted(garantias_set)) if garantias_set else None
            
            # 2. Build model instance
            item_schema = LicitacionListSchema.model_validate(base_data)
            results.append(item_schema)

    return PaginatedLicitacionesSchema(
        items=results,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.get("/{id_convocatoria}", response_model=LicitacionDetalleSchema)
def get_licitacion_detalle(
    id_convocatoria: str,
    db: Session = Depends(get_db)
):
    """
    Get complete tender details including:
    - Header information
    - Adjudication details
    - Consortium members (if any)
    """
    id_convocatoria = unquote(id_convocatoria)
    print(f"DEBUG: Buscando licitación id_convocatoria='{id_convocatoria}' type={type(id_convocatoria)}")
    
    # Cleaning
    id_clean = id_convocatoria.strip()
    
    # Query with eager loading and robust lookup
    # DISABLED joinedload to debug ORM issues
    licitacion = db.query(LicitacionesCabecera).filter(
        LicitacionesCabecera.id_convocatoria == id_clean
    ).first()
    
    # Fallback: Try with LIKE if exact match fails (handles potential dirty data in DB)
    if not licitacion:
        print(f"DEBUG: Exact match failed for '{id_clean}'. Retrying with LIKE...")
        licitacion = db.query(LicitacionesCabecera).filter(
            LicitacionesCabecera.id_convocatoria.ilike(f"%{id_clean}%")
        ).first()
    
    print(f"DEBUG: Resultado búsqueda: {licitacion}")

    if not licitacion:
        print(f"DEBUG: Licitación NO encontrada para id='{id_convocatoria}' (cleaned='{id_clean}')")
        raise HTTPException(
            status_code=404,
            detail=f"Licitación con id_convocatoria={id_convocatoria} no encontrada"
        )
    
    # Build response with all adjudications
    adjudicaciones_list = []
    total_adjudicado = 0
    
    try:
        print("DEBUG: Accessing adjuciaciones relationship...")
        if licitacion.adjudicaciones:
            print(f"DEBUG: Found {len(licitacion.adjudicaciones)} adjudicaciones.")
            from app.models import DetalleConsorcios
            from app.schemas import AdjudicacionSchema, DetalleConsorcioSchema
            
            for adj in licitacion.adjudicaciones:
                # Calculate total
                if adj.monto_adjudicado:
                    total_adjudicado += adj.monto_adjudicado
                
                # Manually load consorcios for this adjudication
                consorcios = []
                
                # Safe consorcio loading
                try:
                    target_id_contrato = str(adj.id_contrato) if adj.id_contrato else str(adj.id_adjudicacion)
                    if target_id_contrato:
                         consorcios = db.query(DetalleConsorcios).filter(
                            DetalleConsorcios.id_contrato == target_id_contrato
                        ).all()
                except Exception as e_cons:
                    print(f"ERROR: Error loading consorcios for adj {adj.id_adjudicacion}: {e_cons}")

                # Build adjudication schema with consorcios
                try:
                    adj_schema = AdjudicacionSchema.model_validate(adj)
                    # Explicitly convert to Pydantic models
                    adj_schema.consorcios = [DetalleConsorcioSchema.model_validate(c) for c in consorcios]
                    # Build schema
                    adjudicaciones_list.append(adj_schema)
                except Exception as e_valid:
                    print(f"ERROR: Validation error for adj {adj.id_adjudicacion}: {e_valid}")
                    # Skip invalid items but continue
                    continue

    except Exception as e:
        print(f"CRITICAL ERROR loading adjudicaciones: {e}")
        import traceback
        traceback.print_exc()
        # Ensure we return valid response even if details fail
        # We will return empty list for now to allow page load

    # Compute summaries for missing fields
    entidades = set()
    garantias = set()
    
    for adj in adjudicaciones_list:
        if adj.entidad_financiera:
            entidades.add(adj.entidad_financiera)
        if adj.tipo_garantia and adj.tipo_garantia != 'SIN_GARANTIA':
            garantias.add(adj.tipo_garantia)
            
    entidades_str = " | ".join(sorted(entidades)) if entidades else None
    garantias_str = ",".join(sorted(garantias)) if garantias else None
    
    return LicitacionDetalleSchema(
        id_convocatoria=licitacion.id_convocatoria,
        ocid=licitacion.ocid,
        nomenclatura=licitacion.nomenclatura,
        descripcion=licitacion.descripcion,
        comprador=licitacion.comprador,
        categoria=licitacion.categoria,
        tipo_procedimiento=licitacion.tipo_procedimiento,
        monto_estimado=licitacion.monto_estimado,
        moneda=licitacion.moneda,
        fecha_publicacion=licitacion.fecha_publicacion,
        estado_proceso=licitacion.estado_proceso,
        ubicacion_completa=licitacion.ubicacion_completa,
        departamento=licitacion.departamento,
        provincia=licitacion.provincia,
        distrito=licitacion.distrito,
        adjudicaciones=adjudicaciones_list,
        monto_total_adjudicado=float(total_adjudicado) if total_adjudicado else 0.0,
        entidades_financieras=entidades_str,
        tipo_garantia=garantias_str
    )


@router.post("", response_model=LicitacionListSchema)
def create_licitacion(
    licitacion: LicitacionCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new tender.
    """
    # Generate ubicacion_completa from parts
    ubicacion_parts = []
    if licitacion.departamento:
        ubicacion_parts.append(licitacion.departamento)
    if licitacion.provincia:
        ubicacion_parts.append(licitacion.provincia)
    if licitacion.distrito:
        ubicacion_parts.append(licitacion.distrito)
    ubicacion_completa = " - ".join(ubicacion_parts) if ubicacion_parts else None
    
    # Create header
    new_licitacion = LicitacionesCabecera(
        id_convocatoria=str(uuid.uuid4()),  # UUID ID generation
        nomenclatura=licitacion.nomenclatura,
        ocid=licitacion.ocid,
        descripcion=licitacion.descripcion,
        comprador=licitacion.comprador,
        categoria=licitacion.categoria,
        tipo_procedimiento=licitacion.tipo_procedimiento,
        monto_estimado=licitacion.monto_estimado,
        moneda=licitacion.moneda,
        fecha_publicacion=licitacion.fecha_publicacion,
        estado_proceso=licitacion.estado_proceso,
        departamento=licitacion.departamento,
        provincia=licitacion.provincia,
        distrito=licitacion.distrito,
        ubicacion_completa=ubicacion_completa,
        fecha_carga=datetime.now(),
        last_update=datetime.now()
    )
    
    db.add(new_licitacion)
    db.commit()
    db.refresh(new_licitacion)
    
    # Create adjudicaciones if provided
    if licitacion.adjudicaciones:
        from app.models.seace import LicitacionesAdjudicaciones, DetalleConsorcios
        
        for adj_data in licitacion.adjudicaciones:
            # Generate unique ID for adjudication
            adj_id = f"{new_licitacion.id_convocatoria}-ADJ-{str(uuid.uuid4())}"
            
            # Create adjudication
            new_adj = LicitacionesAdjudicaciones(
                id_adjudicacion=adj_id,
                id_convocatoria=new_licitacion.id_convocatoria,
                id_contrato=getattr(adj_data, 'id_contrato', None),
                ganador_nombre=adj_data.ganador_nombre,
                ganador_ruc=adj_data.ganador_ruc,
                monto_adjudicado=adj_data.monto_adjudicado,
                fecha_adjudicacion=adj_data.fecha_adjudicacion,
                estado_item=adj_data.estado_item,
                tipo_garantia=getattr(adj_data, 'tipo_garantia', None),
                entidad_financiera=adj_data.entidad_financiera,
                url_pdf_contrato=getattr(adj_data, 'url_pdf_contrato', None),
                url_pdf_consorcio=getattr(adj_data, 'url_pdf_consorcio', None),
                url_pdf_cartafianza=getattr(adj_data, 'url_pdf_cartafianza', None)
            )
            db.add(new_adj)
            db.commit()
            db.refresh(new_adj)
            
            # Create consorcios if provided
            if hasattr(adj_data, 'consorcios') and adj_data.consorcios:
                for consorcio_data in adj_data.consorcios:
                    new_consorcio = DetalleConsorcios(
                        id_contrato=new_adj.id_contrato or adj_id,
                        ruc_miembro=consorcio_data.get('ruc'),
                        nombre_miembro=consorcio_data.get('nombre'),
                        porcentaje_participacion=consorcio_data.get('porcentaje', 0)
                    )
                    db.add(new_consorcio)
                
                db.commit()
    
    # Notification: new licitacion created (broadcast to all active users)
    try:
        from app.services.notification_service import notification_service
        from app.models.notification import NotificationType, NotificationPriority
        from sqlalchemy import text as sql_text
        
        active_user_ids = [row[0] for row in db.execute(sql_text("SELECT id FROM usuarios WHERE activo = 1")).fetchall()]
        monto_str = f"S/ {licitacion.monto_estimado:,.2f}" if licitacion.monto_estimado else "Sin monto"
        for uid in active_user_ids:
            notification_service.create_notification(
                db=db,
                user_id=uid,
                type=NotificationType.LICITACION,
                priority=NotificationPriority.MEDIUM,
                title=f"Nueva Licitación Creada",
                message=f"{licitacion.nomenclatura or 'Sin nomenclatura'} — {licitacion.comprador or 'Sin entidad'} ({monto_str})",
                link=f"/seace/busqueda/{new_licitacion.id_convocatoria}"
            )
    except Exception as e:
        print(f"Error creating notification for new licitacion: {e}")
    
    return new_licitacion


@router.put("/{id_convocatoria}", response_model=LicitacionListSchema)
def update_licitacion(
    id_convocatoria: str,
    licitacion: LicitacionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing tender.
    """
    id_convocatoria = unquote(id_convocatoria)
    existing_licitacion = db.query(LicitacionesCabecera).filter(
        LicitacionesCabecera.id_convocatoria == id_convocatoria
    ).first()
    
    if not existing_licitacion:
        raise HTTPException(
            status_code=404,
            detail=f"Licitación con id_convocatoria={id_convocatoria} no encontrada"
        )
    
    # Update fields if provided
    update_data = licitacion.model_dump(exclude_unset=True)
    
    # Track state change for notification
    old_estado = existing_licitacion.estado_proceso
    new_estado = update_data.get('estado_proceso')
    
    # Update ubicacion_completa if location fields changed
    if any(key in update_data for key in ['departamento', 'provincia', 'distrito']):
        dept = update_data.get('departamento', existing_licitacion.departamento)
        prov = update_data.get('provincia', existing_licitacion.provincia)
        dist = update_data.get('distrito', existing_licitacion.distrito)
        
        ubicacion_parts = []
        if dept:
            ubicacion_parts.append(dept)
        if prov:
            ubicacion_parts.append(prov)
        if dist:
            ubicacion_parts.append(dist)
        
        update_data['ubicacion_completa'] = " - ".join(ubicacion_parts) if ubicacion_parts else None
    
    for key, value in update_data.items():
        if key != 'adjudicaciones':
            setattr(existing_licitacion, key, value)
    
    existing_licitacion.last_update = datetime.now()
    
    # Handle nested adjudicaciones update
    if licitacion.adjudicaciones is not None:
        from app.models.seace import LicitacionesAdjudicaciones, DetalleConsorcios
        
        # 1. Find existing adjudications to clean up associated consorcios
        existing_adjs = db.query(LicitacionesAdjudicaciones).filter(
            LicitacionesAdjudicaciones.id_convocatoria == id_convocatoria
        ).all()
        
        # Collect IDs used for linking consorcios
        ids_to_clean = []
        for adj in existing_adjs:
            if adj.id_contrato:
                ids_to_clean.append(adj.id_contrato)
            # Also check if id_adjudicacion was used as key
            ids_to_clean.append(adj.id_adjudicacion)
        
        # 2. Delete existing consorcios
        if ids_to_clean:
            db.query(DetalleConsorcios).filter(
                DetalleConsorcios.id_contrato.in_(ids_to_clean)
            ).delete(synchronize_session=False)
            
        # 3. Delete existing adjudications
        db.query(LicitacionesAdjudicaciones).filter(
            LicitacionesAdjudicaciones.id_convocatoria == id_convocatoria
        ).delete(synchronize_session=False)
        
        # 4. Create new adjudications and consorcios
        for adj_data in licitacion.adjudicaciones:
            # Generate unique ID for adjudication
            adj_id = f"{id_convocatoria}-ADJ-{str(uuid.uuid4())}"
            
            # Use provided id_contrato or defaults to None
            contrato_id_val = getattr(adj_data, 'id_contrato', None)
            
            # Create adjudication
            new_adj = LicitacionesAdjudicaciones(
                id_adjudicacion=adj_id,
                id_convocatoria=id_convocatoria,
                id_contrato=contrato_id_val,
                ganador_nombre=adj_data.ganador_nombre,
                ganador_ruc=adj_data.ganador_ruc,
                monto_adjudicado=adj_data.monto_adjudicado,
                fecha_adjudicacion=adj_data.fecha_adjudicacion,
                estado_item=adj_data.estado_item,
                tipo_garantia=getattr(adj_data, 'tipo_garantia', None),
                entidad_financiera=adj_data.entidad_financiera,
                url_pdf_contrato=getattr(adj_data, 'url_pdf_contrato', None),
                url_pdf_consorcio=getattr(adj_data, 'url_pdf_consorcio', None),
                url_pdf_cartafianza=getattr(adj_data, 'url_pdf_cartafianza', None)
            )
            db.add(new_adj)
            db.flush() # Ensure ID is available
            
            # Create consorcios if provided
            if hasattr(adj_data, 'consorcios') and adj_data.consorcios:
                # Key to link consorcios: id_contrato if exists, else id_adjudicacion
                link_id = contrato_id_val if contrato_id_val else adj_id
                
                for consorcio_data in adj_data.consorcios:
                    # Parse percentage robustly to avoid PyMySQL OperationalError 1366
                    raw_pct = consorcio_data.get('porcentaje')
                    try:
                        pct_val = float(raw_pct) if raw_pct not in [None, ""] else 0.0
                    except (ValueError, TypeError):
                        pct_val = 0.0
                        
                    new_consorcio = DetalleConsorcios(
                        id_contrato=link_id,
                        ruc_miembro=consorcio_data.get('ruc'),
                        nombre_miembro=consorcio_data.get('nombre'),
                        porcentaje_participacion=pct_val,
                        fecha_registro=datetime.now()
                    )
                    db.add(new_consorcio)
    
    db.commit()
    db.refresh(existing_licitacion)
    
    # Notification: state change or general edit (broadcast to all active users)
    try:
        from app.services.notification_service import notification_service
        from app.models.notification import NotificationType, NotificationPriority
        from sqlalchemy import text as sql_text
        
        active_user_ids = [row[0] for row in db.execute(sql_text("SELECT id FROM usuarios WHERE activo = 1")).fetchall()]
        
        for uid in active_user_ids:
            if new_estado and old_estado != new_estado:
                notification_service.create_notification(
                    db=db,
                    user_id=uid,
                    type=NotificationType.LICITACION,
                    priority=NotificationPriority.HIGH,
                    title=f"Cambio de Estado: {existing_licitacion.nomenclatura or 'Licitación'}",
                    message=f"Estado cambiado: {old_estado} → {new_estado}",
                    link=f"/seace/busqueda/{id_convocatoria}"
                )
            else:
                notification_service.create_notification(
                    db=db,
                    user_id=uid,
                    type=NotificationType.LICITACION,
                    priority=NotificationPriority.LOW,
                    title=f"Licitación Editada: {existing_licitacion.nomenclatura or 'Licitación'}",
                    message=f"Se actualizaron datos del proceso {id_convocatoria}",
                    link=f"/seace/busqueda/{id_convocatoria}"
                )
    except Exception as e:
        print(f"Error creating notification: {e}")

    return existing_licitacion

@router.put("/adjudicaciones/{id_adjudicacion}/oferta")
def update_adjudicacion_oferta(
    id_adjudicacion: str,
    oferta_data: dict,  # Or use a specific schema like AdjudicacionOfertaUpdate if imported
    db: Session = Depends(get_db)
):
    from app.models.seace import LicitacionesAdjudicaciones
    
    adjudicacion = db.query(LicitacionesAdjudicaciones).filter(
        LicitacionesAdjudicaciones.id_adjudicacion == id_adjudicacion
    ).first()
    
    if not adjudicacion:
        raise HTTPException(
            status_code=404,
            detail=f"Adjudicación {id_adjudicacion} no encontrada"
        )
        
    adjudicacion.url_pdf_oferta = oferta_data.get("url_pdf_oferta")
    db.commit()
    db.refresh(adjudicacion)
    
    return {"message": "Oferta actualizada exitosamente", "url_pdf_oferta": adjudicacion.url_pdf_oferta}

OFERTAS_DIR = Path(__file__).parent.parent.parent / "ofertas_pdfs"

@router.post("/adjudicaciones/{id_adjudicacion}/oferta_upload")
def upload_adjudicacion_oferta(
    id_adjudicacion: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    import shutil
    from sqlalchemy import text
    
    # Check if exists using raw SQL
    check_query = text("SELECT id_adjudicacion FROM licitaciones_adjudicaciones WHERE id_adjudicacion = :id")
    result = db.execute(check_query, {"id": id_adjudicacion}).fetchone()
    
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Adjudicación {id_adjudicacion} no encontrada"
        )
        
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Solo se permiten archivos PDF"
        )

    OFERTAS_DIR.mkdir(parents=True, exist_ok=True)
    
    file_extension = Path(file.filename).suffix
    safe_filename = f"oferta_{id_adjudicacion}{file_extension}"
    file_path = OFERTAS_DIR / safe_filename
    
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    final_url = f"/api/licitaciones/ofertas/download/{safe_filename}"
    
    update_query = text("""
        UPDATE licitaciones_adjudicaciones 
        SET url_pdf_oferta = :url 
        WHERE id_adjudicacion = :id
    """)
    db.execute(update_query, {"url": final_url, "id": id_adjudicacion})
    db.commit()

    return {"message": "Archivo subido exitosamente", "url_pdf_oferta": final_url}

@router.get("/ofertas/download/{filename}")
async def download_oferta(filename: str):
    from fastapi.responses import FileResponse
    file_path = OFERTAS_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
    try:
        file_path.resolve().relative_to(OFERTAS_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    return FileResponse(path=file_path, filename=filename, media_type='application/pdf')

@router.delete("/{id_convocatoria}")
def delete_licitacion(
    id_convocatoria: str,
    db: Session = Depends(get_db)
):
    """
    Delete a tender.
    """
    id_convocatoria = unquote(id_convocatoria)
    existing_licitacion = db.query(LicitacionesCabecera).filter(
        LicitacionesCabecera.id_convocatoria == id_convocatoria
    ).first()
    
    if not existing_licitacion:
        raise HTTPException(
            status_code=404,
            detail=f"Licitación con id_convocatoria={id_convocatoria} no encontrada"
        )
    
    # Save info before deleting for notification
    nomenclatura = existing_licitacion.nomenclatura or id_convocatoria
    comprador = existing_licitacion.comprador or 'Sin entidad'
    
    db.delete(existing_licitacion)
    db.commit()
    
    # Notification: licitacion deleted (broadcast to all active users)
    try:
        from app.services.notification_service import notification_service
        from app.models.notification import NotificationType, NotificationPriority
        from sqlalchemy import text as sql_text
        
        active_user_ids = [row[0] for row in db.execute(sql_text("SELECT id FROM usuarios WHERE activo = 1")).fetchall()]
        for uid in active_user_ids:
            notification_service.create_notification(
                db=db,
                user_id=uid,
                type=NotificationType.LICITACION,
                priority=NotificationPriority.HIGH,
                title=f"Licitación Eliminada",
                message=f"Se eliminó: {nomenclatura} — {comprador}",
                link=f"/seace/busqueda"
            )
    except Exception as e:
        print(f"Error creating notification for delete: {e}")
    
    return {"message": "Licitación eliminada correctamente"}
