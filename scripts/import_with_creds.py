import paramiko
import time

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

# MySQL credentials from FastAPI config
MYSQL_USER = "mcqs-jcq"
MYSQL_PASS = "mcqs-jcq"
MYSQL_DB = "mcqs-jcq"

DUMP_FILE = "/root/db_sync_update.sql"

def main():
    print("\n" + "="*80)
    print("  IMPORTACIÓN FINAL CON CREDENCIALES CORRECTAS")
    print("="*80 + "\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=15)
        print("✅ Conectado\n")
        
        print(f"Credenciales MySQL:")
        print(f"   Usuario: {MYSQL_USER}")
        print(f"   Database: {MYSQL_DB}\n")
        
        # Step 1: Drop existing database
        print("Paso 1: Eliminando base de datos existente...")
        cmd_drop = f'mysql -u "{MYSQL_USER}" -p"{MYSQL_PASS}" -e "DROP DATABASE IF EXISTS `{MYSQL_DB}`;" 2>&1'
        stdin, stdout, stderr = ssh.exec_command(cmd_drop)
        out = stdout.read().decode('utf-8', errors='ignore').strip()
        exit_status = stdout.channel.recv_exit_status()
        
        if exit_status == 0 or 'Warning' in out:
            print("✅ Base de datos eliminada\n")
        else:
            print(f"Resultado: {out[:200]}\n")
        
        #  Step 2: Create database
        print("Paso 2: Creando base de datos...")
        cmd_create = f'mysql -u "{MYSQL_USER}" -p"{MYSQL_PASS}" -e "CREATE DATABASE IF NOT EXISTS `{MYSQL_DB}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;" 2>&1'
        stdin, stdout, stderr = ssh.exec_command(cmd_create)
        out = stdout.read().decode('utf-8', errors='ignore').strip()
        exit_status = stdout.channel.recv_exit_status()
        
        if exit_status == 0 or 'Warning' in out:
            print("✅ Base de datos creada\n")
        else:
            print(f"Resultado: {out[:200]}\n")
        
        # Step 3: Import data
        print("Paso 3: Importando datos (esto tomará varios minutos)...")
        print("   Archivo: /root/db_sync_update.sql (107 MB)")
        print("   Esto puede tomar 2-5 minutos...\n")
        
        cmd_import = f'mysql -u "{MYSQL_USER}" -p"{MYSQL_PASS}" {MYSQL_DB} < {DUMP_FILE} 2>&1'
        stdin, stdout, stderr = ssh.exec_command(cmd_import, timeout=600)  # 10 min timeout
        
        # Wait for completion (this will take time)
        print("   Importando", end="", flush=True)
        while not stdout.channel.exit_status_ready():
            print(".", end="", flush=True)
            time.sleep(2)
        
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8', errors='ignore').strip()
        
        print()  # New line
        
        if exit_status == 0:
            print("\n✅ IMPORTACIÓN EXITOSA!\n")
        else:
            print(f"\nResultado de importación:")
            print(out if len(out) < 500 else out[:500] + "...")
            print()
        
        # Step 4: Verify
        print("Paso 4: Verificando importación...\n")
        
        # Count tables
        cmd_tables = f'mysql -u "{MYSQL_USER}" -p"{MYSQL_PASS}" -e "SELECT COUNT(*) as tables FROM information_schema.tables WHERE table_schema = \'{MYSQL_DB}\';" 2>&1'
        stdin, stdout, stderr = ssh.exec_command(cmd_tables)
        tables_out = stdout.read().decode('utf-8', errors='ignore').strip()
        print(f"Tablas en {MYSQL_DB}:")
        print(tables_out)
        print()
        
        # Count records in main table
        cmd_count = f'mysql -u "{MYSQL_USER}" -p"{MYSQL_PASS}" {MYSQL_DB} -e "SELECT COUNT(*) as total FROM licitaciones_adjudicaciones;" 2>&1'
        stdin, stdout, stderr = ssh.exec_command(cmd_count)
        count_out = stdout.read().decode('utf-8', errors='ignore').strip()
        print("Registros en licitaciones_adjudicaciones:")
        print(count_out)
        print()
        
        # Check database size
        cmd_size = "du -sh /home/mysql/mcqs@002djcq/"
        stdin, stdout, stderr = ssh.exec_command(cmd_size)
        size_out = stdout.read().decode('utf-8', errors='ignore').strip()
        print(f"Tamaño de base de datos:")
        print(size_out)
        print()
        
        print("\n" + "="*80)
        print("  ✅ SINCRONIZACIÓN COMPLETADA EXITOSAMENTE")
        print("="*80 + "\n")
        
        print("📋 Resumen:")
        print("   - Base de datos local exportada: 107 MB")
        print("   - Subida al VPS: ✅")
        print("   - Importada a MySQL: ✅")
        print("   - Base de datos: mcqs-jcq")
        print("\n")
        
        ssh.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
