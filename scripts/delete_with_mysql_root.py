import paramiko

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

# MySQL credentials provided by user
MYSQL_ROOT_USER = "root"
MYSQL_ROOT_PASS = "123456789"

def main():
    print("\n" + "="*80)
    print("  ELIMINACIÓN DEFINITIVA DE BASE DE DATOS CON MYSQL ROOT")
    print("="*80 + "\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=15)
        print("✅ Conectado al VPS\n")
        
        print(f"Usando MySQL root credentials:")
        print(f"  Usuario: {MYSQL_ROOT_USER}")
        print(f"  Password: {MYSQL_ROOT_PASS}\n")
        
        # Test MySQL connection first
        print("Paso 1: Probando conexión MySQL...")
        test_cmd = f'mysql -u {MYSQL_ROOT_USER} -p{MYSQL_ROOT_PASS} -e "SELECT 1;" 2>&1'
        stdin, stdout, stderr = ssh.exec_command(test_cmd)
        test_result = stdout.read().decode('utf-8', errors='ignore').strip()
        test_status = stdout.channel.recv_exit_status()
        
        if test_status != 0:
            print(f"❌ Error de conexión MySQL:\n{test_result}\n")
            return
        
        print("✅ Conexión MySQL exitosa\n")
        
        # Show current databases
        print("Paso 2: Listando bases de datos actuales...")
        list_cmd = f'mysql -u {MYSQL_ROOT_USER} -p{MYSQL_ROOT_PASS} -e "SHOW DATABASES LIKE \'%mcqs%\';" 2>&1'
        stdin, stdout, stderr = ssh.exec_command(list_cmd)
        db_list = stdout.read().decode('utf-8', errors='ignore')
        print(f"\n{db_list}\n")
        
        # Drop all mcqs databases
        print("Paso 3: Eliminando bases de datos...")
        
        databases_to_drop = ['mcqs-jcq', 'mcqsjcqdb', 'mcqs_jcq']
        
        for db in databases_to_drop:
            print(f"  Eliminando: {db}")
            drop_cmd = f'mysql -u {MYSQL_ROOT_USER} -p{MYSQL_ROOT_PASS} -e "DROP DATABASE IF EXISTS `{db}`;" 2>&1'
            stdin, stdout, stderr = ssh.exec_command(drop_cmd)
            drop_result = stdout.read().decode('utf-8', errors='ignore').strip()
            drop_status = stdout.channel.recv_exit_status()
            
            if drop_status == 0:
                print(f"    ✅ Eliminada\n")
            else:
                if 'Warning' in drop_result or 'doesn\'t exist' in drop_result.lower():
                    print(f"    ℹ️  No existía\n")
                else:
                    print(f"    ⚠️ {drop_result[:200]}\n")
        
        # Remove database users
        print("Paso 4: Eliminando usuarios de base de datos...")
        
        users_to_drop = [
            ('mcqs-jcq', 'localhost'),
            ('mcqs-jcq', '%'),
            ('mcqsjcquser', 'localhost'),
            ('mcqsjcquser', '%'),
        ]
        
        for user, host in users_to_drop:
            drop_user_cmd = f'mysql -u {MYSQL_ROOT_USER} -p{MYSQL_ROOT_PASS} -e "DROP USER IF EXISTS \'{user}\'@\'{host}\';" 2>&1'
            stdin, stdout, stderr = ssh.exec_command(drop_user_cmd)
            stdout.channel.recv_exit_status()
        
        print("✅ Usuarios eliminados\n")
        
        # Flush privileges
        print("Paso 5: Actualizando privilegios...")
        flush_cmd = f'mysql -u {MYSQL_ROOT_USER} -p{MYSQL_ROOT_PASS} -e "FLUSH PRIVILEGES;" 2>&1'
        stdin, stdout, stderr = ssh.exec_command(flush_cmd)
        stdout.channel.recv_exit_status()
        print("✅ Privilegios actualizados\n")
        
        # Final verification
        print("="*80)
        print("  VERIFICACIÓN FINAL")
        print("="*80 + "\n")
        
        verify_cmd = f'mysql -u {MYSQL_ROOT_USER} -p{MYSQL_ROOT_PASS} -e "SHOW DATABASES;" 2>&1'
        stdin, stdout, stderr = ssh.exec_command(verify_cmd)
        all_dbs = stdout.read().decode('utf-8', errors='ignore')
        
        if 'mcqs' in all_dbs.lower():
            print("⚠️ Aún hay bases de datos mcqs:")
            print(f"\n{all_dbs}\n")
        else:
            print("✅ No hay bases de datos mcqs en el sistema\n")
            
        # Check filesystem
        stdin, stdout, stderr = ssh.exec_command("ls -la /home/mysql/ | grep mcqs")
        fs_check = stdout.read().decode('utf-8', errors='ignore').strip()
        
        if not fs_check:
            print("✅ No hay directorios mcqs en filesystem\n")
        else:
            print(f"⚠️ Directorios en filesystem:\n{fs_check}\n")
        
        print("="*80)
        print("  ✅ ELIMINACIÓN COMPLETA FINALIZADA")
        print("="*80 + "\n")
        
        print("El servidor VPS está ahora completamente limpio.")
        print("Listo para importar la nueva base de datos.\n")
        
        ssh.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
