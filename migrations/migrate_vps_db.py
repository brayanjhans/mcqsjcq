"""
Script de migración para VPS
Conecta vía SSH y ejecuta la migración de base de datos
SOLO migra la BD, NO toca código
"""
import paramiko
import sys
import os
from datetime import datetime

# Configuración VPS (desde .env local)
VPS_HOST = "72.61.219.79"  # IP correcta del VPS
VPS_USER = "root"
VPS_PASS = "Contra159753#"  # Contraseña SSH correcta

# Credenciales MySQL en VPS
MYSQL_USER = "mcqs-jcq"  # Usuario correcto de MySQL
MYSQL_PASS = "mcqs-jcq"  # Contraseña correcta de MySQL
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

def print_warning(message):
    print(f"{YELLOW}⚠️  {message}{RESET}")

def execute_ssh_command(ssh, command, description):
    """Ejecuta comando SSH y retorna output"""
    print_step(f"{description}...")
    stdin, stdout, stderr = ssh.exec_command(command)
    exit_status = stdout.channel.recv_exit_status()
    
    output = stdout.read().decode('utf-8')
    error = stderr.read().decode('utf-8')
    
    if exit_status == 0:
        print_success(f"{description} completado")
        return output
    else:
        print_error(f"{description} falló")
        if error:
            print(f"Error: {error}")
        return None

def main():
    print(f"\n{'='*60}")
    print(f"{BLUE}🗄️  MIGRACIÓN DE BASE DE DATOS VPS{RESET}")
    print(f"{'='*60}\n")
    
    # Leer script SQL local
    script_path = "migrations/vps_migration_20260128.sql"
    
    if not os.path.exists(script_path):
        print_error(f"Script SQL no encontrado: {script_path}")
        sys.exit(1)
    
    with open(script_path, 'r', encoding='utf-8') as f:
        sql_script = f.read()
    
    print_success(f"Script SQL cargado: {len(sql_script)} caracteres")
    
    try:
        # Conectar a VPS
        print_step(f"Conectando a VPS {VPS_HOST}...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
        print_success(f"Conectado a VPS exitosamente")
        
        # PASO 1: Hacer backup
        backup_filename = f"backup_pre_migration_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
        backup_path = f"/root/backups/{backup_filename}"
        
        print(f"\n{YELLOW}{'='*60}{RESET}")
        print_step("PASO 1: Creando backup de seguridad...")
        print(f"{YELLOW}{'='*60}{RESET}\n")
        
        # Crear directorio de backups si no existe
        execute_ssh_command(ssh, "mkdir -p /root/backups", "Crear directorio backups")
        
        # Ejecutar mysqldump
        backup_cmd = f"mysqldump -u {MYSQL_USER} -p'{MYSQL_PASS}' {MYSQL_DB} > {backup_path}"
        execute_ssh_command(ssh, backup_cmd, f"Backup a {backup_filename}")
        
        # Verificar tamaño del backup
        size_output = execute_ssh_command(ssh, f"du -h {backup_path}", "Verificar tamaño backup")
        if size_output:
            print(f"   Tamaño: {size_output.strip()}")
        
        # PASO 2: Crear archivo SQL temporal en VPS
        print(f"\n{YELLOW}{'='*60}{RESET}")
        print_step("PASO 2: Transfiriendo script SQL al VPS...")
        print(f"{YELLOW}{'='*60}{RESET}\n")
        
        temp_sql_path = "/tmp/migration_temp.sql"
        
        # Usar SFTP para subir el archivo
        sftp = ssh.open_sftp()
        with sftp.open(temp_sql_path, 'w') as remote_file:
            remote_file.write(sql_script)
        sftp.close()
        
        print_success(f"Script transferido a {temp_sql_path}")
        
        # PASO 3: Ejecutar migración
        print(f"\n{YELLOW}{'='*60}{RESET}")
        print_step("PASO 3: Ejecutando migración en base de datos...")
        print(f"{YELLOW}{'='*60}{RESET}\n")
        
        migration_cmd = f"mysql -u {MYSQL_USER} -p'{MYSQL_PASS}' {MYSQL_DB} < {temp_sql_path}"
        output = execute_ssh_command(ssh, migration_cmd, "Ejecutar migración SQL")
        
        # PASO 4: Verificar columnas agregadas
        print(f"\n{YELLOW}{'='*60}{RESET}")
        print_step("PASO 4: Verificando columnas agregadas...")
        print(f"{YELLOW}{'='*60}{RESET}\n")
        
        verify_queries = [
            ("licitaciones_cabecera.entidad_ruc", 
             f"mysql -u {MYSQL_USER} -p'{MYSQL_PASS}' {MYSQL_DB} -e \"SHOW COLUMNS FROM licitaciones_cabecera LIKE 'entidad_ruc';\""),
            
            ("licitaciones_cabecera.fecha_adjudicacion",
             f"mysql -u {MYSQL_USER} -p'{MYSQL_PASS}' {MYSQL_DB} -e \"SHOW COLUMNS FROM licitaciones_cabecera LIKE 'fecha_adjudicacion';\""),
            
            ("licitaciones_adjudicaciones.url_documento_contrato",
             f"mysql -u {MYSQL_USER} -p'{MYSQL_PASS}' {MYSQL_DB} -e \"SHOW COLUMNS FROM licitaciones_adjudicaciones LIKE 'url_documento_contrato';\""),
            
            ("licitaciones_adjudicaciones.ubicacion_completa",
             f"mysql -u {MYSQL_USER} -p'{MYSQL_PASS}' {MYSQL_DB} -e \"SHOW COLUMNS FROM licitaciones_adjudicaciones LIKE 'ubicacion_completa';\""),
        ]
        
        all_verified = True
        for column_name, verify_cmd in verify_queries:
            result = execute_ssh_command(ssh, verify_cmd, f"Verificar {column_name}")
            if result and "entidad_ruc" in result or "fecha_adjudicacion" in result or "url_documento" in result or "ubicacion_completa" in result:
                print(f"   ✓ {column_name}")
            else:
                print_warning(f"No se pudo verificar {column_name}")
                all_verified = False
        
        # Limpiar archivo temporal
        execute_ssh_command(ssh, f"rm {temp_sql_path}", "Limpiar archivo temporal")
        
        # Resumen final
        print(f"\n{'='*60}")
        if all_verified:
            print_success("MIGRACIÓN COMPLETADA EXITOSAMENTE")
            print(f"\n{GREEN}Columnas agregadas:{RESET}")
            print(f"   • licitaciones_cabecera: +2 columnas")
            print(f"   • licitaciones_adjudicaciones: +6 columnas")
            print(f"{GREEN}Total: 8 columnas nuevas ✅{RESET}")
        else:
            print_warning("MIGRACIÓN COMPLETADA CON ADVERTENCIAS")
            print("Revisa manualmente las columnas en la base de datos")
        
        print(f"\n{BLUE}Backup guardado en:{RESET} {backup_path}")
        print(f"{'='*60}\n")
        
        ssh.close()
        
    except Exception as e:
        print_error(f"Error durante la migración: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    print(f"\n{YELLOW}⚠️  ADVERTENCIA:{RESET}")
    print("Este script va a:")
    print("  1. Hacer backup de la BD en VPS")
    print("  2. Agregar 8 columnas nuevas")
    print("  3. Verificar que se agregaron correctamente")
    print("\n¿Deseas continuar? (s/n): ", end='')
    
    confirm = input().lower()
    if confirm == 's' or confirm == 'si':
        main()
    else:
        print_warning("Migración cancelada por el usuario")
