import sys
import os
import requests
import json

# Add project root to path
sys.path.append(os.getcwd())

import sys
import os
import requests
import urllib.parse

API_URL = "http://localhost:8000/api/licitaciones"

import sys
import os
import requests
import urllib.parse

API_URL = "http://localhost:8000/api/licitaciones"

import sys
import os
import requests
import urllib.parse
import unicodedata

API_URL = "http://localhost:8000/api/licitaciones"

def normalize_text(text):
    return unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')

def test_spacing_mismatch():
    print("\nTesting Spacing Normalization (N° vs N° )...")
    # DB has: 'Licitación Pública Abreviada - Ley N°26859' (NO SPACE)
    # Frontend might send: 'Licitación Pública Abreviada - Ley N° 26859' (WITH SPACE)
    
    target = 'Licitación Pública Abreviada - Ley N° 26859' # With Space
    
    params = {
        "tipo_procedimiento": target,
        "page": 1,
        "limit": 1
    }
    
    try:
        response = requests.get(API_URL, params=params)
        data = response.json()
        total = data.get("total", 0)
        
        print(f"Searching for '{target}' (With Space)...")
        if total > 0:
            print(f"[SUCCESS] Found {total} records matches DB (No Space). Normalization Working!")
        else:
            print(f"[FAIL] Found 0 records. Normalization failed.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_spacing_mismatch()
            
def dump_db_types():
    print("\n\n--- DB ACTUAL PROCEDURE TYPES ---")
    try:
        from sqlalchemy import create_engine, text
        from app.database import DATABASE_URL
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT DISTINCT tipo_procedimiento FROM licitaciones_cabecera ORDER BY 1")).fetchall()
            for r in result:
                print(f"DB: '{r[0]}'")
    except Exception as e:
        print(f"DB Dump Error: {e}")

if __name__ == "__main__":
    test_frontend_types()
    dump_db_types()
