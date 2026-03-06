import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.61.219.79', username='root', password='Contra159753#', timeout=15)

_, stdout, stderr = ssh.exec_command('tail -n 100 /root/.pm2/logs/api-mcqs-error.log /root/.pm2/logs/api-mcqs-out.log')

out = stdout.read().decode()
err = stderr.read().decode()

with open('vps_logs.txt', 'w') as f:
    f.write("=== STDOUT ===\n")
    f.write(out)
    f.write("\n=== STDERR ===\n")
    f.write(err)

ssh.close()
