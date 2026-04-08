import pymysql
conn = pymysql.connect(host='localhost', user='root', password='123456789', db='mcqs-jcq')
cur = conn.cursor(pymysql.cursors.DictCursor)

# Fixed query for ONLY_FULL_GROUP_BY
sql_stuck = """
    SELECT l.id_convocatoria, l.nomenclatura, YEAR(l.fecha_publicacion) as anio, l.estado_proceso
    FROM licitaciones_cabecera l
    WHERE l.estado_proceso IN ('CONVOCADO', 'PENDIENTE', 'None', '')
    AND EXISTS (SELECT 1 FROM licitaciones_adjudicaciones a WHERE a.id_convocatoria = l.id_convocatoria)
    LIMIT 20
"""
cur.execute(sql_stuck)
stuck = cur.fetchall()
print('--- AUDIT: STUCK RECORDS (SHOULD BE ADJUDICADO) ---')
for row in stuck:
    print(f"Year {row['anio']} | {row['id_convocatoria']} | {row['nomenclatura']} | State: {row['estado_proceso']}")

# Query 2: Search for records with id_contrato but not 'CONTRATADO' state
sql_not_contratado = """
    SELECT l.id_convocatoria, l.estado_proceso, a.id_contrato
    FROM licitaciones_cabecera l
    JOIN licitaciones_adjudicaciones a ON l.id_convocatoria = a.id_convocatoria
    WHERE l.estado_proceso != 'CONTRATADO' AND a.id_contrato IS NOT NULL AND a.id_contrato != ''
    LIMIT 10
"""
cur.execute(sql_not_contratado)
print('\n--- AUDIT: SHOULD BE CONTRATADO ---')
for row in cur.fetchall():
    print(f"ID: {row['id_convocatoria']} | Current: {row['estado_proceso']} | Contract: {row['id_contrato']}")

# Query 3: Count total records per year to see the scale
sql_years = "SELECT YEAR(fecha_publicacion) as yr, COUNT(*) as count FROM licitaciones_cabecera GROUP BY yr ORDER BY yr DESC"
cur.execute(sql_years)
print('\n--- YEAR DISTRIBUTION ---')
for row in cur.fetchall():
    print(f"Year {row['yr']}: {row['count']} records")

conn.close()
