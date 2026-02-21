"""Verify if CUI 2517099 data exists in mef_ejecucion table."""
from app.database import engine
from sqlalchemy import text

CUI = "2517099"

with engine.connect() as conn:
    rows = conn.execute(text(
        "SELECT * FROM mef_ejecucion WHERE producto_proyecto = :cui"
    ), {"cui": CUI}).fetchall()
    
    print(f"\nSearching for CUI {CUI} in mef_ejecucion...")
    if rows:
        print(f"Found {len(rows)} matching rows:")
        total_dev = 0
        total_gir = 0
        for r in rows:
            print(f"  ID={r[0]}, Devengado={r[11]}, Girado={r[12]}, Nombre={r[8][:50]}...")
            total_dev += float(r[11] or 0)
            total_gir += float(r[12] or 0)
        
        print(f"\nTotal Devengado for CUI {CUI}: S/ {total_dev:,.2f}")
        print(f"Total Girado for CUI {CUI}:    S/ {total_gir:,.2f}")
    else:
        print(f"No rows found for CUI {CUI}")

    # Check random samples
    sample = conn.execute(text("SELECT * FROM mef_ejecucion LIMIT 3")).fetchall()
    print("\nRandom samples from table:")
    for r in sample:
        print(r)
