import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)

# Ver el error log de PM2
cmd = "cat /root/.pm2/logs/api-mcqs-error.log | tail -100"
_, o, e = ssh.exec_command(cmd)
output = o.read().decode()
print("=== ERROR LOG ===")
print(output[-3000:])  # ultimos 3000 chars
ssh.close()
