
from app.database import engine
from sqlalchemy import text

def ensure_indexes():
    print("Checking indexes...")
    with engine.connect() as conn:
        # Check specific index on detalle_consorcios
        result = conn.execute(text("SHOW INDEX FROM detalle_consorcios WHERE Key_name = 'idx_dc_id_contrato'"))
        if result.fetchone():
            print("Index idx_dc_id_contrato exists.")
        else:
            print("Creating idx_dc_id_contrato...")
            try:
                conn.execute(text("CREATE INDEX idx_dc_id_contrato ON detalle_consorcios(id_contrato)"))
                print("Created idx_dc_id_contrato")
            except Exception as e:
                print(f"Error: {e}")

        # Check search index
        result = conn.execute(text("SHOW INDEX FROM detalle_consorcios WHERE Key_name = 'idx_dc_nombre_miembro'"))
        if result.fetchone():
             print("Index idx_dc_nombre_miembro exists.")
        else:
             print("Creating idx_dc_nombre_miembro...")
             try:
                conn.execute(text("CREATE INDEX idx_dc_nombre_miembro ON detalle_consorcios(nombre_miembro(50))"))
                print("Created idx_dc_nombre_miembro")
             except Exception as e:
                 print(f"Error: {e}")

        # LA indexes
        result = conn.execute(text("SHOW INDEX FROM licitaciones_adjudicaciones WHERE Key_name = 'idx_la_id_contrato'"))
        if result.fetchone():
             print("Index idx_la_id_contrato exists.")
        else:
             print("Creating idx_la_id_contrato...")
             try:
                conn.execute(text("CREATE INDEX idx_la_id_contrato ON licitaciones_adjudicaciones(id_contrato)"))
                print("Created idx_la_id_contrato")
             except Exception as e:
                 print(f"Error: {e}")

        result = conn.execute(text("SHOW INDEX FROM licitaciones_adjudicaciones WHERE Key_name = 'idx_la_id_adjudicacion'"))
        if result.fetchone():
             print("Index idx_la_id_adjudicacion exists.")
        else:
             print("Creating idx_la_id_adjudicacion...")
             try:
                conn.execute(text("CREATE INDEX idx_la_id_adjudicacion ON licitaciones_adjudicaciones(id_adjudicacion)"))
                print("Created idx_la_id_adjudicacion")
             except Exception as e:
                 print(f"Error: {e}")

if __name__ == "__main__":
    ensure_indexes()
