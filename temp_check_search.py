
import pymysql
DB_VPS = {'host': '127.0.0.1', 'user': 'mcqs-jcq', 'password': 'mcqs-jcq', 'db': 'mcqs-jcq'}
conn = pymysql.connect(**DB_VPS)
with conn.cursor() as c:
    c.execute("SELECT id_convocatoria, cui, search_text FROM licitaciones_cabecera WHERE cui = '2047334'")
    rows = c.fetchall()
    for r in rows:
        print(f"ID: {r[0]} | CUI: {r[1]} | SEARCH_TEXT LENGHT: {len(r[2]) if r[2] else 0}")
        if r[2]:
            print(f"PREVIEW: {r[2][:200]}")
conn.close()
