import os
import sys
from sqlalchemy import text
from sqlalchemy.orm import joinedload
from app.database import SessionLocal, engine
from app.models.seace import LicitacionesCabecera, LicitacionesAdjudicaciones, DetalleConsorcios

def add_search_column(db):
    print("Checking if search_text column exists...")
    try:
        db.execute(text("SELECT search_text FROM licitaciones_cabecera LIMIT 1"))
        print("Column 'search_text' already exists.")
    except Exception as e:
        print("Column 'search_text' not found. Adding it...")
        db.rollback() # Important after a failed query
        try:
            db.execute(text("ALTER TABLE licitaciones_cabecera ADD COLUMN search_text LONGTEXT"))
            db.commit()
            print("Column 'search_text' added successfully.")
        except Exception as e2:
            print(f"Error adding column: {e2}")
            db.rollback()

def generate_search_text(licitacion, db_session=None):
    """Generates a concatenated string of all searchable text for a single licitacion."""
    parts = []
    
    # Header fields
    if licitacion.id_convocatoria: parts.append(str(licitacion.id_convocatoria))
    if licitacion.nomenclatura: parts.append(str(licitacion.nomenclatura).strip())
    if licitacion.descripcion: parts.append(str(licitacion.descripcion).strip())
    if licitacion.comprador: parts.append(str(licitacion.comprador).strip())
    if licitacion.categoria: parts.append(str(licitacion.categoria).strip())
    
    # Adjudicaciones fields
    if licitacion.adjudicaciones:
        for adj in licitacion.adjudicaciones:
            if adj.ganador_ruc: parts.append(str(adj.ganador_ruc).strip())
            if adj.ganador_nombre: parts.append(str(adj.ganador_nombre).strip())
            
            # Consorcios fields
            target_id = str(adj.id_contrato) if adj.id_contrato else str(adj.id_adjudicacion)
            if db_session:
                consorciados = db_session.query(DetalleConsorcios).filter(
                    DetalleConsorcios.id_contrato == target_id
                ).all()
                for c in consorciados:
                    if c.ruc_miembro: parts.append(str(c.ruc_miembro).strip())
                    if c.nombre_miembro: parts.append(str(c.nombre_miembro).strip())
                    
    # Join all unique, non-empty parts with a space or separator
    clean_parts = [p for p in parts if p]
    # Deduplicate while preserving order (to keep it clean)
    seen = set()
    unique_parts = [x for x in clean_parts if not (x in seen or seen.add(x))]
    
    return " | ".join(unique_parts)

def populate_search_vector():
    db = SessionLocal()
    
    # Step 1: Add Column
    add_search_column(db)
    
    print("\nStarting data population. This may take a minute...")
    # Step 2: Populate Data
    # We fetch in batches to avoid eating all RAM
    offset = 0
    limit = 500
    total_updated = 0
    
    while True:
        # Load licitaciones with their adjudications eagerly
        batch = db.query(LicitacionesCabecera).options(
            joinedload(LicitacionesCabecera.adjudicaciones)
        ).order_by(LicitacionesCabecera.id_convocatoria).offset(offset).limit(limit).all()
        
        if not batch:
            break
            
        print(f"Processing batch: {offset} to {offset + len(batch)}")
        
        for licitacion in batch:
            # Generate the massive text string
            s_text = generate_search_text(licitacion, db)
            licitacion.search_text = s_text
            
        # Commit batch
        try:
            db.commit()
            total_updated += len(batch)
        except Exception as e:
            print(f"Error during commit at offset {offset}: {e}")
            db.rollback()
            
        offset += limit
        
    print(f"\nDone! Updated {total_updated} licitaciones.")
    db.close()

if __name__ == "__main__":
    populate_search_vector()
