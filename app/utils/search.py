from app.models.seace import DetalleConsorcios

def generate_search_text(licitacion, db_session=None):
    """
    Generates a concatenated string of all searchable text for a single licitacion.
    Used to populate the 'search_text' FULLTEXT/ILIKE optimized column.
    """
    parts = []
    
    # Header fields
    if licitacion.id_convocatoria: parts.append(str(licitacion.id_convocatoria))
    if licitacion.nomenclatura: parts.append(str(licitacion.nomenclatura).strip())
    if getattr(licitacion, 'descripcion', None): parts.append(str(licitacion.descripcion).strip())
    if licitacion.comprador: parts.append(str(licitacion.comprador).strip())
    if licitacion.categoria: parts.append(str(licitacion.categoria).strip())
    
    # Adjudicaciones fields
    if getattr(licitacion, 'adjudicaciones', None):
        for adj in licitacion.adjudicaciones:
            if adj.ganador_ruc: parts.append(str(adj.ganador_ruc).strip())
            if adj.ganador_nombre: parts.append(str(adj.ganador_nombre).strip())
            
            # Consorcios fields (only fetch if db_session is provided and they aren't preloaded)
            if db_session:
                target_id = str(adj.id_contrato) if adj.id_contrato else str(adj.id_adjudicacion)
                consorciados = db_session.query(DetalleConsorcios).filter(
                    DetalleConsorcios.id_contrato == target_id
                ).all()
                for c in consorciados:
                    if c.ruc_miembro: parts.append(str(c.ruc_miembro).strip())
                    if c.nombre_miembro: parts.append(str(c.nombre_miembro).strip())
                    
    # Join all unique, non-empty parts with a separator
    clean_parts = [p for p in parts if p]
    seen = set()
    unique_parts = [x for x in clean_parts if not (x in seen or seen.add(x))]
    
    return " | ".join(unique_parts)
