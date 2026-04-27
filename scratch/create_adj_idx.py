
import os, sys
sys.path.append(os.getcwd())
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy import text, create_engine

engine = create_engine(os.getenv("DATABASE_URL"))

indexes = [
    "ALTER TABLE licitaciones_adjudicaciones ADD INDEX idx_adj_ganador_nombre (ganador_nombre(100))",
    "ALTER TABLE licitaciones_adjudicaciones ADD INDEX idx_adj_ganador_ruc (ganador_ruc)",
    "ALTER TABLE licitaciones_adjudicaciones ADD INDEX idx_adj_id_convocatoria (id_convocatoria)",
    "ALTER TABLE licitaciones_adjudicaciones ADD INDEX idx_adj_id_contrato (id_contrato)",
]

with engine.connect() as conn:
    for sql in indexes:
        try:
            print(f"Creating: {sql[:70]}...")
            conn.execute(text(sql))
            conn.commit()
            print("  OK")
        except Exception as e:
            print(f"  Skip/Error: {e}")

print("\nDone.")
