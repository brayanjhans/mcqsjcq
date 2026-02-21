import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv('.env')
db_url = os.getenv('DATABASE_URL')
engine = create_engine(db_url)

value = 734898.95
print(f"Searching for rows with monto_devengado = {value}...")

query = text("""
    SELECT 
        producto_proyecto, 
        producto_proyecto_nombre, 
        ano_eje, 
        monto_devengado,
        meta_nombre
    FROM mef_ejecucion 
    WHERE ABS(monto_devengado - :val) < 0.01
""")

try:
    with engine.connect() as conn:
        results = conn.execute(query, {"val": value}).fetchall()
        if not results:
            print("No rows found with that exact devengado.")
        else:
            for r in results:
                print(f"CUI: {r[0]}, Name: {r[1]}, Year: {r[2]}, Dev: {r[3]}, Meta: {r[4]}")
except Exception as e:
    print(f"Error: {e}")
