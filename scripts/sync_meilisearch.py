"""
Sync MySQL → Meilisearch.
Run once for initial load, then run periodically (e.g. every 15 min via PM2 cron).

Usage:
  python scripts/sync_meilisearch.py           # full sync
  python scripts/sync_meilisearch.py --incremental  # only last 24h
"""
import os, sys, time, argparse
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text, create_engine
from app.services.meili_service import bulk_index, configure_index, get_stats, MEILI_URL, MEILI_KEY

import httpx

DATABASE_URL = os.getenv("DATABASE_URL")
BATCH_SIZE   = 1000

engine = create_engine(DATABASE_URL, pool_pre_ping=True)


def wait_for_task(task_uid: int, timeout: int = 60):
    """Poll Meilisearch until an async task finishes."""
    headers = {"Authorization": f"Bearer {MEILI_KEY}"}
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = httpx.get(f"{MEILI_URL}/tasks/{task_uid}", headers=headers, timeout=5)
        status = r.json().get("status")
        if status in ("succeeded", "failed"):
            return status
        time.sleep(0.5)
    return "timeout"


def create_index_if_needed():
    headers = {"Authorization": f"Bearer {MEILI_KEY}", "Content-Type": "application/json"}
    # Check if index exists
    r = httpx.get(f"{MEILI_URL}/indexes/licitaciones", headers=headers, timeout=5)
    if r.status_code == 404:
        print("Creando indice 'licitaciones'...")
        r2 = httpx.post(
            f"{MEILI_URL}/indexes",
            json={"uid": "licitaciones", "primaryKey": "id_meili"},
            headers=headers, timeout=10
        )
        time.sleep(2)
    # Apply settings
    ok = configure_index()
    print(f"  Configuracion del indice: {'OK' if ok else 'ERROR'}")


def build_document(row) -> dict:
    """Transform a MySQL result row into a Meilisearch document."""
    fecha_ts = 0
    if row.fecha_publicacion:
        try:
            fecha_ts = int(row.fecha_publicacion.timestamp())
        except Exception:
            pass

    anio = 0
    if row.fecha_publicacion:
        try:
            anio = row.fecha_publicacion.year
        except Exception:
            pass

    return {
        "id_meili": str(row.id_convocatoria).replace("/", "_").replace(" ", "_"),
        "id_convocatoria": str(row.id_convocatoria),
        "nomenclatura":    str(row.nomenclatura or ""),
        "descripcion":     str(row.descripcion or "")[:500],   # truncate large text
        "comprador":       str(row.comprador or ""),
        "categoria":       str(row.categoria or ""),
        "tipo_procedimiento": str(row.tipo_procedimiento or ""),
        "estado_proceso":  str(row.estado_proceso or ""),
        "departamento":    str(row.departamento or ""),
        "ubicacion_completa": str(row.ubicacion_completa or ""),
        "ganador_nombre":  str(row.ganador_nombre or ""),
        "ganador_ruc":     str(row.ganador_ruc or ""),
        "nombres_consorciados": str(row.nombres_consorciados or ""),
        "rucs_consorciados": str(row.rucs_consorciados or ""),
        "fecha_ts":        fecha_ts,
        "anio":            anio,
    }


def sync(incremental: bool = False):
    print(f"\n{'='*55}")
    print(f"SYNC MySQL -> Meilisearch  ({'incremental 24h' if incremental else 'COMPLETO'})")
    print(f"{'='*55}\n")

    create_index_if_needed()

    # Build query
    where = ""
    if incremental:
        where = "WHERE c.fecha_publicacion >= DATE_SUB(NOW(), INTERVAL 24 HOUR)"

    sql = text(f"""
        SELECT
            c.id_convocatoria,
            c.nomenclatura,
            c.descripcion,
            c.comprador,
            c.categoria,
            c.tipo_procedimiento,
            c.estado_proceso,
            c.departamento,
            c.ubicacion_completa,
            c.fecha_publicacion,
            GROUP_CONCAT(DISTINCT a.ganador_nombre SEPARATOR ' | ') AS ganador_nombre,
            GROUP_CONCAT(DISTINCT a.ganador_ruc SEPARATOR ' | ')    AS ganador_ruc,
            GROUP_CONCAT(DISTINCT dc.nombre_miembro SEPARATOR ' | ') AS nombres_consorciados,
            GROUP_CONCAT(DISTINCT dc.ruc_miembro SEPARATOR ' | ') AS rucs_consorciados
        FROM licitaciones_cabecera c
        LEFT JOIN licitaciones_adjudicaciones a  ON a.id_convocatoria = c.id_convocatoria
        LEFT JOIN detalle_consorcios dc           ON dc.id_contrato = a.id_contrato
        {where}
        GROUP BY c.id_convocatoria, c.nomenclatura, c.descripcion, c.comprador,
                 c.categoria, c.tipo_procedimiento, c.estado_proceso,
                 c.departamento, c.ubicacion_completa, c.fecha_publicacion
        ORDER BY c.id_convocatoria
    """)

    print("Contando registros...")
    with engine.connect() as conn:
        count_sql = text(f"""
            SELECT COUNT(DISTINCT c.id_convocatoria)
            FROM licitaciones_cabecera c
            {"LEFT JOIN licitaciones_adjudicaciones a ON a.id_convocatoria = c.id_convocatoria" if not incremental else ""}
            {where}
        """)
        total = conn.execute(count_sql).scalar() or 0
    print(f"  Total a indexar: {total:,} registros\n")

    t0 = time.time()
    indexed = 0
    batch   = []
    errors  = 0

    with engine.connect() as conn:
        result = conn.execute(sql)
        for row in result:
            batch.append(build_document(row))
            if len(batch) >= BATCH_SIZE:
                ok = bulk_index(batch)
                indexed += len(batch)
                if not ok: errors += 1
                elapsed = time.time() - t0
                rate = indexed / elapsed if elapsed > 0 else 0
                eta  = (total - indexed) / rate if rate > 0 else 0
                print(f"  [{indexed:>7,}/{total:,}]  rate={rate:.0f}/s  ETA={eta:.0f}s  errors={errors}")
                batch = []

        if batch:
            ok = bulk_index(batch)
            indexed += len(batch)
            if not ok: errors += 1

    elapsed = time.time() - t0
    print(f"\nSync completado en {elapsed:.1f}s")
    print(f"  Indexados : {indexed:,}")
    print(f"  Errores   : {errors}")

    # Final stats
    time.sleep(2)
    stats = get_stats()
    print(f"  Docs en Meilisearch: {stats.get('numberOfDocuments', '?'):,}")
    print("\nOK")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--incremental", action="store_true", help="Solo ultimas 24h")
    args = parser.parse_args()
    sync(incremental=args.incremental)
