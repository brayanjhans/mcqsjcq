import paramiko
from scp import SCPClient
import os
import sys

# VPS Credentials
HOST = "72.61.219.79"
USER = "root"
PASSWORD = "Contra159753#"
REMOTE_DIR = "/home/admin/public_html/api"
DB_USER = "mcqs-jcq"
DB_PASS = "mcqs-jcq"
DB_NAME = "mcqs-jcq"

files_to_upload = [
    ("licitaciones_raw_vps.py", f"{REMOTE_DIR}/licitaciones_raw_vps.py"),
    ("app/routers/integraciones.py", f"{REMOTE_DIR}/app/routers/integraciones.py"),
    ("app/services/mef_service.py", f"{REMOTE_DIR}/app/services/mef_service.py"),
    ("app/services/mef_ssi_api.py", f"{REMOTE_DIR}/app/services/mef_ssi_api.py"),
]

def create_ssh_client():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD)
    return ssh

def deploy():
    print("Iniciando despliegue de CUI al VPS...")
    ssh = create_ssh_client()
    scp = SCPClient(ssh.get_transport())
    
    # Upload files
    for local_path, remote_path in files_to_upload:
        if os.path.exists(local_path):
            print(f"Subiendo: {local_path} -> {remote_path}")
            scp.put(local_path, remote_path)
        else:
            print(f"ERROR: Archivo local no encontrado: {local_path}")
    scp.close()
    
    # Execute DB migration
    print("Aplicando migración en la base de datos VPS...")
    db_cmd = f"mysql -u {DB_USER} -p'{DB_PASS}' {DB_NAME} -e \"SHOW COLUMNS FROM licitaciones_cabecera LIKE 'cui';\""
    stdin, stdout, stderr = ssh.exec_command(db_cmd)
    res = stdout.read().decode('utf-8')
    if "cui" not in res:
        print("La columna 'cui' no existe. Agregándola...")
        alter_cmd = f"mysql -u {DB_USER} -p'{DB_PASS}' {DB_NAME} -e \"ALTER TABLE licitaciones_cabecera ADD COLUMN cui VARCHAR(15) DEFAULT NULL;\""
        ssh.exec_command(alter_cmd)
        print("Columna 'cui' agregada exitosamente en el VPS.")
    else:
        print("La columna 'cui' ya existe en el VPS.")
        
    # Restart PM2
    print("Reiniciando PM2...")
    ssh.exec_command(f"cd {REMOTE_DIR} && pm2 restart all")
    
    ssh.close()
    print("Despliegue completado! El CUI integration está en vivo.")

if __name__ == "__main__":
    deploy()
