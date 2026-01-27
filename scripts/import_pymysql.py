import paramiko

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def main():
    print("\n" + "="*80)
    print("  IMPORT VIA PYTHON/PYMYSQL (Método FastAPI)")
    print("="*80 + "\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=15)
        print("✅ Conectado\n")
        
        # Create Python script on VPS
        python_script = """
import pymysql
import sys

print("="*80)
print("  Importando base de datos via PyMySQL")
print("="*80 + "\\n")

try:
    # Connect using same method as FastAPI
    print("Conectando a MySQL...")
    connection = pymysql.connect(
        host='localhost',
        user='mcqs-jcq',
        password='mcqs-jcq',
        database='mcqs-jcq',
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )
    
    print("✅ Conectado exitosamente\\n")
    
    cursor = connection.cursor()
    
    # Drop database
    print("Eliminando base de datos existente...")
    cursor.execute("DROP DATABASE IF EXISTS `mcqs-jcq`;")
    print("✅ Eliminada\\n")
    
    # Create database
    print("Creando base de datos...")
    cursor.execute("CREATE DATABASE `mcqs-jcq` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;")
    print("✅ Creada\\n")
    
    # Use database
    cursor.execute("USE `mcqs-jcq`;")
    
    # Read and execute SQL file
    print("Leyendo archivo SQL (esto puede tomar 1-2 minutos)...")
    with open('/root/db_sync_update.sql', 'r', encoding='utf-8', errors='ignore') as f:
        sql_content = f.read()
    
    print(f"Tamaño: {len(sql_content) / 1024 / 1024:.2f} MB\\n")
    
    # Split by statement and execute
    print("Importando datos (esto tomará varios minutos)...")
    
    statements = []
    current_statement = []
    in_delimiter = False
    
    for line in sql_content.split('\\n'):
        line = line.strip()
        
        # Skip comments and empty lines
        if not line or line.startswith('--') or line.startswith('/*') or line.startswith('*/'):
            continue
            
        # Check for USE statement
        if line.upper().startswith('USE '):
            if current_statement:
                statements.append(' '.join(current_statement))
                current_statement = []
            cursor.execute(line.rstrip(';'))
            continue
        
        # Check for CREATE DATABASE
        if 'CREATE DATABASE' in line.upper():
            continue  # Skip, already created
            
        current_statement.append(line)
        
        # End of statement
        if line.endswith(';'):
            stmt = ' '.join(current_statement)
            if stmt:
                try:
                    cursor.execute(stmt)
                except Exception as e:
                    if 'already exists' not in str(e):
                        print(f"Warning: {str(e)[:100]}")
            current_statement = []
            
            # Progress indicator
            if len(statements) % 100 == 0:
                print(f"  Procesados {len(statements)} statements...")
    
    connection.commit()
    print("\\n✅ Importación completada!\\n")
    
    # Verify
    print("Verificando...")
    cursor.execute("SHOW TABLES;")
    tables = cursor.fetchall()
    print(f"Tablas importadas: {len(tables)}")
    
    cursor.execute("SELECT COUNT(*) as total FROM licitaciones_adjudicaciones;")
    result = cursor.fetchone()
    print(f"Registros en licitaciones_adjudicaciones: {result['total']}\\n")
    
    cursor.close()
    connection.close()
    
    print("="*80)
    print("  ✅ IMPORT EXITOSO")
    print("="*80)
    
except Exception as e:
    print(f"\\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
"""
        
        # Write Python script to VPS
        print("Creando script Python en VPS...")
        script_path = "/root/import_via_pymysql.py"
        
        stdin, stdout, stderr = ssh.exec_command(f"cat > {script_path} << 'EOFPYTHON'\n{python_script}\nEOFPYTHON")
        stdout.channel.recv_exit_status()
        print("✅ Script creado\n")
        
        # Execute Python script
        print("Ejecutando importación via PyMySQL...")
        print("(Esto puede tomar 5-10 minutos)\n")
        print("="*80 + "\n")
        
        # Execute with python3
        stdin, stdout, stderr = ssh.exec_command(f"cd /home/mcqs-jcq-front/htdocs/mcqs-jcq.cloud && source venv/bin/activate && python {script_path}", timeout=1200)
        
        # Read output in real-time
        for line in stdout:
            print(line.strip())
        
        exit_status = stdout.channel.recv_exit_status()
        
        print("\n" + "="*80)
        
        if exit_status == 0:
            print("\n✅ SINCRONIZACIÓN COMPLETADA EXITOSAMENTE!\n")
        else:
            print(f"\n⚠️ Exit status: {exit_status}")
            err = stderr.read().decode('utf-8', errors='ignore')
            if err:
                print(f"Errores:\n{err}")
        
        # Final verification
        print("\nVerificación final...")
        size_cmd = "du -sh /home/mysql/mcqs@002djcq/"
        stdin, stdout, stderr = ssh.exec_command(size_cmd)
        size = stdout.read().decode('utf-8', errors='ignore').strip()
        print(f"Tamaño de base de datos: {size}\n")
        
        ssh.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
