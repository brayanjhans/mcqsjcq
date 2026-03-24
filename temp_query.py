
import pymysql
DB_VPS = {'host': '127.0.0.1', 'user': 'mcqs-jcq', 'password': 'mcqs-jcq', 'db': 'mcqs-jcq'}
conn = pymysql.connect(**DB_VPS)
with conn.cursor() as c:
    c.execute("SELECT id_convocatoria, cui, descripcion FROM licitaciones_cabecera WHERE descripcion LIKE '%LP-SM-3-2021-MPP%'")
    rows = c.fetchall()
    for r in rows:
        print(f"ID: {r[0]} | CUI: {r[1]} | DESC: {r[2][:100]}")
conn.close()
