import sys
import os
sys.path.append(os.getcwd())

from app.database import SessionLocal, engine
from sqlalchemy import text

def add_column():
    db = SessionLocal()
    try:
        # Check if column exists
        check_sql = text("SHOW COLUMNS FROM licitaciones_adjudicaciones LIKE 'moneda'")
        result = db.execute(check_sql).fetchone()
        
        if not result:
            print("Adding 'moneda' column to licitaciones_adjudicaciones...")
            # Add column 'moneda' defaulting to 'PEN'
            alter_sql = text("ALTER TABLE licitaciones_adjudicaciones ADD COLUMN moneda VARCHAR(10) DEFAULT 'PEN'")
            db.execute(alter_sql)
            db.commit()
            print("Column added successfully.")
        else:
            print("Column 'moneda' already exists.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_column()
