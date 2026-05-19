import pymysql

try:
    conn = pymysql.connect(host='localhost', user='root', password='123456789', database='mcqs-jcq')
    cursor = conn.cursor()
    
    # Check each year
    print("Checking years:")
    for year in [2020, 2021, 2022, 2023, 2024, 2025, 2026]:
        cursor.execute(f"""
            SELECT MONTH(fecha_publicacion) as mes, COUNT(*) 
            FROM licitaciones_cabecera 
            WHERE YEAR(fecha_publicacion) = {year} 
            GROUP BY MONTH(fecha_publicacion) 
            ORDER BY mes;
        """)
        results = cursor.fetchall()
        counts = [r[1] for r in results]
        if counts:
            print(f"Year {year} -> Max: {max(counts)}, Min: {min(counts)}, Months: {len(counts)}, Counts: {counts}")
            
    # Check each procedure
    print("\nChecking procedures (across all years):")
    cursor.execute("SELECT DISTINCT tipo_procedimiento FROM licitaciones_cabecera;")
    procedures = [r[0] for r in cursor.fetchall() if r[0]]
    for proc in procedures:
        cursor.execute("""
            SELECT MONTH(fecha_publicacion) as mes, COUNT(*) 
            FROM licitaciones_cabecera 
            WHERE tipo_procedimiento = %s 
            GROUP BY MONTH(fecha_publicacion) 
            ORDER BY mes;
        """, (proc,))
        results = cursor.fetchall()
        counts = [r[1] for r in results]
        if counts:
            print(f"Proc: {proc} -> Max: {max(counts)}, Min: {min(counts)}, Counts: {counts}")
            
    conn.close()
except Exception as e:
    print(e)
