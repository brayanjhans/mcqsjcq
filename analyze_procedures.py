import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load env variables
load_dotenv(".env")

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("[ERROR] DATABASE_URL not found")
    sys.exit(1)

engine = create_engine(db_url)

def analyze_table(table_name, column_name):
    print(f"\n--- Analizando: {table_name}.{column_name} ---")
    with engine.connect() as conn:
        # 1. Check if column exists
        try:
            conn.execute(text(f"SELECT {column_name} FROM {table_name} LIMIT 1"))
        except Exception as e:
            print(f"❌ La columna '{column_name}' NO existe en la tabla '{table_name}'.")
            return

        # 2. Count values
        sql = f"""
            SELECT {column_name}, COUNT(*) as total 
            FROM {table_name} 
            GROUP BY {column_name} 
            ORDER BY total DESC
        """
        result = conn.execute(text(sql))
        rows = result.fetchall()
        
        print(f"{'TIPO DE PROCEDIMIENTO':<50} | {'CANTIDAD':<10}")
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
    analyze_table("licitaciones_cabecera", "tipo_procedimiento")
    analyze_table("licitaciones_adjudicaciones", "tipo_procedimiento")
