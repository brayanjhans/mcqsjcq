
import sys
import os
from sqlalchemy import text
from app.database import SessionLocal
# from app.routers.licitaciones_raw import clean_date # Removed

def clean_date(d):
    if d and isinstance(d, str):
        return d.replace('T', ' ').replace('Z', '').split('.')[0]
    return d

# Mocking the update logic to see the error
def debug_update(id_convocatoria):
    db = SessionLocal()
    try:
        print(f"--- Debugging Update for {id_convocatoria} ---")
        
        # 1. Fetch existing data to simulate state
        linked_data = db.execute(text("SELECT id_contrato, id_adjudicacion FROM licitaciones_adjudicaciones WHERE id_convocatoria = :id"), {"id": id_convocatoria}).fetchall()
        print(f"Found {len(linked_data)} existing adjudications.")
        
        # 2. Simulate Cleanup Logic (The part likely failing)
        print("Attempting cleanup...")
        try:
             ids_to_remove = set()
             for r in linked_data:
                 if r[0]: ids_to_remove.add(str(r[0]))
                 if r[1]: 
                     adj_id = str(r[1])
                     ids_to_remove.add(adj_id)
                     ids_to_remove.add(f"GEN-{adj_id[:8]}")
                     ids_to_remove.add(f"UPD-{adj_id[:8]}")
             
             print(f"IDs to remove from consorcios: {ids_to_remove}")

             if ids_to_remove:
                 s_ids = ",".join([f"'{x}'" for x in ids_to_remove])
                 # db.execute(text(f"DELETE FROM detalle_consorcios WHERE id_contrato IN ({s_ids})")) 
                 # Commented out actual delete to just test the SELECT/Logic, 
                 # BUT we need to test the DELETE to catch constraint errors.
                 # So we will wrap in nested try/except
                 
                 db.execute(text(f"DELETE FROM detalle_consorcios WHERE id_contrato IN ({s_ids})"))
                 print("Consorcios cleanup successful.")
                 
        except Exception as e:
            print(f"ERROR in Consorcio Cleanup: {e}")
            raise e

        print("Adjudicacion cleanup successful.")

        # 3. Simulate INSERT (The Re-Insertion)
        print("Attempting Re-Insertion...")
        
        # Test Data mirroring the user's case
        import uuid
        adj_id = str(uuid.uuid4())
        
        sql_adj = text("""
            INSERT INTO licitaciones_adjudicaciones (
                id_adjudicacion, id_convocatoria, ganador_nombre, ganador_ruc,
                monto_adjudicado, fecha_adjudicacion, estado_item, 
                entidad_financiera, tipo_garantia, id_contrato, moneda,
                url_pdf_contrato, url_pdf_consorcio, url_pdf_cartafianza
            ) VALUES (
                :id_adj, :id_conv, :nombre, :ruc, 
                :monto, :fecha, :estado, 
                :banco, :garantia, :contrato, :moneda,
                :url_contrato, :url_consorcio, :url_fianza
            )
        """)
        
        db.execute(sql_adj, {
            "id_adj": adj_id,
            "id_conv": id_convocatoria,
            "nombre": "VERAMENDI SALVADOR MARGARITA LIZ",
            "ruc": "10438042216",
            "monto": 5400480.53,
            "fecha": "2026-01-22",
            "estado": "Adjudicado",
            "banco": None,
            "garantia": None,
            "contrato": None,
            "moneda": "PEN",
            "url_contrato": None,
            "url_consorcio": None,
            "url_fianza": None
        })
        print("Re-insertion successful.")
        
        db.rollback() # Rolling back to not destroy data
        print("--- Success (Rolled back) ---")

    except Exception as e:
        print(f"\nCRITICAL ERROR CAUGHT: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    debug_update("1185149")
