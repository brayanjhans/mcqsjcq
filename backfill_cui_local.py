import sys
import os
import time

# Add root folder to sys.path so we can import the FastAPI app properly
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.services.mef_service import extract_cui, extract_snip
from sqlalchemy import text

def run_backfill():
    db = SessionLocal()
    print("Iniciando migración histórica para poblar la columna CUI...")
    
    try:
        # Obtenemos todas las licitaciones locales donde 'cui' es nulo
        query = text("SELECT id_convocatoria, descripcion FROM licitaciones_cabecera WHERE cui IS NULL")
        rows = db.execute(query).fetchall()
        
        total_rows = len(rows)
        print(f"Buscando CUI en {total_rows} registros históricos sin CUI asignado...")
        
        updated_count = 0
        batch_size = 500
        
        start_time = time.time()
        
        # Preparamos el SQL de update
        update_query = text("UPDATE licitaciones_cabecera SET cui = :cui WHERE id_convocatoria = :id")
        
        for i, row in enumerate(rows):
            id_conv = row[0]
            desc = str(row[1]) if row[1] else ""
            
            # 1. Intentar Regex Extracción de CUI
            cui_found = extract_cui(desc)
            
            # 2. Si no es CUI, intentar SNIP
            if not cui_found:
                cui_found = extract_snip(desc)
                
            if cui_found:
                # Update individual
                db.execute(update_query, {"cui": cui_found, "id": id_conv})
                updated_count += 1
                
            # Commit en batches para no sobrecargar la RAM / DB logs
            if (i + 1) % batch_size == 0:
                db.commit()
                sys.stdout.write(f"\rProgreso: {i+1}/{total_rows} (Actualizados: {updated_count})")
                sys.stdout.flush()
                
        # Commit de los restantes
        db.commit()
        
        end_time = time.time()
        print(f"\nFinalizado! Se encontraron y actualizaron {updated_count} CUIs exitosamente en {round(end_time - start_time, 2)} segundos.")
        
    except Exception as e:
        print(f"Error durante la migración: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_backfill()
