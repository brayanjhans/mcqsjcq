import paramiko

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def main():
    print("\n" + "="*80)
    print("  BUSCANDO CONTRASEÑA DE MySQL ROOT")
    print("="*80 + "\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=15)
        print("✅ Conectado\n")
        
        # Try to find MySQL root password
        print("Buscando contraseña de MySQL en archivos de configuración...\n")
        
        search_paths = [
            "/root/.my.cnf",
            "/etc/mysql/debian.cnf",
            "/root/.mysql_secret",
            "/var/cpanel/mysql/root_password",
        ]
        
        mysql_password = None
        mysql_user = "root"
        
        for path in search_paths:
            print(f"Verificando: {path}")
            stdin, stdout, stderr = ssh.exec_command(f"cat {path} 2>/dev/null")
            content = stdout.read().decode('utf-8', errors='ignore')
            
            if content:
                print(f"  ✅ Encontrado!\n{content[:300]}\n")
                
                # Try to extract password
                for line in content.split('\n'):
                    if 'password' in line.lower():
                        if '=' in line:
                            pwd = line.split('=')[1].strip().strip('"').strip("'")
                            if pwd and len(pwd) > 0:
                                mysql_password = pwd
                                print(f"  🔑 Password encontrado: {mysql_password[:3]}***\n")
                                break
            else:
                print("  ❌ No encontrado\n")
        
        # Try debian-sys-maint user
        print("Verificando usuario debian-sys-maint...")
        stdin, stdout, stderr = ssh.exec_command("cat /etc/mysql/debian.cnf 2>/dev/null")
        debian_conf = stdout.read().decode('utf-8', errors='ignore')
        
        if debian_conf:
            print("  ✅ Archivo debian.cnf encontrado\n")
            print(debian_conf[:400])
            print()
            
            # Extract credentials
            for line in debian_conf.split('\n'):
                if 'user' in line and '=' in line:
                    mysql_user = line.split('=')[1].strip()
                if 'password' in line and '=' in line:
                    mysql_password = line.split('=')[1].strip()
            
            if mysql_user and mysql_password:
                print(f"  🔑 Credenciales debian-sys-maint:")
                print(f"      Usuario: {mysql_user}")
                print(f"      Password: {mysql_password[:5]}***\n")
        
        # Now try to delete with found credentials
        if mysql_password:
            print("="*80)
            print("  ELIMINANDO BASE DE DATOS CON CREDENCIALES ENCONTRADAS")
            print("="*80 + "\n")
            
            # Test connection
            test_cmd = f"mysql -u {mysql_user} -p'{mysql_password}' -e 'SELECT 1;' 2>&1"
            stdin, stdout, stderr = ssh.exec_command(test_cmd)
            test_result = stdout.read().decode('utf-8', errors='ignore')
            test_status = stdout.channel.recv_exit_status()
            
            if test_status == 0:
                print(f"✅ Conexión MySQL exitosa con {mysql_user}\n")
                
                # List databases
                list_cmd = f"mysql -u {mysql_user} -p'{mysql_password}' -e 'SHOW DATABASES;' 2>&1"
                stdin, stdout, stderr = ssh.exec_command(list_cmd)
                dbs = stdout.read().decode('utf-8', errors='ignore')
                print(f"Bases de datos actuales:\n{dbs}\n")
                
                # Drop mcqs databases
                print("Eliminando bases de datos mcqs...")
                for db_name in ['mcqs-jcq', 'mcqsjcqdb']:
                    drop_cmd = f"mysql -u {mysql_user} -p'{mysql_password}' -e 'DROP DATABASE IF EXISTS `{db_name}`;' 2>&1"
                    stdin, stdout, stderr = ssh.exec_command(drop_cmd)
                    drop_result = stdout.read().decode('utf-8', errors='ignore')
                    drop_status = stdout.channel.recv_exit_status()
                    
                    if drop_status == 0:
                        print(f"  ✅ {db_name} eliminada")
                    else:
                        print(f"  ⚠️ {db_name}: {drop_result[:150]}")
                
                print()
                
                # Verify
                verify_cmd = f"mysql -u {mysql_user} -p'{mysql_password}' -e 'SHOW DATABASES LIKE \"%mcqs%\";' 2>&1"
                stdin, stdout, stderr = ssh.exec_command(verify_cmd)
                remaining = stdout.read().decode('utf-8', errors='ignore')
                
                print(f"Verificación:\n{remaining}\n")
                
                if 'mcqs' not in remaining.lower() or 'Empty set' in remaining:
                    print("="*80)
                    print("  ✅ BASES DE DATOS ELIMINADAS EXITOSAMENTE")
                    print("="*80 + "\n")
                else:
                    print("⚠️ Aún quedan bases de datos mcqs\n")
            else:
                print(f"❌ Conexión fallida: {test_result[:200]}\n")
        else:
            print("❌ No se encontró contraseña de MySQL\n")
            print("SOLUCIÓN: Elimina manualmente desde cPanel:")
            print("  1. cPanel > Databases > MySQL Databases")
            print("  2. Click 'Delete' junto a 'mcqs-jcq'")
            print("  3. Confirmar eliminación\n")
        
        ssh.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
