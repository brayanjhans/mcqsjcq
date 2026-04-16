import pymysql

conn = pymysql.connect(host='localhost', user='root', password='123456789', db='mcqs-jcq', charset='utf8mb4')

nuevas_columnas = [
    ("telefono_miembro",        "VARCHAR(200) NULL",   "porcentaje_participacion"),
    ("email_miembro",           "VARCHAR(500) NULL",   "telefono_miembro"),
    ("domicilio_miembro",       "VARCHAR(500) NULL",   "email_miembro"),
    ("cmc_miembro",             "VARCHAR(100) NULL",   "domicilio_miembro"),
    ("tipo_contribuyente",      "VARCHAR(100) NULL",   "cmc_miembro"),
    ("es_apto_contratar",       "TINYINT(1) NULL",     "tipo_contribuyente"),
    ("especialidades_miembro",  "TEXT NULL",           "es_apto_contratar"),
]

with conn.cursor() as cur:
    cur.execute("SHOW COLUMNS FROM detalle_consorcios")
    existentes = {row[0] for row in cur.fetchall()}

    for col_name, col_def, after in nuevas_columnas:
        if col_name in existentes:
            print(f"  SKIP (ya existe): {col_name}")
            continue
        sql = f"ALTER TABLE detalle_consorcios ADD COLUMN {col_name} {col_def} AFTER {after}"
        try:
            cur.execute(sql)
            print(f"  OK: {col_name}")
        except Exception as e:
            print(f"  ERROR {col_name}: {e}")
    conn.commit()

conn.close()
print("Proceso completado.")
