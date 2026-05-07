"""
Pobla el índice 'sugerencias' en Meilisearch en el VPS.
Extrae RUCs y nombres únicos de Proveedores y Entidades via UNION SQL.
Ejecutar una vez (y luego automáticamente en cada sync MEF/SEACE).

Uso:
  python scripts/sync_suggestions_index.py
"""
import os
import sys
import time
import hashlib

# Asegurar que podemos importar desde la raíz del proyecto
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
MEILI_URL    = os.getenv("MEILI_URL", "http://127.0.0.1:7700")
MEILI_KEY    = os.getenv("MEILI_KEY", "MEILI_MCQS_JCQ_2026_SECRET")
INDEX_NAME   = "sugerencias"
BATCH_SIZE   = 5000

HEADERS = {"Authorization": f"Bearer {MEILI_KEY}", "Content-Type": "application/json"}


def _meili_ok() -> bool:
    try:
        r = httpx.get(f"{MEILI_URL}/health", timeout=5.0)
        return r.status_code == 200 and r.json().get("status") == "available"
    except Exception as e:
        print(f"[sync_suggestions] Meilisearch no disponible: {e}")
        return False


def _configure_index():
    """Configura el índice sugerencias con searchable y filterable attributes."""
    settings = {
        "searchableAttributes": ["nombre", "ruc"],
        "filterableAttributes": ["tipo"],
        "typoTolerance": {
            "enabled": True,
            "disableOnAttributes": ["ruc"],
        },
        "rankingRules": ["words", "typo", "proximity", "attribute", "sort", "exactness"],
    }
    r = httpx.patch(
        f"{MEILI_URL}/indexes/{INDEX_NAME}/settings",
        json=settings,
        headers=HEADERS,
        timeout=10.0,
    )
    print(f"[sync_suggestions] Configuración del índice: HTTP {r.status_code}")


def _bulk_index(docs: list[dict]) -> bool:
    r = httpx.post(
        f"{MEILI_URL}/indexes/{INDEX_NAME}/documents?primaryKey=id",
        json=docs,
        headers=HEADERS,
        timeout=60.0,
    )
    return r.status_code in (200, 202)


def main():
    if not DATABASE_URL:
        print("[sync_suggestions] ERROR: DATABASE_URL no definida en .env")
        sys.exit(1)

    if not _meili_ok():
        print("[sync_suggestions] ERROR: Meilisearch no está disponible. Abortando.")
        sys.exit(1)

    print(f"[sync_suggestions] Conectando a MySQL...")
    engine = create_engine(DATABASE_URL)

    # UNION SQL: extrae todos los RUC+nombre únicos de 3 tablas transaccionales
    UNION_SQL = text("""
        SELECT DISTINCT entidad_ruc AS ruc, comprador AS nombre, 'Entidad' AS tipo
        FROM licitaciones_cabecera
        WHERE entidad_ruc IS NOT NULL AND entidad_ruc != '' AND comprador IS NOT NULL AND comprador != ''

        UNION

        SELECT DISTINCT ganador_ruc AS ruc, ganador_nombre AS nombre, 'Proveedor' AS tipo
        FROM licitaciones_adjudicaciones
        WHERE ganador_ruc IS NOT NULL AND ganador_ruc != '' AND ganador_nombre IS NOT NULL AND ganador_nombre != ''

        UNION

        SELECT DISTINCT ruc_miembro AS ruc, nombre_miembro AS nombre, 'Proveedor' AS tipo
        FROM detalle_consorcios
        WHERE ruc_miembro IS NOT NULL AND ruc_miembro != '' AND nombre_miembro IS NOT NULL AND nombre_miembro != ''
    """)

    print("[sync_suggestions] Ejecutando query UNION en MySQL...")
    t0 = time.time()

    with engine.connect() as conn:
        rows = conn.execute(UNION_SQL).fetchall()

    elapsed_query = time.time() - t0
    print(f"[sync_suggestions] {len(rows):,} registros únicos extraídos en {elapsed_query:.2f}s")

    if not rows:
        print("[sync_suggestions] Sin datos. Abortando.")
        return

    # Configurar el índice antes de insertar
    _configure_index()
    time.sleep(1)  # Esperar a que Meilisearch procese la configuración

    # Preparar documentos con ID estable basado en RUC
    docs = []
    seen_ids = set()
    for row in rows:
        ruc    = (row[0] or "").strip()
        nombre = (row[1] or "").strip()[:200]
        tipo   = (row[2] or "Entidad").strip()

        if not nombre:
            continue

        # ID estable: hash del RUC o del nombre si no hay RUC
        id_key = ruc if ruc else nombre
        doc_id = hashlib.md5(id_key.encode()).hexdigest()[:16]

        if doc_id in seen_ids:
            continue
        seen_ids.add(doc_id)

        docs.append({
            "id":     doc_id,
            "ruc":    ruc,
            "nombre": nombre,
            "tipo":   tipo,
        })

    print(f"[sync_suggestions] {len(docs):,} docs únicos a indexar (después de deduplicar por RUC)")

    # Enviar en batches
    total_batches = (len(docs) + BATCH_SIZE - 1) // BATCH_SIZE
    t1 = time.time()
    for i in range(0, len(docs), BATCH_SIZE):
        batch = docs[i: i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        ok = _bulk_index(batch)
        print(f"  Batch {batch_num}/{total_batches} ({len(batch)} docs) → {'OK' if ok else 'ERROR'}")

    elapsed_index = time.time() - t1
    print(f"[sync_suggestions] Indexación completada en {elapsed_index:.2f}s")
    print(f"[sync_suggestions] ✅ Índice '{INDEX_NAME}' listo con {len(docs):,} documentos")


if __name__ == "__main__":
    main()
