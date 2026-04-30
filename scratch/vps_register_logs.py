import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)

# Buscar el error real de la petición de registro
cmd = "pm2 logs api-mcqs --lines 80 --nostream 2>&1 | tail -80"
_, o, e = ssh.exec_command(cmd)
output = o.read().decode()
print(output)
ssh.close()
