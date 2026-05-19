import pymysql

try:
    conn = pymysql.connect(host='localhost', user='root', password='123456789', database='mcqs-jcq')
    cursor = conn.cursor()
    
    for year in [2020, 2021, 2022, 2023, 2024, 2025, 2026]:
        cursor.execute("""
            SELECT MONTH(fecha_adjudicacion) as mes, COUNT(*)
            FROM licitaciones_adjudicaciones 
            WHERE YEAR(fecha_adjudicacion) = %s
              AND entidad_financiera IS NOT NULL 
              AND entidad_financiera != '' 
              AND entidad_financiera != 'SIN_GARANTIA' 
              AND entidad_financiera != 'ERROR_API_500'
            GROUP BY MONTH(fecha_adjudicacion) 
            ORDER BY mes;
        """, (year,))
        results = cursor.fetchall()
        counts = [r[1] for r in results]
        if counts:
            print(f"Year {year} -> Max: {max(counts)}, Min: {min(counts)}, Months: {len(counts)}, Counts: {counts}")
        
    conn.close()
except Exception as e:
    print(e)
