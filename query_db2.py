import pymysql
conn = pymysql.connect(host='localhost', user='root', password='123456789', db='mcqs-jcq')
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM licitaciones_cabecera WHERE fecha_publicacion BETWEEN '2026-01-01' AND '2026-12-31'")
print("Cabeceras 2026:", cur.fetchone()[0])
cur.execute("SELECT COUNT(*) FROM licitaciones_cabecera")
print("Cabeceras TOTAL:", cur.fetchone()[0])
cur.execute("SELECT estado_proceso, COUNT(*) FROM licitaciones_cabecera WHERE fecha_publicacion BETWEEN '2026-01-01' AND '2026-12-31' GROUP BY estado_proceso")
print("Estados 2026:")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")
conn.close()
