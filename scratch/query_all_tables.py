import pymysql

try:
    conn = pymysql.connect(host='localhost', user='root', password='123456789', database='mcqs-jcq')
    cursor = conn.cursor()
    
    cursor.execute("SHOW TABLES;")
    tables = [r[0] for r in cursor.fetchall()]
    
    print("Database tables and row counts:")
    for t in tables:
        cursor.execute(f"SELECT COUNT(*) FROM `{t}`")
        count = cursor.fetchone()[0]
        print(f"  Table: {t} -> {count} rows")
        
    conn.close()
except Exception as e:
    print(e)
