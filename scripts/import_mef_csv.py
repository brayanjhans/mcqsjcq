"""
Import MEF Gasto CSV to local mef_ejecucion table.

Matches by CUI (Código Único de Inversión) extracted from licitacion descriptions.
The CUI maps to PRODUCTO_PROYECTO column in the MEF CSV.

Usage:
    python scripts/import_mef_csv.py [--year 2025] [--all-rows]

Download CSV first:
    curl.exe -L -o scripts/mef_2025_gasto.csv "https://fs.datosabiertos.mef.gob.pe/datastorefiles/2025-Gasto-Devengado-Diario.csv"
"""
import csv
import os
import re
import sys
import argparse
import time
from decimal import Decimal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.database import engine
from sqlalchemy import text

# CSV download URLs by year
CSV_URLS = {
    2024: "https://fs.datosabiertos.mef.gob.pe/datastorefiles/2024-Gasto-Devengado-Diario.csv",
    2025: "https://fs.datosabiertos.mef.gob.pe/datastorefiles/2025-Gasto-Devengado-Diario.csv",
    2026: "https://fs.datosabiertos.mef.gob.pe/datastorefiles/2026-Gasto-Devengado-Diario.csv",
}

# Columns to extract from the CSV
COLUMNS_MAP = {
    "ANO_EJE": "ano_eje",
    "SEC_EJEC": "sec_ejec",
    "NIVEL_GOBIERNO": "nivel_gobierno",
    "SECTOR": "sector",
    "PLIEGO": "pliego",
    "EJECUTORA": "ejecutora",
    "PRODUCTO_PROYECTO": "producto_proyecto",
    "PRODUCTO_PROYECTO_NOMBRE": "producto_proyecto_nombre",
    "MONTO_PIA": "monto_pia",
    "MONTO_PIM": "monto_pim",
    "MONTO_DEVENGADO_ANUAL": "monto_devengado",
    "MONTO_GIRADO_ANUAL": "monto_girado",
    "MONTO_CERTIFICADO_ANUAL": "monto_certificado",
    "MONTO_COMPROMETIDO_ANUAL": "monto_comprometido_anual",
    "META_NOMBRE": "meta_nombre",
    "DEPARTAMENTO_META_NOMBRE": "departamento_meta",
}

BATCH_SIZE = 2000


