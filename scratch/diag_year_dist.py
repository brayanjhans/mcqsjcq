import pymysql
conn = pymysql.connect(host='localhost', user='root', password='123456789', db='mcqs-jcq', charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor)
with conn.cursor() as cur:
    cur.execute("""
        SELECT YEAR(lc.fecha_publicacion) as anio, COUNT(*) as total
        FROM licitaciones_adjudicaciones la
        JOIN licitaciones_cabecera lc ON la.id_convocatoria = lc.id_convocatoria
        WHERE (la.ganador_nombre IS NULL OR la.ganador_nombre = '')
          AND lc.estado_proceso IN ('ADJUDICADO','CONTRATADO','CONSENTIDO','APELADO')
        GROUP BY YEAR(lc.fecha_publicacion) ORDER BY anio DESC
    """)
    print("=== Missing ganador by year ===")
    for r in cur.fetchall():
        print(r)

    # Also check total missing (all states) per year for 2026
    cur.execute("""
        SELECT YEAR(lc.fecha_publicacion) as anio,
               lc.estado_proceso,
               COUNT(*) as sin_ganador
        FROM licitaciones_adjudicaciones la
        JOIN licitaciones_cabecera lc ON la.id_convocatoria = lc.id_convocatoria
        WHERE (la.ganador_nombre IS NULL OR la.ganador_nombre = '')
          AND YEAR(lc.fecha_publicacion) = 2026
        GROUP BY anio, lc.estado_proceso ORDER BY sin_ganador DESC
    """)
    print("\n=== 2026 missing ganador by estado ===")
    for r in cur.fetchall():
        print(r)
conn.close()
