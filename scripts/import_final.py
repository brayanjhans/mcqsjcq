import paramiko
import sys

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

DUMP_FILE = "/root/db_sync_update.sql"

def log(msg):
    print(msg)

def main():
    print("\n" + "="*80)
    print("  IMPORTACIÓN FINAL - Método Shell Script")
    print("="*80 + "\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=15)
        log("✅ Conectado\n")
        
        # Create a shell script to import the database
        log("Creando script de importación...")
        
        script_content = f"""#!/bin/bash
set -e

echo "=== Importación de Base de Datos ==="
echo ""

# Backup first
echo "1. Creando backup..."
mysqldump mcqs-jcq > /root/backup_pre_import_$(date +%Y%m%d_%H%M%S).sql 2>&1 || echo "Backup skipped"

# Drop and recreate database
echo "2. Recreando base de datos..."
mysql -e "DROP DATABASE IF EXISTS \`mcqs-jcq\`;" 2>&1 || echo "Drop skipped"
mysql -e "CREATE DATABASE IF NOT EXISTS \`mcqs-jcq\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;" 2>&1

# Import
echo "3. Importando datos (esto puede tomar varios minutos)..."
mysql < {DUMP_FILE} 2>&1

# Verify
echo "4. Verificando..."
mysql -e "USE \`mcqs-jcq\`; SHOW TABLES;" | wc -l

# Show size
echo "5. Tamaño de base de datos:"
du -sh /home/mysql/mcqs@002djcq/

echo ""
echo "✅ Importación COMPLETADA"
"""
        
        # Write script to VPS
        script_path = "/root/import_db.sh"
        stdin, stdout, stderr = ssh.exec_command(f"cat > {script_path} << 'EOFSCRIPT'\n{script_content}\nEOFSCRIPT")
        stdout.channel.recv_exit_status()
        
        # Make executable
        stdin, stdout, stderr = ssh.exec_command(f"chmod +x {script_path}")
        stdout.channel.recv_exit_status()
        
        log("✅ Script creado\n")
        
        # Execute script
        log("Ejecutando importación...\n")
        log("="*80)
        
        stdin, stdout, stderr = ssh.exec_command(f"bash {script_path}")
        
        # Read output in real-time
        for line in stdout:
            print(line.strip())
        
        exit_status = stdout.channel.recv_exit_status()
        
        log("="*80)
        
        if exit_status == 0:
            log("\n✅ IMPORTACIÓN EXITOSA\n")
        else:
            err_output = stderr.read().decode('utf-8', errors='ignore')
            log(f"\n⚠️ Exit status: {exit_status}")
            if err_output:
                log(f"Errores:\n{err_output}\n")
        
        # Final verification
        log("\nVerificación final...")
        
        cmd_verify = """
        echo "Tablas en mcqs-jcq:"
        mysql -e "USE \`mcqs-jcq\`; SHOW TABLES;"
        
        echo ""
        echo "Conteo de registros en tabla principal:"
        mysql -e "USE \`mcqs-jcq\`; SELECT COUNT(*) as total FROM licitaciones_adjudicaciones;" 2>/dev/null || echo "Tabla no encontrada"
        
        echo ""
        echo "Tamaño total:"
        du -sh /home/mysql/mcqs@002djcq/
        """
        
        stdin, stdout, stderr = ssh.exec_command(cmd_verify)
        output = stdout.read().decode('utf-8', errors='ignore')
        log(output)
        
        print("\n" + "="*80)
        print("  ✅ PROCESO FINALIZADO")
        print("="*80 + "\n")
        
        ssh.close()
        
    except Exception as e:
        log(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
