import pymysql

conn = pymysql.connect(
    host='localhost', user='root', password='123456789',
    db='mcqs-jcq', charset='utf8mb4',
    cursorclass=pymysql.cursors.DictCursor
)

with conn.cursor() as cur:
    # 1. Estados 2026
    cur.execute("""
        SELECT estado_proceso, COUNT(*) as total
        FROM licitaciones_cabecera
        WHERE YEAR(fecha_publicacion) = 2026
        GROUP BY estado_proceso ORDER BY total DESC
    """)
    print('=== Estados 2026 ===')
    for r in cur.fetchall():
        print(r)

    # 2. Con/Sin adjudicacion registrada
    cur.execute("""
        SELECT lc.estado_proceso,
               COUNT(DISTINCT lc.id_convocatoria) as total_proc,
               COUNT(DISTINCT la.id_convocatoria) as con_adj
        FROM licitaciones_cabecera lc
        LEFT JOIN licitaciones_adjudicaciones la ON lc.id_convocatoria = la.id_convocatoria
        WHERE lc.estado_proceso IN ('ADJUDICADO','CONTRATADO','CONSENTIDO','APELADO')
          AND YEAR(lc.fecha_publicacion) = 2026
        GROUP BY lc.estado_proceso
    """)
    print('\n=== Con/Sin adjudicacion registrada (2026) ===')
    for r in cur.fetchall():
        print(r)

    # 3. Ejemplos sin ganador - sin fila en adjudicaciones
    cur.execute("""
        SELECT lc.id_convocatoria, lc.nomenclatura, lc.estado_proceso,
               la.ganador_nombre, la.ganador_ruc
        FROM licitaciones_cabecera lc
        LEFT JOIN licitaciones_adjudicaciones la ON lc.id_convocatoria = la.id_convocatoria
        WHERE lc.estado_proceso IN ('ADJUDICADO','CONTRATADO','CONSENTIDO')
          AND YEAR(lc.fecha_publicacion) = 2026
          AND (la.ganador_nombre IS NULL OR la.ganador_nombre = '')
        LIMIT 10
    """)
    print('\n=== 10 ejemplos sin ganador (adj vacia o null) ===')
    for r in cur.fetchall():
        print(r)

    # 4. Tomar un ocid de ejemplo y ver el JSON fuente en la BD
    cur.execute("""
        SELECT lc.id_convocatoria, lc.ocid, lc.nomenclatura, lc.estado_proceso
        FROM licitaciones_cabecera lc
        LEFT JOIN licitaciones_adjudicaciones la ON lc.id_convocatoria = la.id_convocatoria
        WHERE lc.estado_proceso IN ('ADJUDICADO','CONTRATADO','CONSENTIDO')
          AND YEAR(lc.fecha_publicacion) = 2026
          AND la.ganador_nombre IS NULL
        LIMIT 3
    """)
    ejemplos = cur.fetchall()
    print('\n=== OCIDs de ejemplo sin ganador ===')
    for r in ejemplos:
        print(r)

conn.close()
