import pymysql

def main():
    try:
        conn = pymysql.connect(host='localhost', user='root', password='123456789', db='mcqs-jcq')
        with conn.cursor() as cursor:
            # Search by nomenclature
            cursor.execute("SELECT id_convocatoria, nomenclatura, descripcion FROM licitaciones_cabecera WHERE nomenclatura LIKE '%LP-ABR-5-2025%'")
            rows = cursor.fetchall()
            for r in rows:
                print(f"ID: {r[0]}")
                print(f"NOM: {r[1]}")
                print(f"DESC: {r[2]}")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
