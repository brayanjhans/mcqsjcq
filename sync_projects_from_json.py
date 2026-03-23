import glob
import zipfile
import json
import time
import os
import sys
import pymysql
from dotenv import load_dotenv

# Load database config from .env
load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASS', '123456789'),
    'db': 'mcqs-jcq',
    'charset': 'utf8mb4'
}

def get_connection():
    return pymysql.connect(**DB_CONFIG)

def run_project_sync():
    conn = get_connection()
    print("🚀 Iniciando extracción masiva de Proyectos y CUIs desde DATAJSON...")
    
    # Path setup
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(script_dir, "DATAJSON")
    zip_files = glob.glob(os.path.join(data_dir, '*.zip'))
    
    print(f"📂 Encontrados {len(zip_files)} archivos .zip en {data_dir}")
    
    # Dictionary mapping id_convocatoria -> {proyecto, cui}
    project_mapping = {}
    
    start_time = time.time()
    
    # 1. Extraer datos de los JSONs
    for zip_file in zip_files:
        print(f"📦 Procesando {os.path.basename(zip_file)}...")
        try:
            with zipfile.ZipFile(zip_file, 'r') as z:
                json_filenames = [f for f in z.namelist() if f.endswith('.json')]
                for json_filename in json_filenames:
                    content = z.read(json_filename)
                    data = json.loads(content)
                    
                    records = data.get("records", [])
                    for r in records:
                        release = r.get("compiledRelease", {})
                        tender = release.get("tender", {})
                        tender_id = tender.get("id")
                        
                        if not tender_id:
                            ocid = release.get("ocid", "")
                            if "-" in ocid:
                                tender_id = ocid.split("-")[-1]
                        
                        if not tender_id: continue
                        
                        # Extraer CUI y Nombre del Proyecto
                        planning = release.get("planning", {})
                        budget = planning.get("budget", {})
                        
                        project_name = budget.get("project")
                        project_id = budget.get("projectID")
                        
                        if project_name or project_id:
                            tid_str = str(tender_id).strip()
                            if tid_str not in project_mapping:
                                project_mapping[tid_str] = {
                                    "proyecto": str(project_name).strip() if project_name else None,
                                    "cui": str(project_id).strip() if project_id else None
                                }
        except Exception as e:
            print(f"❌ Error parseando {zip_file}: {e}")
            
    print(f"\n✅ Escaneo finalizado: Encontrada información de proyecto para {len(project_mapping)} licitaciones.")
    
    if not project_mapping:
        print("⚠️ No se encontró información de proyectos en los archivos JSON.")
        return
        
    # 2. Update in Database
    print("💾 Actualizando base de datos...")
    try:
        with conn.cursor() as cursor:
            # Batch updates
            update_sql = "UPDATE licitaciones_cabecera SET proyecto = %s, cui = %s WHERE id_convocatoria = %s"
            
            # Prepare data list
            update_data = []
            for tid, info in project_mapping.items():
                update_data.append((info['proyecto'], info['cui'], tid))
            
            print(f"📝 Total de actualizaciones a realizar: {len(update_data)}")
            
            # Execute in batches to avoid locking the table for too long
            batch_size = 1000
            for i in range(0, len(update_data), batch_size):
                batch = update_data[i:i+batch_size]
                try:
                    cursor.executemany(update_sql, batch)
                    conn.commit()
                    print(f"   📊 Progreso: {min(i+batch_size, len(update_data))} / {len(update_data)}")
                except Exception as batch_err:
                    print(f"   ⚠️ Error en batch {i//batch_size}: {batch_err}. Intentando individualmente...")
                    conn.rollback()
                    for item in batch:
                        try:
                            cursor.execute(update_sql, item)
                            conn.commit()
                        except Exception as row_err:
                            print(f"      ❌ Error en row {item[2]}: {row_err}")
                            conn.rollback()
                
    except Exception as e:
        print(f"❌ Error actualizando base de datos: {e}")
        conn.rollback()
    finally:
        conn.close()
    
    end_time = time.time()
    print(f"\n🎉 Proceso completado exitosamente en {round(end_time - start_time, 2)} segundos.")

if __name__ == "__main__":
    run_project_sync()
