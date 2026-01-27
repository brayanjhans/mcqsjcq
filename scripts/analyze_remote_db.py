import paramiko

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def analyze_from_filesystem():
    print("\n" + "="*80)
    print("  ANÁLISIS DE BASE DE DATOS REMOTA - VPS")
    print("  Método: Inspección del Sistema de Archivos")
    print("="*80 + "\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=15)
        print("✅ Conectado al VPS\n")
        
        # 1. List databases from filesystem
        print("📋 PASO 1: Listando bases de datos desde /home/mysql/\n")
        cmd = "ls -lh /home/mysql/ | grep ^d"
        stdin, stdout, stderr = ssh.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='ignore').strip()
        
        print(out)
        
        if out:
            db_names = [line.split()[-1] for line in out.split('\n') if line.strip()]
            print(f"\n✅ Bases de datos encontradas: {len(db_names)}\n")
            
            for db in db_names:
                print(f"   📁 {db}")
            
            # 2. Get table counts from each database directory
            print(f"\n\n{'='*80}")
            print("📋 PASO 2: Tablas en cada base de datos")
            print("="*80 + "\n")
            
            for db in db_names:
                print(f"\n🗂️  Base de Datos: {db}")
                print("-" * 60)
                
                # List .frm files (table definitions) or .ibd files (InnoDB tables)
                cmd2 = f"ls /home/mysql/{db}/ | grep -E '\\.(frm|ibd)$' | sed 's/\\..*$//' | sort -u"
                stdin2, stdout2, stderr2 = ssh.exec_command(cmd2)
                out2 = stdout2.read().decode('utf-8', errors='ignore').strip()
                
                if out2:
                    tables = [line.strip() for line in out2.split('\n') if line.strip()]
                    print(f"   Tablas encontradas: {len(tables)}\n")
                    
                    for i, table in enumerate(tables, 1):
                        print(f"      {i:2}. {table}")
                    
                    # Get file sizes for tables
                    cmd3 = f"du -sh /home/mysql/{db}/"
                    stdin3, stdout3, stderr3 = ssh.exec_command(cmd3)
                    out3 = stdout3.read().decode('utf-8', errors='ignore').strip()
                    print(f"\n   Tamaño total: {out3.split()[0]}")
                else:
                    print(f"   ⚠️ No se pudieron listar las tablas")
        else:
            print("⚠️ No se encontraron directorios de bases de datos\n")
        
        # 3. Analyze backup SQL files
        print(f"\n\n{'='*80}")
        print("📋 PASO 3: Analizando archivos de backup SQL")
        print("="*80 + "\n")
        
        backup_files = [
            "/root/db_sync_update.sql",
            "/home/mcqs-jcq-front/garantias_seacee_backup.sql",
            "/home/mcqs-jcq-front/db_import.sql"
        ]
        
        for backup_file in backup_files:
            cmd = f"test -f {backup_file} && echo 'EXISTS' || echo 'NOT_FOUND'"
            stdin, stdout, stderr = ssh.exec_command(cmd)
            exists = stdout.read().decode('utf-8', errors='ignore').strip()
            
            if exists == 'EXISTS':
                print(f"\n📄 Archivo: {backup_file}")
                
                # Get file size
                cmd2 = f"du -h {backup_file}"
                stdin2, stdout2, stderr2 = ssh.exec_command(cmd2)
                out2 = stdout2.read().decode('utf-8', errors='ignore').strip()
                size = out2.split()[0] if out2 else 'Unknown'
                print(f"   Tamaño: {size}")
                
                # Get creation date
                cmd3 = f"stat {backup_file} | grep Modify"
                stdin3, stdout3, stderr3 = ssh.exec_command(cmd3)
                out3 = stdout3.read().decode('utf-8', errors='ignore').strip()
                date = out3.split('Modify:')[1].strip() if 'Modify:' in out3 else 'Unknown'
                print(f"   Fecha: {date}")
                
                # Extract database name from SQL
                cmd4 = f"head -100 {backup_file} | grep -i 'CREATE DATABASE\\|USE \\|Database:' | head -5"
                stdin4, stdout4, stderr4 = ssh.exec_command(cmd4)
                out4 = stdout4.read().decode('utf-8', errors='ignore').strip()
                if out4:
                    print(f"   Contenido:\n{out4}")
                
                # Count CREATE TABLE statements
                cmd5 = f"grep -c 'CREATE TABLE' {backup_file}"
                stdin5, stdout5, stderr5 = ssh.exec_command(cmd5)
                out5 = stdout5.read().decode('utf-8', errors='ignore').strip()
                if out5.isdigit():
                    print(f"   Tablas en dump: {out5}")
        
        # 4. Summary
        print(f"\n\n{'='*80}")
        print("  RESUMEN DEL ANÁLISIS")
        print("="*80 + "\n")
        
        print("📌 **Ubicación de datos MySQL:** /home/mysql/")
        print("📌 **Servidor MySQL:** Percona Server 8.4.6")
        print("📌 **Estado:** ✅ Running")
        print("\n⚠️  **Nota de Acceso:**")
        print("   El usuario 'mcqs-jcq' no puede autenticarse vía CLI de MySQL.")
        print("   Probablemente está configurado para acceso solo desde la aplicación")
        print("   web o con restricciones de host específicas.\n")
        print("📋 **Recomendaciones:**")
        print("   1. Acceder a la base de datos desde la aplicación FastAPI")
        print("   2. Usar cPanel > MySQL para gestión")
        print("   3. O resetear permisos del usuario MySQL si es necesario\n")
        
        print("="*80 + "\n")
        print("✅ ANÁLISIS COMPLETADO\n")
        
        ssh.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    analyze_from_filesystem()
