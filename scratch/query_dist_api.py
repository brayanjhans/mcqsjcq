import pymysql

try:
    conn = pymysql.connect(host='localhost', user='root', password='123456789', database='mcqs-jcq')
    cursor = conn.cursor()
    
    # Run the exact query for distribution-by-type without filters
    cursor.execute("""
        SELECT 
            categoria as name,
            COUNT(*) as value,
            COALESCE(SUM(monto_estimado), 0) as amount
        FROM licitaciones_cabecera
        WHERE categoria IS NOT NULL AND categoria != ''
        GROUP BY categoria
        ORDER BY value DESC;
    """)
    result = cursor.fetchall()
    
    normalization_map = {
        'GOODS': 'BIENES',
        'BIENES': 'BIENES',
        'SERVICES': 'SERVICIOS',
        'SERVICIOS': 'SERVICIOS',
        'WORKS': 'OBRAS',
        'OBRAS': 'OBRAS',
        'CONSULTING SERVICES': 'CONSULTORIA DE OBRAS',
        'CONSULTORIA DE OBRAS': 'CONSULTORIA DE OBRAS'
    }
    
    aggregated = {}
    for row in result:
        raw_name = row[0]
        if not raw_name: continue
        
        clean_name = raw_name.upper().strip()
        final_name = normalization_map.get(clean_name, clean_name)
        
        if final_name not in aggregated:
            aggregated[final_name] = {"value": 0, "amount": 0.0}
        
        aggregated[final_name]["value"] += int(row[1])
        aggregated[final_name]["amount"] += float(row[2])
        
    data = [
        {"name": k, "value": v["value"], "amount": v["amount"]} 
        for k, v in aggregated.items()
    ]
    data.sort(key=lambda x: x["value"], reverse=True)
    
    print("Exact Distribution API Response Simulation:")
    print(data)
    conn.close()
except Exception as e:
    print(e)
