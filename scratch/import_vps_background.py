import paramiko
import time

VPS_HOST = '72.61.219.79'
VPS_SSH_USER = 'root'
VPS_SSH_PASS = 'Contra159753#'
VPS_DB_USER = 'mcqs-jcq'
VPS_DB_PASS = 'mcqs-jcq'
VPS_DB_NAME = 'mcqs-jcq'
REMOTE_SQL = '/tmp/vps_deploy.sql'
LOG_FILE = '/tmp/mysql_import.log'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_HOST, username=VPS_SSH_USER, password=VPS_SSH_PASS, timeout=15)
print('Conectado al VPS')

# Borrar log anterior si existe
ssh.exec_command(f'rm -f {LOG_FILE}')
time.sleep(1)

# Lanzar importacion en background con nohup para que no se cancele al cerrar SSH
# Usamos --force para continuar si hay errores menores
# Redirigimos stdout y stderr al log file
import_cmd = (
    f'nohup sh -c "mysql --default-character-set=utf8mb4 --force '
    f'-u {VPS_DB_USER} -p{VPS_DB_PASS} {VPS_DB_NAME} < {REMOTE_SQL} '
    f'> {LOG_FILE} 2>&1; echo EXIT_CODE:$? >> {LOG_FILE}" &'
)

print(f'Lanzando importación en background...')
stdin, stdout, stderr = ssh.exec_command(import_cmd)
time.sleep(3)  # Dar tiempo para que arranque

# Verificar que el proceso está corriendo
stdin2, stdout2, stderr2 = ssh.exec_command('pgrep -a mysql | grep -v mysqld | grep -v grep || echo "Lanzado (puede estar en sub-shell)"')
print('Proceso:', stdout2.read().decode().strip())

# Ver el inicio del log
time.sleep(2)
stdin3, stdout3, stderr3 = ssh.exec_command(f'cat {LOG_FILE} 2>/dev/null || echo "Log aun vacio - proceso arrancando"')
print('Log:', stdout3.read().decode().strip() or '(vacío - corriendo en background)')

print('\n¡Importación lanzada en background en el VPS!')
print(f'Puedes monitorear con: tail -f {LOG_FILE} desde el VPS')
print('Y verificar el conteo de filas periódicamente.')

ssh.close()
