
import pymysql
DB_VPS = {'host': '127.0.0.1', 'user': 'mcqs-jcq', 'password': 'mcqs-jcq', 'db': 'mcqs-jcq'}
conn = pymysql.connect(**DB_VPS)
with conn.cursor() as c:
    c.execute("SHOW TABLES LIKE 'infobras%'")
    print("Tables:", c.fetchall())
    c.execute("SELECT COUNT(*) FROM infobras_obras WHERE cui = '2047334'")
    print("Obras for 2047334:", c.fetchone()[0])
    c.execute("SELECT COUNT(*) FROM infobras_valorizaciones WHERE cui = '2047334'")
    print("Vals for 2047334:", c.fetchone()[0])
conn.close()
