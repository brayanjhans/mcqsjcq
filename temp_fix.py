
import pymysql
DB_VPS = {'host': '127.0.0.1', 'user': 'mcqs-jcq', 'password': 'mcqs-jcq', 'db': 'mcqs-jcq'}
conn = pymysql.connect(**DB_VPS, autocommit=True)
with conn.cursor() as c:
    print("Checking search_text column...")
    c.execute("DESC licitaciones_cabecera")
    cols = [col[0] for col in c.fetchall()]
    if 'search_text' not in cols:
        print("Adding search_text column to licitaciones_cabecera...")
        c.execute("ALTER TABLE licitaciones_cabecera ADD COLUMN search_text LONGTEXT")
        print("Column added.")
    else:
        print("Column already exists.")
conn.close()
