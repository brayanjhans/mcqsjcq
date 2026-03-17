import glob
import zipfile
import json
import time
import os
import sys

# Add root folder to sys.path so we can import the FastAPI app properly
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal
from sqlalchemy import text

def run_json_backfill():
    db = SessionLocal()
    print("Iniciando migración histórica masiva desde DATAJSON...")
    
    zip_files = glob.glob('DATAJSON/*.zip')
    print(f"Encontrados {len(zip_files)} archivos .zip en DATAJSON/")
    
    # Dictionary mapping id_convocatoria -> projectID
    cui_mapping = {}
    
    start_time = time.time()
    
    # 1. Extraer todos los mappings de los JSONs
    for zip_file in zip_files:
        print(f"Procesando {zip_file}...")
        try:
            with zipfile.ZipFile(zip_file, 'r') as z:
                # Get the first matching json file
                json_filename = [f for f in z.namelist() if f.endswith('.json')]
                if not json_filename:
                    continue
                content = z.read(json_filename[0])
                data = json.loads(content)
                
                records = data.get("records", [])
                
                for r in records:
                    release = r.get("compiledRelease", {})
                    
                    # Extraer ID Convocatoria
                    tender = release.get("tender", {})
                    tender_id = tender.get("id")
                    
                    if not tender_id:
                        ocid = release.get("ocid", "")
                        if "-" in ocid:
                            tender_id = ocid.split("-")[-1]
                            
                    # Extraer CUI (projectID)
                    planning = release.get("planning", {})
                    budget = planning.get("budget", {})
                    project_id = budget.get("projectID")
                    
                    # Convert to string to standardize and clean
                    if tender_id and project_id:
                        tid_str = str(tender_id).strip()
                        cui_str = str(project_id).strip()
                        # Solo consideramos CUIs mayores a 6 digitos para evitar basura
                        if len(cui_str) >= 6 and cui_str.isdigit():
                            cui_mapping[tid_str] = cui_str
        except Exception as e:
            print(f"Error parseando {zip_file}: {e}")
            
    print(f"\nEscaneo de JSON finalizado: Encontrados {len(cui_mapping)} pares de (Licitación -> CUI)")
    
    if not cui_mapping:
        print("No se encontraron CUIs en los JSONs.")
        return
        
    # 2. Bulk Update in Database
    # Filtramos cuales ya están en la base de datos para no actualizar en vano
    print("Verificando qué licitaciones faltan actualizar en la BD local...")
    # Get IDs already updated to diff
    query_existing = text("SELECT id_convocatoria, cui FROM licitaciones_cabecera")
    db_rows = db.execute(query_existing).fetchall()
    
    updates_to_run = []
    
    for row in db_rows:
        id_conv = str(row[0]).strip()
        existing_cui = str(row[1]).strip() if row[1] else None
        
        # Si nuestra BD local no tiene el CUI y nosotros lo encontramos en el JSON
        if not existing_cui and id_conv in cui_mapping:
            updates_to_run.append({"cui": cui_mapping[id_conv], "id": id_conv})
            
    print(f"Calculado: Se realizarán {len(updates_to_run)} actualizaciones a licitaciones históricas.")
    
    if updates_to_run:
        batch_size = 5000
        update_query = text("UPDATE licitaciones_cabecera SET cui = :cui WHERE id_convocatoria = :id")
        
        for i in range(0, len(updates_to_run), batch_size):
            batch = updates_to_run[i:i+batch_size]
            
            # Ejecutar update multiple
            # Ejecutor iterativo por simplicidad / seguridad sin temporary tables
            for item in batch:
                db.execute(update_query, item)
            
            db.commit()
            print(f"Progreso actualización: {min(i+batch_size, len(updates_to_run))} / {len(updates_to_run)}")
            
    db.close()
    
    end_time = time.time()
    print(f"Proceso total finalizado exitosamente en {round(end_time - start_time, 2)} segundos.")

if __name__ == "__main__":
    run_json_backfill()
