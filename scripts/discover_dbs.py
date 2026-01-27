import paramiko
import sys

# VPS SSH Credentials
VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

# Database credentials from cPanel
DB_USER = "mcqs-jcq"
DB_PASS = "Juegos12345#"  # cPanel admin password

def log(msg):
    print(msg)

def discover_databases():
    print(f"\n📋 Conectando al VPS {VPS_HOST}...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=15)
        print(f"✅ Conectado como {VPS_USER}@{VPS_HOST}\n")
        
        print("="*80)
        print("  ACCEDIENDO A MySQL CON CREDENCIALES DE cPANEL")
        print("="*80 + "\n")
        
        # Escapar caracteres especiales en la contraseña
        db_pass_escaped = DB_PASS.replace("'", "'\"'\"'")
        
        # Intentar con credenciales de cPanel
        cmd = f"mysql -u '{DB_USER}' -p'{db_pass_escaped}' -e 'SHOW DATABASES;'"
        
        print(f"🔍 Conectando como usuario: {DB_USER}")
        
        stdin, stdout, stderr = ssh.exec_command(cmd)
        exit_status = stdout.channel.recv_exit_status()
        
        out = stdout.read().decode('utf-8', errors='ignore').strip()
        err = stderr.read().decode('utf-8', errors='ignore').strip()
        
        if exit_status == 0 and out:
            print(f"✅ Conexión exitosa!\n")
            print("📊 Bases de datos accesibles:\n")
            print(out)
            print("\n" + "="*80 + "\n")
            
            # Extract database names
            lines = out.split('\n')[1:]  # Skip header
            db_names = [line.strip() for line in lines if line.strip()]
            
            # Filter user databases
            print(f"🔍 Bases de datos del usuario:\n")
            user_dbs = []
            for db in db_names:
                if db not in ['information_schema', 'performance_schema']:
                    user_dbs.append(db)
                    print(f"   ➡️  {db}")
            
            if user_dbs:
                print(f"\n\n{'='*80}")
                print("  EXPLORANDO TABLAS EN CADA BASE DE DATOS")
                print("="*80 + "\n")
                
                for db in user_dbs:
                    print(f"\n📋 Base de Datos: {db}")
                    print("-" * 60)
                    
                    # List tables
                    cmd2 = f"mysql -u '{DB_USER}' -p'{db_pass_escaped}' {db} -e 'SHOW TABLES;'"
                    stdin2, stdout2, stderr2 = ssh.exec_command(cmd2)
                    out2 = stdout2.read().decode('utf-8', errors='ignore').strip()
                    status2 = stdout2.channel.recv_exit_status()
                    
                    if status2 == 0 and out2:
                        table_lines = [line.strip() for line in out2.split('\n')[1:] if line.strip()]
                        print(f"   Tablas encontradas: {len(table_lines)}\n")
                        
                        if len(table_lines) > 0:
                            print(f"   Listado de tablas:")
                            for i, table in enumerate(table_lines, 1):
                                print(f"      {i:2}. {table}")
                            
                            # Get row count for first few tables
                            print(f"\n   Conteo de registros (primeras 10 tablas):")
                            for i, table in enumerate(table_lines[:10], 1):
                                cmd3 = f"mysql -u '{DB_USER}' -p'{db_pass_escaped}' {db} -e 'SELECT COUNT(*) FROM `{table}`;'"
                                stdin3, stdout3, stderr3 = ssh.exec_command(cmd3)
                                out3 = stdout3.read().decode('utf-8', errors='ignore').strip()
                                
                                if stdout3.channel.recv_exit_status() == 0:
                                    count_line = out3.split('\n')[1] if len(out3.split('\n')) > 1 else '0'
                                    print(f"      - {table}: {count_line} registros")
                    else:
                        print(f"   ⚠️ No se pudieron listar las tablas")
                        if stderr2.read():
                            print(f"   Error: {stderr2.read().decode()[:200]}")
            else:
                print("\n⚠️ No se encontraron bases de datos del usuario")
            
        else:
            print(f"❌ No se pudo conectar a MySQL")
            print(f"Error: {err}\n")
            
            # Intentar diagnóstico adicional
            print("ℹ️  Intentando diagnóstico alternativo...")
            
            # Verificar si MySQL está corriendo
            cmd_check = "systemctl status mysql | head -5"
            stdin4, stdout4, stderr4 = ssh.exec_command(cmd_check)
            out4 = stdout4.read().decode('utf-8', errors='ignore').strip()
            print(f"\nEstado de MySQL:\n{out4}\n")
        
        ssh.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    discover_databases()
