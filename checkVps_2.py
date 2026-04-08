import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.61.219.79', username='root', password='Contra159753#', timeout=10)
cmd = "python3 -c \"import pymysql; conn=pymysql.connect(host='127.0.0.1', user='mcqs-jcq', password='mcqs-jcq', db='mcqs-jcq'); cur=conn.cursor(); cur.execute('SELECT id_convocatoria, nomenclatura, estado_proceso FROM licitaciones_cabecera WHERE id_convocatoria=1193323'); print(cur.fetchone()); conn.close()\""
_, out, _ = ssh.exec_command(cmd)
print('VPS:', out.read().decode().strip())
ssh.close()
