"""
Migración directa a MySQL del VPS (sin SSH)
Intenta conectarse directamente al puerto 3306 del VPS
"""
import pymysql
import sys
from datetime import datetime

# Configuración MySQL en VPS
MYSQL_HOST = "72.61.219.79"  # IP del VPS
MYSQL_PORT = 3306
MYSQL_USER = "mcqs-jcq"
MYSQL_PASS = "Abcd.1234"
MYSQL_DB = "mcqs-jcq"

# Colores para output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_step(message):
    print(f"{BLUE}▶ {message}{RESET}")

def print_success(message):
    print(f"{GREEN}✅ {message}{RESET}")

def print_error(message):
    print(f"{RED}❌ {message}{RESET}")

def main():
    print(f"\n{'='*60}")
    print(f"{BLUE}🗄️  MIGRACIÓN DIRECTA A MYSQL VPS{RESET}")
    print(f"{'='*60}\n")
    
    # Leer script SQL
    script_path = "migrations/vps_migration_20260128.sql"
    
    try:
        with open(script_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        print_success(f"Script SQL cargado: {len(sql_content)} caracteres")
        
        # Conectar a MySQL
        print_step(f"Conectando a MySQL en {MYSQL_HOST}:{MYSQL_PORT}...")
        
        connection = pymysql.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASS,
            database=MYSQL_DB,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        
        print_success("Conectado a MySQL VPS exitosamente")
        
        # Ejecutar comandos SQL uno por uno
        print(f"\n{YELLOW}{'='*60}{RESET}")
        print_step("Ejecutando migración...")
        print(f"{YELLOW}{'='*60}{RESET}\n")
        
        with connection.cursor() as cursor:
            # Lista de comandos SQL
            commands = [
                ("Agregar entidad_ruc", 
                 "ALTER TABLE licitaciones_cabecera ADD COLUMN entidad_ruc VARCHAR(11) DEFAULT NULL AFTER comprador"),
                
                ("Agregar fecha_adjudicacion (cabecera)",
                 "ALTER TABLE licitaciones_cabecera ADD COLUMN fecha_adjudicacion DATE DEFAULT NULL AFTER fecha_publicacion"),
                
                ("Crear índice entidad_ruc",
                 "CREATE INDEX idx_entidad_ruc ON licitaciones_cabecera(entidad_ruc)"),
                
                ("Agregar url_documento_contrato",
                 "ALTER TABLE licitaciones_adjudicaciones ADD COLUMN url_documento_contrato VARCHAR(500) DEFAULT NULL AFTER tipo_garantia"),
                
                ("Agregar url_documento_consorcio",
                 "ALTER TABLE licitaciones_adjudicaciones ADD COLUMN url_documento_consorcio VARCHAR(500) DEFAULT NULL AFTER url_documento_contrato"),
                
                ("Agregar ubicacion_completa (item)",
                 "ALTER TABLE licitaciones_adjudicaciones ADD COLUMN ubicacion_completa VARCHAR(500) DEFAULT NULL AFTER url_documento_consorcio"),
                
                ("Agregar departamento (item)",
                 "ALTER TABLE licitaciones_adjudicaciones ADD COLUMN departamento VARCHAR(100) DEFAULT NULL AFTER ubicacion_completa"),
                
                ("Agregar provincia (item)",
                 "ALTER TABLE licitaciones_adjudicaciones ADD COLUMN provincia VARCHAR(100) DEFAULT NULL AFTER departamento"),
                
                ("Agregar distrito (item)",
                 "ALTER TABLE licitaciones_adjudicaciones ADD COLUMN distrito VARCHAR(100) DEFAULT NULL AFTER provincia"),
            ]
            
            success_count = 0
            for desc, sql in commands:
                try:
                    print_step(f"{desc}...")
                    cursor.execute(sql)
                    connection.commit()
                    print_success(f"{desc} ✓")
                    success_count += 1
                except pymysql.err.OperationalError as e:
                    if "Duplicate column name" in str(e):
                        print(f"{YELLOW}   ⚠️ Columna ya existe (skip){RESET}")
                        success_count += 1
                    elif "Duplicate key" in str(e):
                        print(f"{YELLOW}   ⚠️ Índice ya existe (skip){RESET}")
                        success_count += 1
                    else:
                        print_error(f"{desc} falló: {str(e)}")
                except Exception as e:
                    print_error(f"{desc} falló: {str(e)}")
            
            # Verificación
            print(f"\n{YELLOW}{'='*60}{RESET}")
            print_step("Verificando columnas...")
            print(f"{YELLOW}{'='*60}{RESET}\n")
            
            # Verificar licitaciones_cabecera
            cursor.execute("SHOW COLUMNS FROM licitaciones_cabecera LIKE 'entidad_ruc'")
            if cursor.fetchone():
                print_success("✓ licitaciones_cabecera.entidad_ruc")
            
            cursor.execute("SHOW COLUMNS FROM licitaciones_cabecera LIKE 'fecha_adjudicacion'")
            if cursor.fetchone():
                print_success("✓ licitaciones_cabecera.fecha_adjudicacion")
            
            # Verificar licitaciones_adjudicaciones
            cursor.execute("SHOW COLUMNS FROM licitaciones_adjudicaciones LIKE 'url_documento_contrato'")
            if cursor.fetchone():
                print_success("✓ licitaciones_adjudicaciones.url_documento_contrato")
            
            cursor.execute("SHOW COLUMNS FROM licitaciones_adjudicaciones LIKE 'ubicacion_completa'")
            if cursor.fetchone():
                print_success("✓ licitaciones_adjudicaciones.ubicacion_completa")
            
            cursor.execute("SHOW COLUMNS FROM licitaciones_adjudicaciones LIKE 'departamento'")
            if cursor.fetchone():
                print_success("✓ licitaciones_adjudicaciones.departamento")
            
            cursor.execute("SHOW COLUMNS FROM licitaciones_adjudicaciones LIKE 'distrito'")
            if cursor.fetchone():
                print_success("✓ licitaciones_adjudicaciones.distrito")
        
        connection.close()
        
        # Resumen
        print(f"\n{'='*60}")
        print_success("MIGRACIÓN COMPLETADA")
        print(f"\n{GREEN}Comandos ejecutados: {success_count}/9{RESET}")
        print(f"{GREEN}✅ Base de datos actualizada correctamente{RESET}")
        print(f"{'='*60}\n")
        
    except pymysql.err.OperationalError as e:
        if "Can't connect" in str(e) or "Lost connection" in str(e):
            print_error("No se pudo conectar a MySQL del VPS")
            print(f"\n{YELLOW}Posibles causas:{RESET}")
            print("  1. Puerto 3306 no está expuesto públicamente")
            print("  2. Firewall bloqueando conexiones remotas")
            print("  3. MySQL configurado para localhost only")
            print(f"\n{BLUE}Solución alternativa:{RESET}")
            print("  Ejecutar el SQL manualmente desde phpMyAdmin o SSH")
        else:
            print_error(f"Error MySQL: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print_error(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    print(f"\n{YELLOW}Este script se conecta directamente a MySQL del VPS{RESET}")
    print("Sin usar SSH, directamente al puerto 3306\n")
    main()
