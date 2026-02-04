"""
Licitaciones endpoints for listing and detail views.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
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
import math

router = APIRouter(prefix="/api/licitaciones", tags=["Licitaciones"])


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
        search_term = f"%{search}%"
        
        # LEFT OUTER JOIN with adjudicaciones to search in both tables
        # This ensures we include licitaciones without adjudicaciones
        query = query.outerjoin(LicitacionesCabecera.adjudicaciones)
        adjudicacion_joined = True  # Mark that we've already joined
        
        query = query.filter(
            or_(
                # === TABLA CABECERA ===
                # IDs y Códigos únicos
                LicitacionesCabecera.id_convocatoria.like(search_term),
                LicitacionesCabecera.ocid.like(search_term),
                LicitacionesCabecera.nomenclatura.like(search_term),
                
                # Descripciones y Entidades
                LicitacionesCabecera.descripcion.like(search_term),
                LicitacionesCabecera.comprador.like(search_term),
                
                # Categorías y Procesos
                LicitacionesCabecera.categoria.like(search_term),
                LicitacionesCabecera.tipo_procedimiento.like(search_term),
                LicitacionesCabecera.estado_proceso.like(search_term),
                
                # Ubicación geográfica
                LicitacionesCabecera.departamento.like(search_term),
                LicitacionesCabecera.provincia.like(search_term),
                LicitacionesCabecera.distrito.like(search_term),
                LicitacionesCabecera.ubicacion_completa.like(search_term),
                
                # Datos financieros y origen
                LicitacionesCabecera.moneda.like(search_term),
                LicitacionesCabecera.archivo_origen.like(search_term),
                
                # === TABLA ADJUDICACIONES ===
                # IDs de adjudicación y contrato
                LicitacionesAdjudicaciones.id_adjudicacion.like(search_term),
                LicitacionesAdjudicaciones.id_contrato.like(search_term),
                
                # Información del ganador
                LicitacionesAdjudicaciones.ganador_nombre.like(search_term),
                LicitacionesAdjudicaciones.ganador_ruc.like(search_term),
                
                # Garantías y entidades financieras
                LicitacionesAdjudicaciones.entidad_financiera.like(search_term),
                LicitacionesAdjudicaciones.tipo_garantia.like(search_term),
                LicitacionesAdjudicaciones.estado_item.like(search_term),
            )
        )
    
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
            LicitacionesAdjudicaciones.entidad_financiera.like(f"%{entidad_financiera}%")
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
    
    # Get paginated results - order by most recent
    items = query.distinct().order_by(
        LicitacionesCabecera.fecha_publicacion.desc()
    ).offset(offset).limit(limit).all()
    
    # Enrich with consortium members for list view (Cards)
    results = []
    if items:
        # Avoid circular imports
        from app.models.seace import DetalleConsorcios
        from app.schemas import DetalleConsorcioSchema

        for item in items:
            item_schema = LicitacionListSchema.model_validate(item)
            
            # Aggregate members from all adjudications
            consortium_members = []
            if item.adjudicaciones:
                for adj in item.adjudicaciones:
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
                        consortium_members.append(DetalleConsorcioSchema.model_validate(c))
            
            item_schema.miembros_consorcio = consortium_members
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
    
    # Query with eager loading for optimal performance
    licitacion = db.query(LicitacionesCabecera).options(
        joinedload(LicitacionesCabecera.adjudicaciones)
    ).filter(
        LicitacionesCabecera.id_convocatoria == id_convocatoria
    ).first()
    
    if not licitacion:
        raise HTTPException(
            status_code=404,
            detail=f"Licitación con id_convocatoria={id_convocatoria} no encontrada"
        )
    
    # Build response with all adjudications
    adjudicaciones_list = []
    total_adjudicado = 0
    
    if licitacion.adjudicaciones:
        from app.models import DetalleConsorcios
        from app.schemas import AdjudicacionSchema, DetalleConsorcioSchema
        
        for adj in licitacion.adjudicaciones:
            # Calculate total
            if adj.monto_adjudicado:
                total_adjudicado += adj.monto_adjudicado
            
            # Manually load consorcios for this adjudication
            consorcios = []
            
            if adj.id_contrato:
                consorcios = db.query(DetalleConsorcios).filter(
                    DetalleConsorcios.id_contrato == str(adj.id_contrato)
                ).all()
            elif adj.id_adjudicacion: # Fallback linkage
                 consorcios = db.query(DetalleConsorcios).filter(
                    DetalleConsorcios.id_contrato == str(adj.id_adjudicacion)
                ).all()
            
            # Build adjudication schema with consorcios
            adj_schema = AdjudicacionSchema.model_validate(adj)
            # Explicitly convert to Pydantic models
            adj_schema.consorcios = [DetalleConsorcioSchema.model_validate(c) for c in consorcios]
            # Build schema
            adjudicaciones_list.append(adj_schema)

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
        id_convocatoria=str(int(datetime.now().timestamp())),  # Simple ID generation
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
            adj_id = f"{new_licitacion.id_convocatoria}-ADJ-{int(datetime.now().timestamp())}"
            
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
                entidad_financiera=adj_data.entidad_financiera
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
            # Add index to ensure uniqueness in loop
            adj_id = f"{id_convocatoria}-ADJ-{int(datetime.now().timestamp())}-{licitacion.adjudicaciones.index(adj_data)}"
            
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
                entidad_financiera=adj_data.entidad_financiera
            )
            db.add(new_adj)
            db.flush() # Ensure ID is available
            
            # Create consorcios if provided
            if hasattr(adj_data, 'consorcios') and adj_data.consorcios:
                # Key to link consorcios: id_contrato if exists, else id_adjudicacion
                link_id = contrato_id_val if contrato_id_val else adj_id
                
                for consorcio_data in adj_data.consorcios:
                    new_consorcio = DetalleConsorcios(
                        id_contrato=link_id,
                        ruc_miembro=consorcio_data.get('ruc'),
                        nombre_miembro=consorcio_data.get('nombre'),
                        porcentaje_participacion=consorcio_data.get('porcentaje', 0),
                        fecha_registro=datetime.now()
                    )
                    db.add(new_consorcio)
    
    db.commit()
    db.refresh(existing_licitacion)
    
    # Notify if state changed
    if new_estado and old_estado != new_estado:
        try:
            # We need the current user to assign the notification (or notify admins).
            # Limitation: The current endpoint didn't require auth explicitly in signature before, 
            # but we can try to get it or just assign to the user who triggered it if we inject dependency.
            # Ideally notifications go to interested parties, but for this demo, notifying the user themselves or "admins" is key.
            # The prompt implies the user sees the notification in THEIR bell.
            
            # Since I cannot easily change the signature dynamically without re-reading imports,
            # I will assume 'current_user' is available if I add it to the function args.
            
            # Create notification
            from app.services.notification_service import notification_service
            from app.models.notification import NotificationType, NotificationPriority
            
            # Ensure we have a user ID. If not logged in (public API?), we skip.
            # But this is an admin action usually.
            if current_user:
                 notification_service.create_notification(
                    db=db,
                    user_id=current_user.id,
                    type=NotificationType.LICITACION,
                    priority=NotificationPriority.MEDIUM,
                    title=f"Cambio de Estado: {existing_licitacion.nomenclatura or 'Licitación'}",
                    message=f"Estado cambiado: {old_estado} -> {new_estado}",
                    link=f"/seace/licitaciones/{id_convocatoria}" # Assuming this route exists or is desired
                )
        except Exception as e:
            print(f"Error creating notification: {e}")

    return existing_licitacion


@router.delete("/{id_convocatoria}")
def delete_licitacion(
    id_convocatoria: str,
    db: Session = Depends(get_db)
):
    """
    Delete a tender.
    """
    existing_licitacion = db.query(LicitacionesCabecera).filter(
        LicitacionesCabecera.id_convocatoria == id_convocatoria
    ).first()
    
    if not existing_licitacion:
        raise HTTPException(
            status_code=404,
            detail=f"Licitación con id_convocatoria={id_convocatoria} no encontrada"
        )
    
    db.delete(existing_licitacion)
    db.commit()
    
    return {"message": "Licitación eliminada correctamente"}
