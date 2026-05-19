import pymysql

try:
    conn = pymysql.connect(host='localhost', user='root', password='123456789', database='mcqs-jcq')
    cursor = conn.cursor()
    
    print("Monthly distribution of Adjudicaciones WITH VALID WARRANTIES:")
    cursor.execute("""
        SELECT MONTH(fecha_adjudicacion) as mes, COUNT(*), SUM(monto_adjudicado)
        FROM licitaciones_adjudicaciones 
        WHERE entidad_financiera IS NOT NULL 
          AND entidad_financiera != '' 
          AND entidad_financiera != 'SIN_GARANTIA' 
          AND entidad_financiera != 'ERROR_API_500'
        GROUP BY MONTH(fecha_adjudicacion) 
        ORDER BY mes;
    """)
    results = cursor.fetchall()
    for row in results:
        print(f"Month: {row[0]} -> Count = {row[1]}, Sum = {row[2]}")
        
    conn.close()
except Exception as e:
    print(e)
