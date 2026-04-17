import paramiko
import os
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

VPS_HOST = '72.61.219.79'
VPS_SSH_USER = 'root'
VPS_SSH_PASS = 'Contra159753#'
VPS_DB_USER = 'mcqs-jcq'
VPS_DB_PASS = 'mcqs-jcq'
VPS_DB_NAME = 'mcqs-jcq'

LOCAL_FILE = 'vps_deploy.sql'
REMOTE_FILE = '/tmp/vps_deploy.sql'

def deploy():
    if not os.path.exists(LOCAL_FILE):
        logging.error(f"El archivo {LOCAL_FILE} no existe.")
        return

    logging.info("Conectando al VPS...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_SSH_USER, password=VPS_SSH_PASS, timeout=15)
    
    try:
        # 1. Subir archivo vía SFTP
        logging.info(f"Subiendo {LOCAL_FILE} a {REMOTE_FILE} (va SFTP)...")
        sftp = ssh.open_sftp()
        sftp.put(LOCAL_FILE, REMOTE_FILE)
        sftp.close()
        logging.info("Subida completada.")
        
        # 2. Ejecutar importación vía SSH
        # Usamos -f para que continue aunque haya errores menores, y --default-character-set=utf8mb4
        # IMPORTANTE: Escapamos la contrasea si tiene caracteres especiales
        logging.info("Iniciando importacin en MySQL remoto...")
        cmd = f"mysql -u {VPS_DB_USER} -p'{VPS_DB_PASS}' {VPS_DB_NAME} --default-character-set=utf8mb4 < {REMOTE_FILE}"
        
        stdin, stdout, stderr = ssh.exec_command(cmd)
        
        exit_status = stdout.channel.recv_exit_status()
        
        if exit_status == 0:
            logging.info("IMPORTACIN COMPLETADA EXITOSAMENTE.")
        else:
            err = stderr.read().decode()
            logging.error(f"Error durante la importacin (Exit {exit_status}): {err}")
            
    finally:
        ssh.close()
        # logging.info("Conexin SSH cerrada.")

if __name__ == "__main__":
    deploy()
