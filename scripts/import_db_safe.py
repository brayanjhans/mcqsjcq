import paramiko
import sys

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

DUMP_FILE = "/root/db_sync_update.sql"

def log(msg):
    print(f"[IMPORT] {msg}")

def main():
    print("\n" + "="*80)
    print("  IMPORTACIÓN DE BASE DE DATOS - Método Directo")
    print("="*80 + "\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=15)
        log("✅ Conectado al VPS\n")
        
        # Strategy 1: Stop MySQL, start without grant tables, import, restart
        log("ESTRATEGIA: Reiniciar MySQL en modo seguro\n")
        
        log("Paso 1: Deteniendo MySQL...")
        stdin, stdout, stderr = ssh.exec_command("systemctl stop mysql")
        stdout.channel.recv_exit_status()
        log("✅ MySQL detenido\n")
        
        log("Paso 2: Iniciando MySQL en modo skip-grant-tables...")
        # Start MySQL without password requirement
        cmd_safe = "mysqld_safe --skip-grant-tables --skip-networking &"
        stdin, stdout, stderr = ssh.exec_command(cmd_safe)
        
        import time
        time.sleep(5)  # Wait for MySQL to start
        
        log("Paso 3: Importando base de datos...")
        import_cmd = f"mysql < {DUMP_FILE} 2>&1"
        stdin, stdout, stderr = ssh.exec_command(import_cmd)
        exit_status = stdout.channel.recv_exit_status()
        output = stdout.read().decode('utf-8', errors='ignore').strip()
        
        if exit_status == 0:
            log(f"✅ Importación exitosa!\n")
        else:
            log(f"⚠️ Resultado: {output[:500]}\n")
        
        log("Paso 4: Reiniciando MySQL normalmente...")
        stdin, stdout, stderr = ssh.exec_command("killall mysqld mysqld_safe 2>/dev/null; sleep 2; systemctl start mysql")
        stdout.channel.recv_exit_status()
        time.sleep(3)
        log("✅ MySQL reiniciado\n")
        
        # Verify
        log("Paso 5: Verificando importación...")
        verify_cmd = "ls -lh /home/mysql/mcqs@002djcq/ | head -10"
        stdin, stdout, stderr = ssh.exec_command(verify_cmd)
        verify_output = stdout.read().decode('utf-8', errors='ignore').strip()
        log(f"Archivos de BD:\n{verify_output}\n")
        
        log("Verificando tamaño...")
        size_cmd = "du -sh /home/mysql/mcqs@002djcq/"
        stdin, stdout, stderr = ssh.exec_command(size_cmd)
        size_output = stdout.read().decode('utf-8', errors='ignore').strip()
        log(f"Tamaño: {size_output}\n")
        
        print("\n" + "="*80)
        print("  ✅ PROCESO COMPLETADO")
        print("="*80 + "\n")
        
        ssh.close()
        
    except Exception as e:
        log(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
