import os
import pymysql
from dotenv import load_dotenv

load_dotenv("/home/admin/public_html/api/.env")

host = "127.0.0.1"
user = os.getenv("DB_USER")
password = os.getenv("DB_PASS")
db_name = os.getenv("DB_NAME")

print(f"Connecting to {host} as {user}...")

try:
    conn = pymysql.connect(host=host, user=user, password=password, database=db_name)
    with conn.cursor() as cursor:
        # 1. Index on nombre_miembro
        try:
            print("Adding index idx_consorcio_nombre...")
            cursor.execute("CREATE INDEX idx_consorcio_nombre ON detalle_consorcios(nombre_miembro);")
            print("Index idx_consorcio_nombre created.")
        except Exception as e:
            print(f"Skipping idx_consorcio_nombre: {e}")

        # 2. Index on ruc_miembro  
        try:
            print("Adding index idx_consorcio_ruc...")
            cursor.execute("CREATE INDEX idx_consorcio_ruc ON detalle_consorcios(ruc_miembro);")
            print("Index idx_consorcio_ruc created.")
        except Exception as e:
             print(f"Skipping idx_consorcio_ruc: {e}")
             
    conn.commit()
    conn.close()
    print("Done.")
except Exception as e:
    print(f"Connection Failed: {e}")
