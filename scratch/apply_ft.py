
import os
import sys
from sqlalchemy import text, create_engine
from dotenv import load_dotenv

sys.path.append(os.getcwd())
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def apply_fulltext():
    queries = [
        # Drop if exists (optional, but let's be safe)
        "ALTER TABLE licitaciones_cabecera DROP INDEX IF EXISTS ft_search",
        # Create the exact index used in the code
        "ALTER TABLE licitaciones_cabecera ADD FULLTEXT INDEX ft_search (nomenclatura, descripcion, comprador, id_convocatoria, ubicacion_completa)"
    ]
    
    with engine.connect() as conn:
        for q in queries:
            print(f"Executing: {q}")
            try:
                conn.execute(text(q))
                conn.commit()
                print("Done.")
            except Exception as e:
                print(f"Error: {e}")

if __name__ == "__main__":
    apply_fulltext()
