
import pymysql
DB_VPS = {'host': '127.0.0.1', 'user': 'mcqs-jcq', 'password': 'mcqs-jcq', 'db': 'mcqs-jcq'}
conn = pymysql.connect(**DB_VPS)
with conn.cursor() as c:
    c.execute("DESC licitaciones_cabecera")
    cols = [col[0] for col in c.fetchall()]
    print("Columns:", cols)
conn.close()
