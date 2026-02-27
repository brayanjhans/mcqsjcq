import pymysql

conn = pymysql.connect(host='localhost', user='root', password='123456789', db='mcqs-jcq')
cur = conn.cursor(pymysql.cursors.DictCursor)

# 1. Cabeceras 2026
cur.execute("SELECT id_convocatoria, nomenclatura, fecha_publicacion, estado_proceso FROM licitaciones_cabecera WHERE id_convocatoria = '1184920'")
res = cur.fetchall()
print("=== Convocatoria 1184920 (Cabecera) ===")
for r in res:
    print(f"  ID: {r['id_convocatoria']} | FechaPub: {r['fecha_publicacion']} | Estado: {r['estado_proceso']}")
print(f"  Total copias: {len(res)}")

# 2. Adjudicaciones 1184920
cur.execute("SELECT id_adjudicacion, monto_adjudicado, url_pdf_contrato, url_pdf_cartafianza, url_pdf_consorcio, entidad_financiera FROM licitaciones_adjudicaciones WHERE id_convocatoria = '1184920'")
res_adj = cur.fetchall()
print("\n=== Convocatoria 1184920 (Adjudicaciones) ===")
for r in res_adj:
    print(f"  AdjID: {r['id_adjudicacion']} | Monto: {r['monto_adjudicado']}")
    print(f"    URL Contrato: {r['url_pdf_contrato']}")
    print(f"    URL Fianza: {r['url_pdf_cartafianza']}")
    print(f"    URL Consorcio: {r['url_pdf_consorcio']}")
    print(f"    Entidad Fin: {r['entidad_financiera']}")
print(f"  Total adjudicaciones: {len(res_adj)}")

# 3. Conteos generales de URLs y Fechas
cur.execute("SELECT COUNT(*) as total FROM licitaciones_cabecera WHERE fecha_publicacion IS NOT NULL AND YEAR(fecha_publicacion) = 2026")
print(f"\nCabeceras 2026 con fecha: {cur.fetchone()['total']}")

cur.execute("SELECT COUNT(*) as total FROM licitaciones_adjudicaciones WHERE url_pdf_contrato IS NOT NULL")
print(f"Adjudicaciones con URL Contrato: {cur.fetchone()['total']}")

cur.execute("SELECT COUNT(*) as total FROM licitaciones_adjudicaciones WHERE url_pdf_consorcio IS NOT NULL")
print(f"Adjudicaciones con URL Consorcio: {cur.fetchone()['total']}")

cur.execute("SELECT COUNT(*) as total FROM licitaciones_adjudicaciones WHERE entidad_financiera IS NOT NULL")
print(f"Adjudicaciones con Entidad Financiera: {cur.fetchone()['total']}")

conn.close()
