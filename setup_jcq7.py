import pymysql

# Configuración de la conexión a MySQL
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456789'
}

def setup_new_database():
    print("Conectando al servidor MySQL...")
    try:
        connection = pymysql.connect(**db_config)
        
        with connection.cursor() as cursor:
            # 1. Crear nueva base de datos
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter('ignore')
                print("Creando base de datos `mcqs-jcq7`...")
                cursor.execute("CREATE DATABASE IF NOT EXISTS `mcqs-jcq7` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            
            # 2. Clonar tablas desde mcqs-jcq
            tables_to_clone = [
                "licitaciones_cabecera",
                "licitaciones_adjudicaciones",
                "detalle_consorcios"
            ]
            
            for table in tables_to_clone:
                print(f"Clonando estructura de la tabla `{table}`...")
                cursor.execute(f"DROP TABLE IF EXISTS `mcqs-jcq7`.`{table}`")
                cursor.execute(f"CREATE TABLE `mcqs-jcq7`.`{table}` LIKE `mcqs-jcq`.`{table}`")
            
            connection.commit()
            print("¡Configuración de BD mcqs-jcq7 completada exitosamente!")
    except Exception as e:
        print(f"Ocurrió un error: {e}")
    finally:
        if 'connection' in locals() and connection.open:
            connection.close()

if __name__ == "__main__":
    setup_new_database()
