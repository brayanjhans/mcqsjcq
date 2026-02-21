
import pymysql

def apply_fulltext_and_generated():
    try:
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='123456789',
            database='mcqs-jcq',
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        
        with connection.cursor() as cursor:
            print("Applying Advanced Optimizations...")
            
            # 1. Add Generated Column for Year (anio)
            try:
                print("Checking 'anio' column...")
                cursor.execute("SHOW COLUMNS FROM licitaciones_cabecera LIKE 'anio'")
                if not cursor.fetchone():
                    print("Adding 'anio' generated column...")
                    cursor.execute("ALTER TABLE licitaciones_cabecera ADD COLUMN anio INT GENERATED ALWAYS AS (YEAR(fecha_publicacion)) STORED, ADD INDEX (anio);")
                    print("Added 'anio' column and index.")
                else:
                    print("'anio' column already exists.")
            except Exception as e:
                print(f"Error adding 'anio': {e}")

            # 2. Add Generated Column for Month (mes_num)
            try:
                print("Checking 'mes_num' column...")
                cursor.execute("SHOW COLUMNS FROM licitaciones_cabecera LIKE 'mes_num'")
                if not cursor.fetchone():
                    print("Adding 'mes_num' generated column...")
                    cursor.execute("ALTER TABLE licitaciones_cabecera ADD COLUMN mes_num INT GENERATED ALWAYS AS (MONTH(fecha_publicacion)) STORED, ADD INDEX (mes_num);")
                    print("Added 'mes_num' column and index.")
                else:
                    print("'mes_num' column already exists.")
            except Exception as e:
                # Fallback if mes is string in query
                print(f"Error adding 'mes_num': {e}")

            # 3. Add FULLTEXT Index (Re-create if exists to add ubicacion)
            try:
                print("Dropping old FULLTEXT index if exists...")
                try:
                    cursor.execute("DROP INDEX idx_ft_search ON licitaciones_cabecera")
                except:
                    pass
                
                print("Adding FULLTEXT index on (nomenclatura, descripcion, comprador, id_convocatoria, ubicacion_completa)...")
                cursor.execute("CREATE FULLTEXT INDEX idx_ft_search ON licitaciones_cabecera (nomenclatura, descripcion, comprador, id_convocatoria, ubicacion_completa);")
                print("Created FULLTEXT index: idx_ft_search")
            except Exception as e:
                print(f"Error creating FULLTEXT index: {e}")

    except Exception as e:
        print(f"Connection failed: {e}")
    finally:
        if 'connection' in locals() and connection.open:
            connection.close()

if __name__ == "__main__":
    apply_fulltext_and_generated()
