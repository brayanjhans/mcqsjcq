import pymysql

try:
    conn = pymysql.connect(host='localhost', user='root', password='123456789', database='mcqs-jcq')
    cursor = conn.cursor()
    
    # Let's count adjudicaciones and the sum of monto_adjudicado
    cursor.execute("""
        SELECT 
            COUNT(*) as total_adjudicaciones,
            COALESCE(SUM(monto_adjudicado), 0) as monto_total
        FROM licitaciones_adjudicaciones;
    """)
    result = cursor.fetchone()
    print("KPIs using licitaciones_adjudicaciones:")
    print(f"Total Adjudicaciones: {result[0]}")
    print(f"Total Monto Adjudicado: {result[1]}")
    
    conn.close()
except Exception as e:
    print(e)
