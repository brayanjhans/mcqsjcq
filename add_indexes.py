
import pymysql
import os
from dotenv import load_dotenv

load_dotenv(".env")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASS", "")
DB_NAME = os.getenv("DB_NAME", "garantias_seace")

def add_missing_indexes():
    print(f"Connecting to {DB_NAME} at {DB_HOST}...")
    try:
        conn = pymysql.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME)
        cursor = conn.cursor()
        
        indexes_to_add = [
            ("detalle_consorcios", "nombre_miembro", "idx_consorcios_nombre"),
            ("detalle_consorcios", "ruc_miembro", "idx_consorcios_ruc"),
            ("licitaciones_cabecera", "fecha_publicacion", "idx_lic_fecha_pub"),
            ("licitaciones_cabecera", "monto_estimado", "idx_lic_monto"),
            ("licitaciones_adjudicaciones", "monto_adjudicado", "idx_adj_monto")
        ]
        
        for table, column, index_name in indexes_to_add:
            try:
                # Check if index exists
                cursor.execute(f"SHOW INDEX FROM {table} WHERE Key_name = '{index_name}'")
                if cursor.fetchone():
                    print(f"Index {index_name} on {table}.{column} already exists.")
                else:
                    print(f"Adding index {index_name} to {table}.{column}...")
                    cursor.execute(f"CREATE INDEX {index_name} ON {table} ({column})")
                    print(f"Index {index_name} added successfully.")
            except Exception as ex:
                print(f"Error checking/adding index {index_name}: {ex}")
                
        conn.commit()
        cursor.close()
        conn.close()
        print("Index optimization complete.")
        
    except Exception as e:
        print(f"Database Error: {e}")

if __name__ == "__main__":
    add_missing_indexes()
