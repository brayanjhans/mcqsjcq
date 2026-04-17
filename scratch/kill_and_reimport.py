import paramiko
import time

VPS_HOST = '72.61.219.79'
VPS_SSH_USER = 'root'
VPS_SSH_PASS = 'Contra159753#'
VPS_DB_USER = 'mcqs-jcq'
VPS_DB_PASS = 'mcqs-jcq'
VPS_DB_NAME = 'mcqs-jcq'
DATA_SQL = '/tmp/vps_data_only.sql'
LOG_FILE = '/tmp/mysql_import3.log'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_HOST, username=VPS_SSH_USER, password=VPS_SSH_PASS, timeout=15)
print('Conectado al VPS')

# 1. Matar TODOS los procesos mysql cliente (no el servidor mysqld)
print('\n--- Paso 1: Matando todos los procesos mysql cliente ---')
stdin, stdout, stderr = ssh.exec_command('pkill -f "mysql --default-character" && echo "Procesos mysql cliente terminados" || echo "Ningun proceso activo"')
stdout.channel.recv_exit_status()
print(stdout.read().decode().strip())
time.sleep(3)

# Confirmar que no quedan procesos
stdin, stdout, stderr = ssh.exec_command('pgrep -a mysql | grep -v mysqld | grep -v grep || echo "OK: Sin procesos mysql cliente activos"')
print(stdout.read().decode().strip())

# 2. Verificar filas actuales
stdin2, stdout2, stderr2 = ssh.exec_command(f'mysql -u {VPS_DB_USER} -p{VPS_DB_PASS} {VPS_DB_NAME} -N -e "SELECT COUNT(*) FROM detalle_consorcios"')
count = stdout2.read().decode().strip()
print(f'\nFilas actuales en VPS: {count} / 402765')

# 3. Relanzar con UNA SOLA instancia, sin --force para detectar errores reales
print('\n--- Paso 2: Relanzando importacion limpia (1 proceso) ---')
import_cmd = (
    f'nohup sh -c "mysql --default-character-set=utf8mb4 '
    f'-u {VPS_DB_USER} -p{VPS_DB_PASS} {VPS_DB_NAME} < {DATA_SQL} '
    f'> {LOG_FILE} 2>&1; echo DONE:$? >> {LOG_FILE}" > /dev/null 2>&1 &'
)
stdin3, stdout3, stderr3 = ssh.exec_command(import_cmd)
time.sleep(4)

# Verificar proceso iniciado
stdin4, stdout4, stderr4 = ssh.exec_command('pgrep -a mysql | grep -v mysqld | grep -v grep')
proc = stdout4.read().decode().strip()
print(f'Proceso activo: {proc or "Iniciandose..."}')

# Ver inicio del log
stdin5, stdout5, stderr5 = ssh.exec_command(f'head -5 {LOG_FILE} 2>/dev/null || echo "Log vacio - corriendo"')
print(f'Log inicio: {stdout5.read().decode().strip()}')

print('\n¡Listo! Importacion relanzada con 1 solo proceso limpio.')
print(f'Monitorea con: py scratch\\monitor_vps2.py')

ssh.close()
