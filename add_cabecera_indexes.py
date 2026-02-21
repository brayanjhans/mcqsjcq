import os
import pymysql
from dotenv import load_dotenv

load_dotenv("/home/admin/public_html/api/.env")

host = "127.0.0.1"
user = os.getenv("DB_USER")
password = os.getenv("DB_PASS")
db_name = os.getenv("DB_NAME")

print(f"Connecting to {host} as {user}...")

def add_index(cursor, table, index_name, column):
    try:
        print(f"Adding index {index_name} on {column}...")
        cursor.execute(f"CREATE INDEX {index_name} ON {table}({column});")
        print(f"Index {index_name} created.")
    except Exception as e:
        print(f"Skipping {index_name}: {e}")

try:
    conn = pymysql.connect(host=host, user=user, password=password, database=db_name)
    with conn.cursor() as cursor:
        # Critical Search Fields
        add_index(cursor, "licitaciones_cabecera", "idx_nomenclatura", "nomenclatura")
        add_index(cursor, "licitaciones_cabecera", "idx_descripcion_prefix", "descripcion(50)") # Prefix index for long text
        add_index(cursor, "licitaciones_cabecera", "idx_comprador", "comprador")
        add_index(cursor, "licitaciones_cabecera", "idx_departamento", "departamento")
        add_index(cursor, "licitaciones_cabecera", "idx_fecha_pub", "fecha_publicacion")
        
        # Composite for common filters?
        # Maybe later if needed. Singular indexes help significantly already.

    conn.commit()
    conn.close()
    print("Done.")
except Exception as e:
    print(f"Connection Failed: {e}")
