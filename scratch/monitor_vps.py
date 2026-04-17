import paramiko
import time

VPS_HOST = '72.61.219.79'
VPS_SSH_USER = 'root'
VPS_SSH_PASS = 'Contra159753#'
VPS_DB_USER = 'mcqs-jcq'
VPS_DB_PASS = 'mcqs-jcq'
VPS_DB_NAME = 'mcqs-jcq'
LOG_FILE = '/tmp/mysql_import2.log'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_HOST, username=VPS_SSH_USER, password=VPS_SSH_PASS, timeout=15)

# Verificar proceso activo
stdin, stdout, stderr = ssh.exec_command('pgrep -a mysql | grep -v mysqld | grep -v grep || echo "SIN_PROCESO_ACTIVO"')
proc = stdout.read().decode().strip()
print(f'Proceso MySQL activo: {proc}')

# Contar filas actuales
stdin2, stdout2, stderr2 = ssh.exec_command(f'mysql -u {VPS_DB_USER} -p{VPS_DB_PASS} {VPS_DB_NAME} -N -e "SELECT COUNT(*) FROM detalle_consorcios"')
count = stdout2.read().decode().strip()
print(f'Filas actuales en VPS: {count} / 402765')

# Revisar log
stdin3, stdout3, stderr3 = ssh.exec_command(f'tail -5 {LOG_FILE} 2>/dev/null || echo "Log vacio"')
log = stdout3.read().decode().strip()
print(f'Ultimo log: {log}')

# Determinar estado
if count == '402765':
    print('\n¡IMPORTACION COMPLETADA! El VPS tiene todos los datos.')
elif 'IMPORT_DONE' in log:
    print(f'\nImportacion finalizada (puede haber errores). Log completo:')
    stdin4, stdout4, _ = ssh.exec_command(f'cat {LOG_FILE}')
    print(stdout4.read().decode())
else:
    pct = round(int(count)/402765*100, 1) if count.isdigit() else '?'
    print(f'\nEn progreso: {pct}% completado. El proceso corre en background en el VPS.')

ssh.close()
