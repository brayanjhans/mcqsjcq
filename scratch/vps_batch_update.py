"""
Script que corre en el VPS - actualiza ganador_ruc y cui por lotes usando tablas temporales.
Mucho mas rapido que fila por fila.
"""
import pymysql, csv

DB = {'host': '127.0.0.1', 'user': 'mcqs-jcq', 'password': 'mcqs-jcq',
      'db': 'mcqs-jcq', 'charset': 'utf8mb4', 'autocommit': False,
      'cursorclass': pymysql.cursors.DictCursor}
conn = pymysql.connect(**DB)

# ── Actualizar ganador_ruc  ──────────────────────────────────────────────────
print("Cargando sync_ruc.csv...")
with open('/tmp/sync_ruc.csv', 'r', encoding='utf-8') as f:
    rows_ruc = list(csv.DictReader(f))

print(f"  {len(rows_ruc)} filas. Insertando en tabla temporal...")

with conn.cursor() as cur:
    cur.execute("DROP TEMPORARY TABLE IF EXISTS tmp_ruc")
    cur.execute("""
        CREATE TEMPORARY TABLE tmp_ruc (
            id_contrato VARCHAR(100),
            ganador_ruc VARCHAR(50),
            PRIMARY KEY (id_contrato)
        ) ENGINE=InnoDB
    """)

    # Insertar en lotes de 5000
    batch = []
    for r in rows_ruc:
        if r['ganador_ruc']:
            batch.append((r['id_contrato'], r['ganador_ruc']))
        if len(batch) == 5000:
            cur.executemany("INSERT IGNORE INTO tmp_ruc VALUES (%s,%s)", batch)
            batch = []
    if batch:
        cur.executemany("INSERT IGNORE INTO tmp_ruc VALUES (%s,%s)", batch)
    conn.commit()

    print("  Aplicando UPDATE masivo...")
    cur.execute("""
        UPDATE licitaciones_adjudicaciones a
        INNER JOIN tmp_ruc t ON a.id_contrato = t.id_contrato
        SET a.ganador_ruc = t.ganador_ruc
    """)
    afectadas = cur.rowcount
    conn.commit()
    cur.execute("DROP TEMPORARY TABLE IF EXISTS tmp_ruc")
    conn.commit()

print(f"  ganador_ruc actualizado: {afectadas} filas afectadas.")

# ── Actualizar cui  ──────────────────────────────────────────────────────────
print("Cargando sync_cui.csv...")
with open('/tmp/sync_cui.csv', 'r', encoding='utf-8') as f:
    rows_cui = list(csv.DictReader(f))

print(f"  {len(rows_cui)} filas. Insertando en tabla temporal...")

with conn.cursor() as cur:
    cur.execute("DROP TEMPORARY TABLE IF EXISTS tmp_cui")
    cur.execute("""
        CREATE TEMPORARY TABLE tmp_cui (
            id_convocatoria VARCHAR(100),
            cui TEXT,
            PRIMARY KEY (id_convocatoria)
        ) ENGINE=MEMORY
    """)

    batch = []
    for r in rows_cui:
        if r['cui']:
            batch.append((r['id_convocatoria'], r['cui']))
        if len(batch) == 5000:
            cur.executemany("INSERT INTO tmp_cui VALUES (%s,%s)", batch)
            batch = []
    if batch:
        cur.executemany("INSERT INTO tmp_cui VALUES (%s,%s)", batch)
    conn.commit()

    print("  Aplicando UPDATE masivo...")
    cur.execute("""
        UPDATE licitaciones_cabecera c
        INNER JOIN tmp_cui t ON c.id_convocatoria = t.id_convocatoria
        SET c.cui = t.cui
    """)
    afectadas = cur.rowcount
    conn.commit()
    cur.execute("DROP TEMPORARY TABLE IF EXISTS tmp_cui")
    conn.commit()

print(f"  cui actualizado: {afectadas} filas afectadas.")

conn.close()
print("LISTO.")
