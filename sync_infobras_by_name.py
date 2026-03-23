import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.services.infobras_service import InfobrasService
from sqlalchemy import text

def sync_by_project_name(year=None, limit=None):
    db = SessionLocal()
    print(f"🚀 Iniciando sincronización de Infobras por NOMBRE sugerido ({year or 'Todos los años'})...")
    
    try:
        # 1. Obtener proyectos que tengan nombre y cui (o cui 0)
        # Priorizamos los que tienen nombre significativo
        query_sql = """
            SELECT cui, proyecto 
            FROM licitaciones_cabecera 
            WHERE proyecto IS NOT NULL 
              AND LENGTH(proyecto) > 10
        """
        if year:
            query_sql += f" AND YEAR(fecha_publicacion) = {year}"
        
        if limit:
            query_sql += f" LIMIT {limit}"
            
        rows = db.execute(text(query_sql)).fetchall()
        total = len(rows)
        print(f"📦 Encontrados {total} proyectos para procesar.")

        for i, (cui, proyecto) in enumerate(rows):
            if not proyecto or len(proyecto) < 10:
                continue

            # Ensure CUI is clean and max 15 chars (primary key limit)
            if cui:
                cui = str(cui).split(',')[0].strip()[:15]

            # Check if project was already synced successfully
            check_q = text("SELECT obra_id_infobras FROM infobras_obras WHERE cui = :cui AND obra_id_infobras <> 'NO_ENCONTRADO'")
            res_check = db.execute(check_q, {"cui": cui}).fetchone()
            if res_check:
                # print(f"  ⏭️ Saltando {cui} (ya existe)")
                continue

            print(f"[{i+1}/{total}] Sincronizando: '{proyecto[:50]}...' (CUI: {cui or 'N/A'})")
            
            try:
                # El servicio ya tiene la lógica de búsqueda por nombre si el CUI falla
                success = InfobrasService.sync_infobras_for_cui(cui, db)
                if success:
                    print(f"  ✅ Éxito.")
                else:
                    print(f"  ❌ No encontrado / Sin datos públicos.")
            except Exception as e:
                print(f"  ⚠️ Error: {e}")
            
            # Pequeño delay mayor para no saturar Infobras
            time.sleep(1.5)

    except Exception as ge:
        print(f"🛑 Error Global: {ge}")
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, help="Año a procesar")
    parser.add_argument("--limit", type=int, help="Límite de proyectos")
    args = parser.parse_args()
    
    sync_by_project_name(args.year, args.limit)
