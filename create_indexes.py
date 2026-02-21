
from app.database import engine
from sqlalchemy import text

def create_index(index_name, table, column):
    print(f"Creating index {index_name} on {table}({column})...")
    try:
        with engine.connect() as conn:
            conn.execute(text(f"CREATE INDEX {index_name} ON {table}({column})"))
            print("Success!")
    except Exception as e:
        if "Duplicate key name" in str(e):
            print(f"Index {index_name} already exists.")
        else:
            print(f"Error creating index {index_name}: {e}")

if __name__ == "__main__":
    # Optimizing Joins
    create_index("idx_la_id_contrato", "licitaciones_adjudicaciones", "id_contrato")
    create_index("idx_la_id_adjudicacion", "licitaciones_adjudicaciones", "id_adjudicacion")
    create_index("idx_dc_id_contrato", "detalle_consorcios", "id_contrato")
    
    # Optimizing Search
    create_index("idx_dc_nombre_miembro", "detalle_consorcios", "nombre_miembro(50)")
    create_index("idx_dc_ruc_miembro", "detalle_consorcios", "ruc_miembro")
