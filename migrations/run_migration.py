import pymysql
import sys

# Conexión a MySQL
try:
    connection = pymysql.connect(
        host='localhost',
        user='root',
        password='123456789',
        database='mcqs-jcq',
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )
    
    print("✅ Conectado a la base de datos mcqs-jcq")
    
    with connection.cursor() as cursor:
        # Lista de comandos SQL a ejecutar
        sql_commands = [
            # Agregar campos a licitaciones_cabecera
            "ALTER TABLE licitaciones_cabecera ADD COLUMN IF NOT EXISTS entidad_ruc VARCHAR(11) AFTER comprador",
            "ALTER TABLE licitaciones_cabecera ADD COLUMN IF NOT EXISTS fecha_adjudicacion DATE AFTER fecha_publicacion",
            
            # Agregar índice
            "CREATE INDEX IF NOT EXISTS idx_entidad_ruc ON licitaciones_cabecera(entidad_ruc)",
            
            # Agregar campos a licitaciones_adjudicaciones
            "ALTER TABLE licitaciones_adjudicaciones ADD COLUMN IF NOT EXISTS url_documento_contrato VARCHAR(500) AFTER tipo_garantia",
            "ALTER TABLE licitaciones_adjudicaciones ADD COLUMN IF NOT EXISTS url_documento_consorcio VARCHAR(500) AFTER url_documento_contrato",
            "ALTER TABLE licitaciones_adjudicaciones ADD COLUMN IF NOT EXISTS ubicacion_completa VARCHAR(500) AFTER url_documento_consorcio",
            "ALTER TABLE licitaciones_adjudicaciones ADD COLUMN IF NOT EXISTS departamento VARCHAR(100) AFTER ubicacion_completa",
            "ALTER TABLE licitaciones_adjudicaciones ADD COLUMN IF NOT EXISTS provincia VARCHAR(100) AFTER departamento",
            "ALTER TABLE licitaciones_adjudicaciones ADD COLUMN IF NOT EXISTS distrito VARCHAR(100) AFTER provincia",
        ]
        
        # Ejecutar cada comando
        for i, sql in enumerate(sql_commands, 1):
            try:
                cursor.execute(sql)
                print(f"✅ Comando {i}/{len(sql_commands)} ejecutado exitosamente")
            except Exception as e:
                print(f"⚠️ Comando {i}: {str(e)}")
        
        # Commit cambios
        connection.commit()
        print("\n✅ Migración completada exitosamente")
        
        # Verificar cambios en licitaciones_cabecera
        print("\n📋 Estructura de licitaciones_cabecera:")
        cursor.execute("DESCRIBE licitaciones_cabecera")
        for row in cursor.fetchall():
            print(f"  - {row['Field']}: {row['Type']}")
        
        # Verificar cambios en licitaciones_adjudicaciones
        print("\n📋 Estructura de licitaciones_adjudicaciones:")
        cursor.execute("DESCRIBE licitaciones_adjudicaciones")
        for row in cursor.fetchall():
            print(f"  - {row['Field']}: {row['Type']}")
            
except Exception as e:
    print(f"❌ Error: {str(e)}")
    sys.exit(1)
finally:
    if 'connection' in locals():
        connection.close()
        print("\n✅ Conexión cerrada")
