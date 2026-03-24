import pymysql

def main():
    try:
        conn = pymysql.connect(host='localhost', user='root', password='123456789', db='mcqs-jcq')
        with conn.cursor() as cursor:
            cursor.execute("SELECT id_convocatoria, cui, descripcion FROM licitaciones_cabecera WHERE descripcion LIKE '%LP-SM-3-2021-MPP%'")
            rows = cursor.fetchall()
            for r in rows:
                print(f"ID: {r[0]} | CUI: {r[1]} | DESC: {r[2][:100]}")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
