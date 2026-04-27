
"""
Fase 1: Crear índices FULLTEXT en licitaciones_adjudicaciones y detalle_consorcios
Estos reemplazarán los LIKE '%..%' que hacen full scan.
"""
import os, sys
sys.path.append(os.getcwd())
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy import text, create_engine

engine = create_engine(os.getenv("DATABASE_URL"))

ops = [
    {
        "name": "FULLTEXT en licitaciones_adjudicaciones (ganador_nombre, ganador_ruc, entidad_financiera)",
        "sql": "ALTER TABLE licitaciones_adjudicaciones ADD FULLTEXT INDEX ft_adj_search (ganador_nombre, ganador_ruc, entidad_financiera)"
    },
    {
        "name": "FULLTEXT en detalle_consorcios (nombre_miembro, ruc_miembro)",
        "sql": "ALTER TABLE detalle_consorcios ADD FULLTEXT INDEX ft_cons_search (nombre_miembro, ruc_miembro)"
    },
]

with engine.connect() as conn:
    for op in ops:
        print(f"\n→ {op['name']}")
        try:
            conn.execute(text(op['sql']))
            conn.commit()
            print("  ✅ OK")
        except Exception as e:
            err = str(e)
            if 'Duplicate key name' in err or 'already exists' in err.lower():
                print("  ⚠️  Ya existe (skip)")
            else:
                print(f"  ❌ Error: {err}")

print("\nVerificando índices creados...")
with engine.connect() as conn:
    for table in ['licitaciones_adjudicaciones', 'detalle_consorcios']:
        print(f"\n  Tabla: {table}")
        r = conn.execute(text(f"SHOW INDEX FROM {table}"))
        for row in r.fetchall():
            if row[10] == 'FULLTEXT' or 'ft_' in str(row[2]):
                print(f"    ✅ {row[2]} -> col: {row[4]}, type: {row[10]}")
