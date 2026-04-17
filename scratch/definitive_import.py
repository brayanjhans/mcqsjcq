import paramiko
import time

VPS_HOST = '72.61.219.79'
VPS_SSH_USER = 'root'
VPS_SSH_PASS = 'Contra159753#'
VPS_DB_USER = 'mcqs-jcq'
VPS_DB_PASS = 'mcqs-jcq'
VPS_DB_NAME = 'mcqs-jcq'
DATA_SQL = '/tmp/vps_data_only.sql'
FINAL_SQL = '/tmp/vps_final.sql'
LOG_FILE = '/tmp/mysql_final.log'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_HOST, username=VPS_SSH_USER, password=VPS_SSH_PASS, timeout=30)
print('Conectado al VPS')

# 1. Matar proceso actual
print('\n--- Paso 1: Deteniendo proceso actual ---')
stdin, stdout, stderr = ssh.exec_command('pkill -f "mysql --default-character" 2>/dev/null; sleep 2; echo OK')
print(stdout.read().decode().strip())

# 2. Eliminar la clave unica que causa deadlocks durante la importacion masiva
print('\n--- Paso 2: Eliminando clave unica temporalmente ---')
drop_key_cmd = (
    f'mysql -u {VPS_DB_USER} -p{VPS_DB_PASS} {VPS_DB_NAME} -e '
    f'"ALTER TABLE detalle_consorcios DROP INDEX IF EXISTS uk_contrato_ruc"'
)
stdin, stdout, stderr = ssh.exec_command(drop_key_cmd)
stdout.channel.recv_exit_status()
err = stderr.read().decode().strip().replace('Warning: Using a password', '').strip()
if err and 'Warning' not in err and err:
    print(f'  [ERR]: {err}')
    # Intentar sin IF EXISTS (MySQL 5.7 compat)
    drop_key_cmd2 = (
        f'mysql -u {VPS_DB_USER} -p{VPS_DB_PASS} {VPS_DB_NAME} -e '
        f'"ALTER TABLE detalle_consorcios DROP INDEX uk_contrato_ruc"'
    )
    stdin, stdout, stderr = ssh.exec_command(drop_key_cmd2)
    stdout.channel.recv_exit_status()
    print(f'  Intento 2: {stderr.read().decode().strip() or "OK"}')
else:
    print('  Clave unica eliminada OK')

# 3. Crear archivo SQL con configuraciones optimas para importacion masiva
print('\n--- Paso 3: Creando SQL optimizado para importacion masiva ---')
header_sql = """SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET AUTOCOMMIT = 0;
"""

# Crear archivo con header + datos
create_cmd = f'echo "{header_sql}" > {FINAL_SQL} && cat {DATA_SQL} >> {FINAL_SQL} && echo "COMMIT;" >> {FINAL_SQL}'
stdin, stdout, stderr = ssh.exec_command(create_cmd)
stdout.channel.recv_exit_status()

# Verificar
stdin, stdout, stderr = ssh.exec_command(f'wc -l {FINAL_SQL}')
lines = stdout.read().decode().strip()
print(f'  Lineas en SQL final: {lines}')

# 4. Lanzar importacion en background con configuracion optima
print('\n--- Paso 4: Lanzando importacion optimizada ---')
import_cmd = (
    f'nohup sh -c "mysql --default-character-set=utf8mb4 '
    f'--init-command=\\"SET SESSION innodb_lock_wait_timeout=300; SET AUTOCOMMIT=0; SET UNIQUE_CHECKS=0; SET FOREIGN_KEY_CHECKS=0;\\" '
    f'-u {VPS_DB_USER} -p{VPS_DB_PASS} {VPS_DB_NAME} < {FINAL_SQL} '
    f'> {LOG_FILE} 2>&1; echo DONE:$? >> {LOG_FILE}" > /dev/null 2>&1 &'
)
stdin, stdout, stderr = ssh.exec_command(import_cmd)
time.sleep(4)

# Verificar proceso
stdin, stdout, stderr = ssh.exec_command('pgrep -a mysql | grep -v mysqld | grep -v grep')
proc = stdout.read().decode().strip()
print(f'  Proceso activo: {proc or "Iniciandose..."}')

# Conteo actual
stdin, stdout, stderr = ssh.exec_command(f'mysql -u {VPS_DB_USER} -p{VPS_DB_PASS} {VPS_DB_NAME} -N -e "SELECT COUNT(*) FROM detalle_consorcios"')
count = stdout.read().decode().strip()
print(f'\n  Filas actuales: {count} / 402765')

print(f'\n¡Importacion optimizada lanzada! Sin deadlocks esperados.')
print(f'Al terminar, la clave unica se debe restaurar manualmente o con el script restore_key.py')

ssh.close()
