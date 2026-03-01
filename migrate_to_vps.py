import paramiko
import os
import time

host = '72.61.219.79'
ssh_user = 'root'
ssh_pass = 'Contra159753#'
local = r'C:\laragon\www\gitc\garantias_seacee\migracion_2020_2026.sql'
remote = '/tmp/migracion_2020_2026.sql'
db_user = 'mcqs-jcq'
db_pass = 'mcqs-jcq'
db_name = 'mcqs-jcq'

print('Conectando al VPS...')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=ssh_user, password=ssh_pass, timeout=30)
print('SSH OK')

fsize = os.path.getsize(local)
print(f'Subiendo {fsize/1024/1024:.1f} MB al VPS...')

sftp = ssh.open_sftp()
start = time.time()
sftp.put(local, remote)
sftp.close()
elapsed = time.time() - start
print(f'Subida completa en {elapsed:.1f} segundos!')

# Verificar tamaño
_, o, _ = ssh.exec_command(f'ls -lh {remote}')
print('Archivo en VPS:', o.read().decode().strip())

# Importar
print('Importando a MySQL... (puede tardar 10-30 minutos)')
import_cmd = f'mysql -u {db_user} -p{db_pass} {db_name} < {remote}'
stdin, stdout, stderr = ssh.exec_command(import_cmd, get_pty=True)
exit_code = stdout.channel.recv_exit_status()
err_out = stderr.read().decode()

if exit_code == 0:
    print('IMPORTACION COMPLETADA EXITOSAMENTE!')
    for t in ['licitaciones_cabecera', 'licitaciones_adjudicaciones', 'detalle_consorcios']:
        _, o2, _ = ssh.exec_command(
            f'mysql -u {db_user} -p{db_pass} {db_name} -e "SELECT COUNT(*) FROM {t}" 2>/dev/null'
        )
        count = o2.read().decode().strip().split('\n')[-1]
        print(f'  {t}: {count} registros')
else:
    print('ERROR en importacion:', err_out[:500])

# Limpiar archivo temporal
ssh.exec_command(f'rm -f {remote}')
print('Archivo temporal eliminado del VPS.')
ssh.close()
print('Migracion completa.')
