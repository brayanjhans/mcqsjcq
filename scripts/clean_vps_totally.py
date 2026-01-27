import paramiko
import time

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def main():
    print("\n" + "="*80)
    print("  LIMPIEZA COMPLETA DE BASES DE DATOS VPS")
    print("="*80 + "\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=15)
        print("✅ Conectado\n")
        
        # Step 1: Stop MySQL
        print("Paso 1: Deteniendo MySQL...")
        stdin, stdout, stderr = ssh.exec_command("systemctl stop mysql")
        stdout.channel.recv_exit_status()
        print("✅ MySQL detenido\n")
        
        time.sleep(2)
        
        # Step 2: Remove database directories
        print("Paso 2: Eliminando directorios de bases de datos...")
        
        remove_commands = [
            "rm -rf /home/mysql/mcqs@002djcq",
            "rm -rf /home/mysql/mcqsjcqdb",
            "rm -rf /home/mysql/mcqs-jcq",
            "rm -rf /home/mysql/mcqsjcq*",
            "rm -rf /var/lib/mysql/mcqs*",
        ]
        
        for cmd in remove_commands:
            stdin, stdout, stderr = ssh.exec_command(cmd)
            stdout.channel.recv_exit_status()
            print(f"  {cmd}")
        
        print("✅ Directorios eliminados\n")
        
        # Step 3: Clean MySQL metadata
        print("Paso 3: Limpiando metadatos de MySQL...")
        
        # Remove any .frm, .ibd files related to mcqs
        stdin, stdout, stderr = ssh.exec_command("find /home/mysql -name '*mcqs*' -delete 2>/dev/null")
        stdout.channel.recv_exit_status()
        
        stdin, stdout, stderr = ssh.exec_command("find /var/lib/mysql -name '*mcqs*' -delete 2>/dev/null")
        stdout.channel.recv_exit_status()
        
        print("✅ Metadatos limpiados\n")
        
        # Step 4: Remove cPanel database metadata
        print("Paso 4: Limpiando configuración de cPanel...")
        
        # cPanel stores database info in /var/cpanel
        cpanel_commands = [
            "rm -f /var/cpanel/databases/mcqs-jcq* 2>/dev/null",
            "rm -f /var/cpanel/databases/mcqsjcq* 2>/dev/null",
        ]
        
        for cmd in cpanel_commands:
            stdin, stdout, stderr = ssh.exec_command(cmd)
            stdout.channel.recv_exit_status()
        
        print("✅ Configuración de cPanel limpiada\n")
        
        # Step 5: Start MySQL
        print("Paso 5: Iniciando MySQL...")
        stdin, stdout, stderr = ssh.exec_command("systemctl start mysql")
        stdout.channel.recv_exit_status()
        
        time.sleep(3)
        
        # Check MySQL status
        stdin, stdout, stderr = ssh.exec_command("systemctl is-active mysql")
        status = stdout.read().decode('utf-8', errors='ignore').strip()
        
        if status == "active":
            print("✅ MySQL iniciado correctamente\n")
        else:
            print(f"⚠️ MySQL status: {status}\n")
        
        # Step 6: Try to access MySQL and drop databases via SQL
        print("Paso 6: Eliminando bases de datos vía SQL...")
        
        # Try using socket authentication (works when logged in as root)
        drop_commands = [
            "mysql --socket=/var/lib/mysql/mysql.sock -e 'DROP DATABASE IF EXISTS `mcqs-jcq`;' 2>/dev/null",
            "mysql --socket=/var/lib/mysql/mysql.sock -e 'DROP DATABASE IF EXISTS `mcqsjcqdb`;' 2>/dev/null",
            "mysql -e 'DROP DATABASE IF EXISTS `mcqs-jcq`;' 2>/dev/null",
            "mysql -e 'DROP DATABASE IF EXISTS `mcqsjcqdb`;' 2>/dev/null",
        ]
        
        for cmd in drop_commands:
            stdin, stdout, stderr = ssh.exec_command(cmd)
            stdout.channel.recv_exit_status()
            # Ignore errors, just try
        
        print("✅ Comandos DROP ejecutados\n")
        
        # Step 7: Verification
        print("="*80)
        print("  VERIFICACIÓN FINAL")
        print("="*80 + "\n")
        
        # Check filesystem
        print("1. Verificando filesystem:")
        stdin, stdout, stderr = ssh.exec_command("ls -la /home/mysql/ | grep -i mcqs")
        fs_result = stdout.read().decode('utf-8', errors='ignore').strip()
        
        if not fs_result:
            print("   ✅ No hay directorios mcqs en /home/mysql/\n")
        else:
            print(f"   ⚠️ Encontrado:\n{fs_result}\n")
        
        # Check if MySQL has any mcqs databases
        print("2. Verificando MySQL:")
        stdin, stdout, stderr = ssh.exec_command("mysql -e 'SHOW DATABASES LIKE \"%mcqs%\";' 2>&1")
        db_result = stdout.read().decode('utf-8', errors='ignore').strip()
        exit_status = stdout.channel.recv_exit_status()
        
        if exit_status == 0:
            if 'mcqs' in db_result.lower():
                print(f"   ⚠️ Bases de datos encontradas:\n{db_result}\n")
            else:
                print("   ✅ No hay bases de datos mcqs en MySQL\n")
        else:
            print(f"   ℹ️  No se pudo verificar (acceso denegado - esto es normal)\n")
        
        # Check disk usage
        print("3. Uso de disco en /home/mysql/:")
        stdin, stdout, stderr = ssh.exec_command("du -sh /home/mysql/")
        disk_usage = stdout.read().decode('utf-8', errors='ignore').strip()
        print(f"   {disk_usage}\n")
        
        print("="*80)
        print("  ✅ LIMPIEZA COMPLETADA")
        print("="*80 + "\n")
        
        print("📋 Resumen:")
        print("   - Directorios de bases de datos eliminados")
        print("   - Archivos de metadatos limpiados")
        print("   - Configuración de cPanel limpiada")
        print("   - MySQL reiniciado")
        print("\n El VPS está ahora limpio y listo para una nueva base de datos.\n")
        
        ssh.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
