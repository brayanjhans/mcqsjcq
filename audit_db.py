import pymysql
conn = pymysql.connect(host='localhost', user='root', password='123456789', db='mcqs-jcq')
cur = conn.cursor(pymysql.cursors.DictCursor)

# Query 1: Find records stuck in 'CONVOCADO' that have adjudications
sql_stuck = """
    SELECT l.id_convocatoria, l.nomenclatura, COUNT(a.id_adjudicacion) as qty_adj, YEAR(l.fecha_publicacion) as anio
    FROM licitaciones_cabecera l
    LEFT JOIN licitaciones_adjudicaciones a ON l.id_convocatoria = a.id_convocatoria
    WHERE l.estado_proceso IN ('CONVOCADO', 'PENDIENTE', 'None')
    GROUP BY l.id_convocatoria
    HAVING qty_adj > 0
    LIMIT 20
"""
cur.execute(sql_stuck)
stuck = cur.fetchall()
print('--- AUDIT: STUCK RECORDS (SHOULD BE ADJUDICADO) ---')
for row in stuck:
    print(f"Year {row['anio']} | {row['id_convocatoria']} | {row['nomenclatura']} | Adj: {row['qty_adj']}")

# Query 2: Check for records with missing descriptions or entities
sql_empty = "SELECT COUNT(*) as count FROM licitaciones_cabecera WHERE descripcion IS NULL OR descripcion = ''"
cur.execute(sql_empty)
print(f"Empty Descriptions: {cur.fetchone()['count']}")

# Query 3: Check for year distribution
sql_years = "SELECT YEAR(fecha_publicacion) as yr, COUNT(*) as count FROM licitaciones_cabecera GROUP BY yr ORDER BY yr DESC"
cur.execute(sql_years)
print('--- YEAR DISTRIBUTION ---')
for row in cur.fetchall():
    print(f"Year {row['yr']}: {row['count']} records")

conn.close()
