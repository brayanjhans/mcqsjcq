import pymysql

conn = pymysql.connect(host='localhost', user='root', password='123456789', db='mcqs-jcq')
cur = conn.cursor()

# LP-ABR-65-2025-GRH/C-3
cur.execute("SELECT count(*) FROM licitaciones_cabecera WHERE nomenclatura LIKE '%LP-ABR-65-2025%'")
print("Record count for LP-ABR-65-2025:", cur.fetchone()[0])

cur.execute("SELECT count(*) FROM licitaciones_cabecera WHERE YEAR(fecha_publicacion) = 2025")
print("Total 2025 records:", cur.fetchone()[0])

cur.execute("SELECT count(*) FROM licitaciones_cabecera WHERE YEAR(fecha_publicacion) = 2026")
print("Total 2026 records:", cur.fetchone()[0])

conn.close()
