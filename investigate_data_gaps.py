import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(".env")
engine = create_engine(os.getenv("DATABASE_URL"))

def run_integrity_check():
    print("\n=== DIAGNÓSTICO DE INTEGRIDAD DE DATOS ===\n")
    with engine.connect() as conn:
        # 1. Totales Brutos
        total_cab = conn.execute(text("SELECT COUNT(*) FROM licitaciones_cabecera")).scalar()
        total_adj = conn.execute(text("SELECT COUNT(*) FROM licitaciones_adjudicaciones")).scalar()
        
        print(f"Total filas en licitaciones_cabecera:      {total_cab}")
        print(f"Total filas en licitaciones_adjudicaciones: {total_adj}")
        
        # 2. Análisis de Nulos en Tipo de Procedimiento
        sql_nulls = """
            SELECT COUNT(*) FROM licitaciones_cabecera 
            WHERE tipo_procedimiento IS NULL OR tipo_procedimiento = ''
        """
        null_proc = conn.execute(text(sql_nulls)).scalar()
        print(f"Cabeceras con tipo_procedimiento NULL/Vacio: {null_proc}")

        # 3. Datos 'Fantasmas' (Orphans)
        # Adjudicaciones que NO tienen papá en Cabecera
        sql_orphans = """
            SELECT COUNT(*) 
            FROM licitaciones_adjudicaciones a
            LEFT JOIN licitaciones_cabecera c ON a.id_convocatoria = c.id_convocatoria
            WHERE c.id_convocatoria IS NULL
        """
        orphans = conn.execute(text(sql_orphans)).scalar()
        
        print(f"Adjudicaciones HUÉRFANAS (sin Cabecera):   {orphans}")
        if orphans > 0:
            print("   ⚠️  Estas adjudicaciones NO aparecen en el reporte por tipo porque no se sabe su tipo.")

        # 4. Total Reportable (debería coincidir con mi reporte anterior)
        print(f"Total Adjudicaciones Reportables (con tipo): {total_adj - orphans}")
        
        # 5. Muestra de los tipos más raros (para ver si hay basura)
        print("\n--- Tipos de Procedimiento (Top 20 + Colas) ---")
        sql_types = """
            SELECT tipo_procedimiento, COUNT(*) as c 
            FROM licitaciones_cabecera 
            GROUP BY tipo_procedimiento 
            ORDER BY c DESC
        """
        types = conn.execute(text(sql_types)).fetchall()
        for t in types:
            print(f"[{t[0]}] : {t[1]}")

if __name__ == "__main__":
    run_integrity_check()
