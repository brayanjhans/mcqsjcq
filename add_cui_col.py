import mysql.connector

try:
    c = mysql.connector.connect(host='localhost', user='root', password='123456789', database='mcqs-jcq')
    cur = c.cursor()
    # Add cui column if it doesn't exist
    cur.execute("SHOW COLUMNS FROM licitaciones_cabecera LIKE 'cui'")
    if not cur.fetchone():
        print("Agregando columna 'cui' a licitaciones_cabecera...")
        cur.execute("ALTER TABLE licitaciones_cabecera ADD COLUMN cui VARCHAR(15) DEFAULT NULL")
        c.commit()
        print("Columna agregada exitosamente.")
    else:
        print("La columna 'cui' ya existe.")
    c.close()
except Exception as e:
    print(f"Error: {e}")
