from app.database import SessionLocal
import sqlalchemy as sa
import time

def add_indexes():
    db = SessionLocal()
    
    indexes = [
        ("idx_dash_fecha_pub", "fecha_publicacion"),
        ("idx_dash_estado", "estado_proceso(50)"),
        ("idx_dash_depto", "departamento(50)"),
        ("idx_dash_categoria", "categoria"),
        ("idx_dash_tipo", "tipo_procedimiento")
    ]
    
    for idx_name, columns in indexes:
        try:
            print(f"Adding index {idx_name} on {columns}...")
            start = time.time()
            db.execute(sa.text(f"CREATE INDEX {idx_name} ON licitaciones_cabecera({columns})"))
            db.commit()
            print(f"Successfully added {idx_name} in {time.time() - start:.2f} seconds.")
        except Exception as e:
            db.rollback()
            print(f"Index {idx_name} might already exist or failed: {e}")
            
    db.close()

if __name__ == "__main__":
    add_indexes()
