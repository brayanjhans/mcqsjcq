import paramiko

def alter_vps():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('72.61.219.79', username='root', password='Contra159753#')
    print('📦 Cambiando columna CUI a TEXT en el VPS...')
    cmd = "mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e 'ALTER TABLE licitaciones_cabecera MODIFY cui TEXT;'"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    
    if status == 0:
        print("✅ Columna CUI modificada a TEXT con éxito.")
    else:
        print(f"❌ Error al modificar columna: {err}")
    
    ssh.close()

if __name__ == "__main__":
    alter_vps()