def extract_cuis_from_db():
    """
    Extract CUIs from licitacion descriptions.
    CUI appears in description like "CUI: 2517099" or "CUI 2517099".
    """
    cui_pattern = re.compile(r'(?:CUI|C\.U\.I\.|C[OÓ]DIGO\s+[UÚ]NICO\s+DE\s+INVERSI[OÓ]N|C[OÓ]DIGO\s+[UÚ]NICO|C[OÓ]DIGO\s+DE\s+INVERSI[OÓ]N)[\s:]*(?:N[º°\.]?)?[\s:]*([\d.]{7,10})', re.IGNORECASE)
    snip_pattern = re.compile(r'(?:SNIP|C[OÓ]DIGO\s+SNIP)[\s:]*(?:N[º°\.]?)?[\s:]*([\d.]{5,8})', re.IGNORECASE)

    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT id_convocatoria, descripcion 
            FROM licitaciones_cabecera 
            WHERE descripcion IS NOT NULL AND descripcion != ''
        """)).fetchall()

    cuis = set()
    for r in rows:
        desc = str(r[1]) if r[1] else ""
        found = cui_pattern.findall(desc) + snip_pattern.findall(desc)
        for c in found:
            cuis.add(c.strip())

    print(f"  Extracted {len(cuis)} unique CUIs from {len(rows)} licitaciones")
    if cuis:
        print(f"  Sample: {list(cuis)[:5]}")
    return cuis


def clear_year(year: int):
    """Delete existing data for a specific year."""
    with engine.connect() as conn:
        conn.execute(text("DELETE FROM mef_ejecucion WHERE ano_eje = :year"), {"year": year})
        conn.commit()


def upsert_batch(rows: list):
    """Upsert a batch of rows using INSERT ... ON DUPLICATE KEY UPDATE.
    
    Requires a unique key on (ano_eje, sec_ejec, producto_proyecto, meta_nombre).
    This avoids full-table deletes and keeps data consistent during import.
    Run this SQL once to create the key if it doesn't exist:
      ALTER TABLE mef_ejecucion ADD UNIQUE KEY uk_mef_row (ano_eje, sec_ejec, producto_proyecto(100), meta_nombre(200));
    """
    if not rows:
        return
    with engine.connect() as conn:
        conn.execute(text("""
            INSERT INTO mef_ejecucion 
                (ano_eje, sec_ejec, nivel_gobierno, sector, pliego, ejecutora,
                 producto_proyecto, producto_proyecto_nombre,
                 monto_pia, monto_pim, monto_devengado, monto_girado,
                 monto_certificado, monto_comprometido_anual,
                 meta_nombre, departamento_meta)
            VALUES 
                (:ano_eje, :sec_ejec, :nivel_gobierno, :sector, :pliego, :ejecutora,
                 :producto_proyecto, :producto_proyecto_nombre,
                 :monto_pia, :monto_pim, :monto_devengado, :monto_girado,
                 :monto_certificado, :monto_comprometido_anual,
                 :meta_nombre, :departamento_meta)
            ON DUPLICATE KEY UPDATE
                monto_pia = VALUES(monto_pia),
                monto_pim = VALUES(monto_pim),
                monto_devengado = VALUES(monto_devengado),
                monto_girado = VALUES(monto_girado),
                monto_certificado = VALUES(monto_certificado),
                monto_comprometido_anual = VALUES(monto_comprometido_anual),
                nivel_gobierno = VALUES(nivel_gobierno),
                sector = VALUES(sector),
                pliego = VALUES(pliego),
                ejecutora = VALUES(ejecutora),
                producto_proyecto_nombre = VALUES(producto_proyecto_nombre),
                departamento_meta = VALUES(departamento_meta)
        """), rows)
        conn.commit()


def insert_batch(rows: list):
    """Legacy full-insert (used when no unique key exists). Prefer upsert_batch."""
    if not rows:
        return
    with engine.connect() as conn:
        conn.execute(text("""
            INSERT INTO mef_ejecucion 
                (ano_eje, sec_ejec, nivel_gobierno, sector, pliego, ejecutora,
                 producto_proyecto, producto_proyecto_nombre,
                 monto_pia, monto_pim, monto_devengado, monto_girado,
                 monto_certificado, monto_comprometido_anual,
                 meta_nombre, departamento_meta)
            VALUES 
                (:ano_eje, :sec_ejec, :nivel_gobierno, :sector, :pliego, :ejecutora,
                 :producto_proyecto, :producto_proyecto_nombre,
                 :monto_pia, :monto_pim, :monto_devengado, :monto_girado,
                 :monto_certificado, :monto_comprometido_anual,
                 :meta_nombre, :departamento_meta)
        """), rows)
        conn.commit()


def safe_decimal(value: str) -> Decimal:
    """Convert string to Decimal."""
    if not value or value.strip() == "":
        return Decimal("0")
    try:
        return Decimal(value.strip().replace(",", ""))
    except Exception:
        return Decimal("0")


def import_from_file(filepath: str, year: int, filter_cuis: set | None = None, incremental: bool = False):
    """Import from a local CSV file, filtering by CUI in PRODUCTO_PROYECTO.
    
    Args:
        incremental: If True, uses INSERT ... ON DUPLICATE KEY UPDATE (no delete).
                     If False (default), clears year data then inserts fresh.
    """
    print(f"\n  Reading: {filepath}")
    file_size = os.path.getsize(filepath)
    print(f"  File size: {file_size:,} bytes ({file_size / 1024 / 1024:.1f} MB)")

    if incremental:
        print(f"  Mode: INCREMENTAL (upsert — no data loss during import)")
    else:
        clear_year(year)
        print(f"  Cleared existing data for year {year}")

    total_rows = 0
    matched_rows = 0
    batch = []
    start_time = time.time()

    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        print(f"  CSV has {len(reader.fieldnames or [])} columns")

        for row in reader:
            total_rows += 1

            # Filter by CUI in PRODUCTO_PROYECTO
            pp = (row.get("PRODUCTO_PROYECTO") or "").strip()
            if filter_cuis is not None and pp not in filter_cuis:
                continue

            # Extract row data
            db_row = {}
            for csv_col, db_col in COLUMNS_MAP.items():
                val = (row.get(csv_col) or "").strip()
                if db_col.startswith("monto_"):
                    db_row[db_col] = safe_decimal(val)
                elif db_col == "ano_eje":
                    db_row[db_col] = int(val) if val else year
                else:
                    limit = 200
                    if db_col == "nivel_gobierno": limit = 5
                    elif db_col in ["sector", "pliego", "ejecutora"]: limit = 10
                    elif db_col == "producto_proyecto": limit = 20
                    elif db_col == "sec_ejec": limit = 50
                    elif db_col == "departamento_meta": limit = 100
                    elif db_col == "producto_proyecto_nombre": limit = 450
                    elif db_col == "meta_nombre": limit = 500
                    
                    if val is not None:
                        db_row[db_col] = val[:limit]
                    else:
                        db_row[db_col] = None

            batch.append(db_row)
            matched_rows += 1

            if len(batch) >= BATCH_SIZE:
                if incremental:
                    upsert_batch(batch)
                else:
                    insert_batch(batch)
                batch = []

            # Progress every 500k rows
            if total_rows % 500000 == 0:
                elapsed = time.time() - start_time
                rate = total_rows / elapsed if elapsed > 0 else 0
                print(f"  ... {total_rows:,} rows | matched {matched_rows:,} | {rate:,.0f} rows/s")

    # Final batch
    if batch:
        if incremental:
            upsert_batch(batch)
        else:
            insert_batch(batch)

    elapsed = time.time() - start_time
    print(f"\n  DONE!")
    print(f"  Total rows scanned:   {total_rows:,}")
    print(f"  Matched & imported:   {matched_rows:,}")
    print(f"  Time:                 {elapsed:.1f}s")
    print(f"  Rate:                 {total_rows / elapsed:,.0f} rows/s")


def main():
    parser = argparse.ArgumentParser(description="Import MEF Gasto CSV to local DB")
    parser.add_argument("--year", type=int, default=2025, help="Fiscal year (default: 2025)")
    parser.add_argument("--file", type=str, default=None, help="Local CSV file path")
    parser.add_argument("--all-rows", action="store_true", help="Import ALL rows (no CUI filter)")
    parser.add_argument("--incremental", action="store_true",
                        help="Use upsert instead of delete+insert (no downtime, requires unique key)")
    args = parser.parse_args()

    if args.file is None:
        args.file = os.path.join(os.path.dirname(__file__), f"mef_{args.year}_gasto.csv")

    if not os.path.exists(args.file):
        print(f"ERROR: CSV file not found at {args.file}")
        url = CSV_URLS.get(args.year, "<URL>")
        print(f'Download first:\n  curl.exe -L -o "{args.file}" "{url}"')
        return

    print("=" * 60)
    print(f"MEF CSV Import — Year {args.year}")
    if args.incremental:
        print("  [ INCREMENTAL MODE — data stays live during import ]")
    print("=" * 60)

    filter_cuis = None
    if not args.all_rows:
        print("\nStep 1: Extracting CUIs from licitacion descriptions...")
        filter_cuis = extract_cuis_from_db()
        if not filter_cuis:
            print("  WARNING: No CUIs found. Use --all-rows to import everything.")
            return
    else:
        print("\n  Mode: ALL ROWS (no CUI filter)")

    print(f"\nStep 2: Importing from CSV...")
    import_from_file(args.file, args.year, filter_cuis, incremental=args.incremental)

    # Summary
    with engine.connect() as conn:
        count = conn.execute(text(
            "SELECT COUNT(*) FROM mef_ejecucion WHERE ano_eje = :year"
        ), {"year": args.year}).scalar()
        total_dev = conn.execute(text(
            "SELECT COALESCE(SUM(monto_devengado), 0) FROM mef_ejecucion WHERE ano_eje = :year"
        ), {"year": args.year}).scalar()
        total_gir = conn.execute(text(
            "SELECT COALESCE(SUM(monto_girado), 0) FROM mef_ejecucion WHERE ano_eje = :year"
        ), {"year": args.year}).scalar()

    print(f"\n  Summary:")
    print(f"  Rows in mef_ejecucion (year {args.year}): {count:,}")
    print(f"  Total Devengado: S/ {total_dev:,.2f}")
    print(f"  Total Girado:    S/ {total_gir:,.2f}")


if __name__ == "__main__":
    main()
