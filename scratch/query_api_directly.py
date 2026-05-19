import pymysql

try:
    conn = pymysql.connect(host='localhost', user='root', password='123456789', database='mcqs-jcq')
    cursor = conn.cursor()
    
    # Run the exact query without filters (year=0)
    cursor.execute("""
        SELECT 
            MONTH(fecha_publicacion) as mes,
            COUNT(*) as count,
            COALESCE(SUM(monto_estimado), 0) as amount
        FROM licitaciones_cabecera
        GROUP BY MONTH(fecha_publicacion)
        ORDER BY mes;
    """)
    results = cursor.fetchall()
    
    months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    print("Exact API Response data simulation:")
    for i in range(12):
        month_idx = i + 1
        row = next((r for r in results if r[0] == month_idx), None)
        print(f"Month: {months[i]} -> count: {row[1] if row else 0}, value: {float(row[2]) if row else 0.0}")
        
    conn.close()
except Exception as e:
    print(e)
