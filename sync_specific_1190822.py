import paramiko
import base64
import json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.61.219.79', username='root', password='Contra159753#', timeout=10)

pyscript = '''
import pymysql
conn = pymysql.connect(host='127.0.0.1', user='mcqs-jcq', password='mcqs-jcq', db='mcqs-jcq')
cur = conn.cursor()
# Update Cabecera
cur.execute("UPDATE licitaciones_cabecera SET estado_proceso='ADJUDICADO' WHERE id_convocatoria='1190822'")
# Insert Adjudicacion (simple fields for now)
adj_sql = "INSERT INTO licitaciones_adjudicaciones (id_adjudicacion, id_convocatoria, ganador_nombre, ganador_ruc, monto_adjudicado, moneda) VALUES (%s, %s, %s, %s, %s, %s) ON DUPLICATE KEY UPDATE ganador_nombre=VALUES(ganador_nombre)"
cur.execute(adj_sql, ('1190822-20607488003', '1190822', 'GRUPO EMPRESARIAL ORFA NEGOCIOS CONSTRUCCIONES & SERVICIOS S.A.C.', '20607488003', 914904.33, 'PEN'))
conn.commit()
conn.close()
print('VPS UPDATED for 1190822')
'''
payload = base64.b64encode(pyscript.encode('utf-8')).decode('utf-8')
cmd = f"python3 -c \"import base64; exec(base64.b64decode('{payload}').decode('utf-8'))\""
_, out, err = ssh.exec_command(cmd)
print(out.read().decode())
print(err.read().decode())
ssh.close()
