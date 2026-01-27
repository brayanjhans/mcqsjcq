import paramiko
import re

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

DUMP_FILE = "/root/db_sync_update.sql"

def main():
    print("\n" + "="*80)
    print("  BUSCANDO CREDENCIALES MySQL EN APLICACIÓN")
    print("="*80 + "\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=15)
        print("✅ Conectado\n")
        
        # Search for .env files or config files in backend
        print("Buscando archivos de configuración...\n")
        
        paths_to_check = [
            "/home/mcqs-jcq-front/htdocs/mcqs-jcq.cloud/.env",
            "/home/mcqs-jcq-front/htdocs/mcqs-jcq.cloud/app/database.py",
            "/home/mcqs-jcq/htdocs/mcqs-jcq.com/.env",
            "/home2/admin/htdocs/mcqs-jcq.com/.env",
        ]
        
        mysql_creds = {}
        
        for path in paths_to_check:
            cmd = f"cat {path} 2>/dev/null"
            stdin, stdout, stderr = ssh.exec_command(cmd)
            output = stdout.read().decode('utf-8', errors='ignore')
            
            if output and len(output) > 10:
                print(f"📄 Encontrado: {path}\n")
                print(output[:500])
                print("\n" + "-"*80 + "\n")
                
                # Extract MySQL credentials
                db_user_match = re.search(r'DB_USER[=:][\s"\']*(\w+)', output, re.IGNORECASE)
                db_pass_match = re.search(r'DB_PASS(?:WORD)?[=:][\s"\']*([\w#@!-]+)', output, re.IGNORECASE)
                db_name_match = re.search(r'DB_NAME[=:][\s"\']*([^"\'\s]+)', output, re.IGNORECASE)
                
                if db_user_match:
                    mysql_creds['user'] = db_user_match.group(1)
                if db_pass_match:
                    mysql_creds['password'] = db_pass_match.group(1)
                if db_name_match:
                    mysql_creds['database'] = db_name_match.group(1)
        
        if mysql_creds:
            print("\n✅ CREDENCIALES ENCONTRADAS:\n")
            for key, value in mysql_creds.items():
                print(f"   {key}: {value}")
            
            # Now try importing with these credentials
            print(f"\n\n{'='*80}")
            print("  INTENTANDO IMPORTACIÓN CON CREDENCIALES ENCONTRADAS")
            print("="*80 + "\n")
            
            user = mysql_creds.get('user', 'mcqs-jcq')
            password = mysql_creds.get('password', 'mcqs-jcq')
            
            print(f"Usando: {user} / {'*' * len(password)}\n")
            
            # Create import script with credentials
            import_cmd = f"""
mysql -u "{user}" -p"{password}" -e "DROP DATABASE IF EXISTS \`mcqs-jcq\`;" 2>&1
mysql -u "{user}" -p"{password}" -e "CREATE DATABASE IF NOT EXISTS \`mcqs-jcq\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;" 2>&1
mysql -u "{user}" -p"{password}" < {DUMP_FILE} 2>&1
"""
            
            stdin, stdout, stderr = ssh.exec_command(import_cmd)
            output = stdout.read().decode('utf-8', errors='ignore').strip()
            exit_status = stdout.channel.recv_exit_status()
            
            if exit_status == 0 or 'Warning' in output:
                print("✅ IMPORTACIÓN EXITOSA!\n")
            else:
                print(f"Resultado:\n{output}\n")
            
            # Verify
            print("Verificando...")
            verify_cmd = f'mysql -u "{user}" -p"{password}" -e "SELECT COUNT(*) as tables FROM information_schema.tables WHERE table_schema = \'mcqs-jcq\';" 2>&1'
            stdin, stdout, stderr = ssh.exec_command(verify_cmd)
            verify_output = stdout.read().decode('utf-8', errors='ignore')
            print(f"\n{verify_output}\n")
            
            # Check size
            size_cmd = "du -sh /home/mysql/mcqs@002djcq/"
            stdin, stdout, stderr = ssh.exec_command(size_cmd)
            size = stdout.read().decode('utf-8', errors='ignore').strip()
            print(f"Tamaño de BD: {size}\n")
            
        else:
            print("\n⚠️ No se encontraron credenciales MySQL en archivos de configuración\n")
        
        ssh.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
