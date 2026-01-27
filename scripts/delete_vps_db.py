import paramiko

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def main():
    print("\n" + "="*80)
    print("  ELIMINANDO BASE DE DATOS DEL VPS")
    print("="*80 + "\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=15)
        print("✅ Conectado al VPS\n")
        
        # Check current databases
        print("Bases de datos actuales:")
        cmd_list = "ls -lh /home/mysql/ | grep mcqs"
        stdin, stdout, stderr = ssh.exec_command(cmd_list)
        current_dbs = stdout.read().decode('utf-8', errors='ignore')
        print(current_dbs)
        print()
        
        # Stop MySQL temporarily
        print("Deteniendo MySQL temporalmente...")
        stdin, stdout, stderr = ssh.exec_command("systemctl stop mysql")
        stdout.channel.recv_exit_status()
        print("✅ MySQL detenido\n")
        
        # Delete database directories
        databases_to_delete = [
            "/home/mysql/mcqs@002djcq",  # mcqs-jcq
            "/home/mysql/mcqsjcqdb"       # mcqsjcqdb
        ]
        
        for db_path in databases_to_delete:
            print(f"Eliminando {db_path}...")
            
            # Check size before deletion
            cmd_size = f"du -sh {db_path} 2>/dev/null"
            stdin, stdout, stderr = ssh.exec_command(cmd_size)
            size = stdout.read().decode('utf-8', errors='ignore').strip()
            
            if size:
                print(f"  Tamaño: {size}")
                
                # Delete
                cmd_delete = f"rm -rf {db_path}"
                stdin, stdout, stderr = ssh.exec_command(cmd_delete)
                exit_status = stdout.channel.recv_exit_status()
                
                if exit_status == 0:
                    print(f"  ✅ Eliminado\n")
                else:
                    print(f"  ⚠️ Error al eliminar\n")
            else:
                print(f"  ⚠️ No encontrado\n")
        
        # Restart MySQL
        print("Reiniciando MySQL...")
        stdin, stdout, stderr = ssh.exec_command("systemctl start mysql")
        stdout.channel.recv_exit_status()
        
        import time
        time.sleep(3)
        
        # Verify MySQL is running
        stdin, stdout, stderr = ssh.exec_command("systemctl status mysql | grep Active")
        mysql_status = stdout.read().decode('utf-8', errors='ignore')
        print(f"Estado MySQL: {mysql_status}")
        print("✅ MySQL reiniciado\n")
        
        # Verify deletion
        print("Verificando eliminación...")
        cmd_verify = "ls -lh /home/mysql/ | grep mcqs"
        stdin, stdout, stderr = ssh.exec_command(cmd_verify)
        remaining = stdout.read().decode('utf-8', errors='ignore').strip()
        
        if not remaining:
            print("✅ Todas las bases de datos mcqs han sido eliminadas\n")
        else:
            print(f"Bases de datos restantes:\n{remaining}\n")
        
        print("="*80)
        print("  ✅ ELIMINACIÓN COMPLETADA")
        print("="*80 + "\n")
        
        ssh.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
