import pymysql

try:
    conn = pymysql.connect(host='localhost', user='root', password='123456789', database='mcqs-jcq')
    cursor = conn.cursor()
    
    # Check total adjudicaciones
    cursor.execute("SELECT COUNT(*) FROM licitaciones_adjudicaciones;")
    total = cursor.fetchone()[0]
    
    # Check adjudicaciones with entity
    cursor.execute("""
        SELECT COUNT(*), SUM(monto_adjudicado) 
        FROM licitaciones_adjudicaciones 
        WHERE entidad_financiera IS NOT NULL 
          AND entidad_financiera != '' 
          AND entidad_financiera != 'SIN_GARANTIA' 
          AND entidad_financiera != 'ERROR_API_500';
    """)
    with_gar, sum_gar = cursor.fetchone()
    
    print(f"Total Adjudicaciones: {total}")
    print(f"With Garantia: {with_gar} -> Sum: {sum_gar}")
    
    conn.close()
except Exception as e:
    print(e)
