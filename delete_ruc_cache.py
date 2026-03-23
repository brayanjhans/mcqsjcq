import os, sys
from sqlalchemy import text
sys.path.append(os.getcwd())
from app.database import SessionLocal

db = SessionLocal()
ruc = '20601230560'
db.execute(text("DELETE FROM consulta_ruc WHERE ruc = :ruc"), {"ruc": ruc})
db.commit()
print(f"Cache DELETED for RUC {ruc}")
db.close()
