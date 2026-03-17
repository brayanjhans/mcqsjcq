import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.services.infobras_service import InfobrasService
from sqlalchemy import text

def sync_all():
    db = SessionLocal()
    print("Iniciando busqueda de CUIs faltantes de Infobras...")
    try:
        query1 = text("""
            SELECT DISTINCT cui 
            FROM licitaciones_cabecera 
            WHERE cui IS NOT NULL AND cui != ''
        """)
        rows1 = db.execute(query1).fetchall()
        cabecera_cuis = set(row[0] for row in rows1)
        
        query2 = text("""
            SELECT cui FROM infobras_obras 
            WHERE estado_ejecucion != 'NO_ENCONTRADO' AND estado_ejecucion IS NOT NULL
        """)
        rows2 = db.execute(query2).fetchall()
        obras_cuis = set(row[0] for row in rows2)
        
        cuis_to_sync = cabecera_cuis - obras_cuis
        
        cuis = ['2480390'] + list(cuis_to_sync)
        # De-duplicate just in case
        cuis = list(dict.fromkeys(cuis))
        
        total = len(cuis)
        print(f"Encontrados {total} CUIs para sincronizar.")
        
        for i, cui in enumerate(cuis):
            print(f"[{i+1}/{total}] Sincronizando CUI {cui}...")
            # Llamar a la sync
            try:
                success = InfobrasService.sync_infobras_for_cui(cui, db)
                if success:
                    print(f"  -> Exito en sincronizacion.")
                else:
                    print(f"  -> No data / Fallo.")
            except Exception as loop_e:
                print(f"  -> Error especifico en CUI {cui}: {loop_e}")
            
            time.sleep(0.5) # respect API limits
            
    except Exception as e:
        print(f"Error global: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    sync_all()
