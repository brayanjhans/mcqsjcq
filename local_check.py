import pymysql

conn = pymysql.connect(host='localhost', user='root', password='123456789', db='mcqs-jcq')
with conn.cursor() as cur:
    try:
        cur.execute("SELECT substring(fecha_publicacion,1,7), COUNT(*) FROM licitaciones_cabecera WHERE fecha_publicacion LIKE '2026-%' GROUP BY 1 ORDER BY 1")
        print('CABECERA:', cur.fetchall())
    except Exception as e:
        print('CAB ERR:', e)
        
    try:
        cur.execute("SELECT substring(fecha_contrato,1,7), COUNT(*) FROM seace_adjudicados WHERE substring(fecha_contrato,1,4)='2026' GROUP BY 1 ORDER BY 1")
        print('ADJUDICADOS:', cur.fetchall())
    except Exception as e:
        print('ADJ ERR:', e)
conn.close()
