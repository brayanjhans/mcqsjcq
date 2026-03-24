
import pymysql
DB_VPS = {'host': '127.0.0.1', 'user': 'mcqs-jcq', 'password': 'mcqs-jcq', 'db': 'mcqs-jcq'}
conn = pymysql.connect(**DB_VPS, autocommit=True)

IDS = ['637566', '756457']

with conn.cursor() as c:
    for id_conv in IDS:
        print(f"Generating search_text for ID: {id_conv}")
        
        # 1. Collect parts
        parts = [id_conv]
        
        # Corrected columns: comprador instead of nombre_entidad
        c.execute("SELECT nomenclatura, descripcion, comprador, cui FROM licitaciones_cabecera WHERE id_convocatoria = %s", (id_conv,))
        row = c.fetchone()
        if row:
            parts.extend([str(x) for x in row if x])
            
        c.execute("SELECT ganador_ruc, ganador_nombre FROM licitaciones_adjudicaciones WHERE id_convocatoria = %s", (id_conv,))
        adjs = c.fetchall()
        for a in adjs:
            parts.extend([str(x) for x in a if x])
            
        # 2. Join and Update
        s_text = " | ".join(sorted(list(set([p.strip() for p in parts if p]))))
        c.execute("UPDATE licitaciones_cabecera SET search_text = %s WHERE id_convocatoria = %s", (s_text, id_conv))
        print(f"Updated search_text for {id_conv} (len={len(s_text)})")

conn.close()
