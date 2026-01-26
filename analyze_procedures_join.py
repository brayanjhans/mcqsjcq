import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load env variables
load_dotenv(".env")
engine = create_engine(os.getenv("DATABASE_URL"))

def analyze_joined_adjudications():
    print(f"\n--- Analizando: licitaciones_adjudicaciones (Vía JOIN) ---")
    with engine.connect() as conn:
        sql = """
            SELECT c.tipo_procedimiento, COUNT(a.id_adjudicacion) as total
            FROM licitaciones_adjudicaciones a
            JOIN licitaciones_cabecera c ON a.id_convocatoria = c.id_convocatoria
            GROUP BY c.tipo_procedimiento
            ORDER BY total DESC
        """
        result = conn.execute(text(sql))
        rows = result.fetchall()
        
        print(f"{'TIPO DE PROCEDIMIENTO (ADJUDICACIONES)':<50} | {'CANTIDAD':<10}")
        print("-" * 65)
        total_global = 0
        for row in rows:
            val = str(row[0]) if row[0] else "NULL"
            count = row[1]
            total_global += count
            print(f"{val:<50} | {count:<10}")
        print("-" * 65)
        print(f"{'TOTAL':<50} | {total_global:<10}")

if __name__ == "__main__":
    analyze_joined_adjudications()
