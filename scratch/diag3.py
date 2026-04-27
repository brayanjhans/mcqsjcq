
import paramiko
import sys

host = "72.61.219.79"
user = "root"
password = "Contra159753#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=15)

# Check if the user is accessing the VPS or local
print("=== Test desde fuera (como el usuario lo ve) ===")
_, o, _ = ssh.exec_command("curl -s 'https://mcqs-jcq.cloud/api/licitaciones?search=lean+work&limit=2' | python3 -c \"import sys,json; d=json.load(sys.stdin); print('total:', d.get('total')); print('error:', d.get('error'))\" 2>&1 || echo 'curl falló'")
print(o.read().decode('utf-8', errors='replace').strip())

print("\n=== Test con URL pública ===")
_, o, _ = ssh.exec_command("curl -sk 'https://mcqs-jcq.cloud/api/licitaciones?search=lean+work&limit=1' -o /dev/null -w '%{http_code}' 2>&1")
print("HTTP Status:", o.read().decode().strip())

print("\n=== Verificar si el nginx proxy está pasando bien ===")
_, o, _ = ssh.exec_command("curl -sk 'https://mcqs-jcq.cloud/api/licitaciones?search=consorcio&limit=1' | python3 -c \"import sys,json; d=json.load(sys.stdin); print('total:', d.get('total','N/A'))\" 2>&1")
print(o.read().decode('utf-8', errors='replace').strip())

print("\n=== Check PM2 status ===")
_, o, _ = ssh.exec_command("pm2 status 2>&1 | head -30")
print(o.read().decode('utf-8', errors='replace').strip())

print("\n=== Versión del código en VPS ===")
_, o, _ = ssh.exec_command("cd /home/api-user/htdocs/api.mcqs-jcq.com && git log --oneline -3")
print(o.read().decode('utf-8', errors='replace').strip())

ssh.close()
