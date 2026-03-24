import pymysql
import re
import os
import time
import csv
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASS', '123456789'),
    'db': 'mcqs-jcq',
    'charset': 'utf8mb4'
}

def extract_cuis(text):
    if not text:
        return []
    # Match any 7-digit number
    pattern = re.compile(r'\b\d{7}\b')
    found = pattern.findall(text)
    # Deduplicate and sort
    return sorted(list(set(found)))

def main():
    conn = pymysql.connect(**DB_CONFIG)
    start_time = time.time()
    
    print("🚀 Iniciando extracción universal de CUIs desde descripciones...")
    
    try:
        with conn.cursor() as cursor:
            # 1. Fetch all records with descriptions
            print("🔍 Obteniendo registros de la base de datos...")
            cursor.execute("SELECT id_convocatoria, descripcion, cui FROM licitaciones_cabecera")
            rows = cursor.fetchall()
            print(f"📦 Procesando {len(rows)} registros...")
            
            updates = []
            all_mappings = [] # To export EVERYTHING to CSV
            for id_conv, desc, current_cui in rows:
                extracted = extract_cuis(desc)
                
                # Also include current_cui parts if they are valid CUIs
                if current_cui:
                    cur_cuis = extract_cuis(str(current_cui))
                    for c in cur_cuis:
                        if c not in extracted:
                            extracted.append(c)
                
                if extracted:
                    cui_str = ",".join(sorted(extracted))
                    all_mappings.append((cui_str, id_conv)) # Collect for CSV
                    if cui_str != current_cui:
                        updates.append((cui_str, id_conv))
            
            print(f"📝 Se actualizarán localmente {len(updates)} registros.")
            print(f"📊 Total de registros con CUI para exportar: {len(all_mappings)}")
            
            # 2. Batch update LOCAL
            if updates:
                batch_size = 1000
                update_sql = "UPDATE licitaciones_cabecera SET cui = %s WHERE id_convocatoria = %s"
                
                for i in range(0, len(updates), batch_size):
                    batch = updates[i:i+batch_size]
                    cursor.executemany(update_sql, batch)
                    conn.commit()
                    print(f"   📊 Progreso: {min(i+batch_size, len(updates))} / {len(updates)}")
            
            # 3. EXPORT TO CSV for VPS sync (Data-only)
            csv_path = "cui_updates.csv"
            print(f"📤 Exportando {len(all_mappings)} mapeos de CUI a {csv_path}...")
            with open(csv_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['id_convocatoria', 'cui'])
                for cui_str, id_conv in all_mappings:
                    writer.writerow([id_conv, cui_str])
            
            print(f"✅ CSV generado: {os.path.abspath(csv_path)}")
                    
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()
        
    end_time = time.time()
    print(f"🎉 Proceso finalizado en {round(end_time - start_time, 2)} segundos.")

if __name__ == '__main__':
    main()
