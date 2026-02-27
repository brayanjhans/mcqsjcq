import pymysql

conn = pymysql.connect(host='localhost', user='root', password='123456789', db='mcqs-jcq')
cur = conn.cursor()

# Verificar si existen las columnas url_pdf_contrato y url_pdf_cartafianza
cur.execute("SHOW COLUMNS FROM licitaciones_adjudicaciones LIKE 'url_pdf_contrato'")
if not cur.fetchone():
    print("Agregando columna url_pdf_contrato...")
    cur.execute("ALTER TABLE licitaciones_adjudicaciones ADD COLUMN url_pdf_contrato VARCHAR(500) DEFAULT NULL")
else:
    print("url_pdf_contrato ya existe")

cur.execute("SHOW COLUMNS FROM licitaciones_adjudicaciones LIKE 'url_pdf_cartafianza'")
if not cur.fetchone():
    print("Agregando columna url_pdf_cartafianza...")
    cur.execute("ALTER TABLE licitaciones_adjudicaciones ADD COLUMN url_pdf_cartafianza VARCHAR(500) DEFAULT NULL")
else:
    print("url_pdf_cartafianza ya existe")

conn.commit()
conn.close()
print("Done!")
