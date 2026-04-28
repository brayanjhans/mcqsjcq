
import paramiko, sys
sys.stdout.reconfigure(errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.61.219.79', username='root', password='Contra159753#', timeout=15)

def run(cmd, timeout=30):
    _, o, _ = ssh.exec_command(cmd, timeout=timeout)
    o.channel.settimeout(timeout)
    return o.read().decode('utf-8', errors='replace').strip()

# Find the app directory by looking for gunicorn / uvicorn config
print("PM2 app list:")
r = run("pm2 info 0 2>/dev/null | grep -E 'script path|root dir|cwd' | head -5")
print(r or "N/A")

print("\nBuscando directorio del backend:")
r2 = run("ls /root/ 2>/dev/null && ls /home/ 2>/dev/null")
print(r2)

r3 = run("find /root /home /srv /opt -name 'licitaciones_raw.py' 2>/dev/null | head -3")
print("Backend en:", r3 or "no encontrado")

r4 = run("cat /root/.pm2/dump.pm2 2>/dev/null | python3 -c \"import sys,json; d=json.load(sys.stdin); [print(p.get('name'), '->', p.get('cwd','?')) for p in d]\" 2>/dev/null || echo 'N/A'")
print("PM2 dirs:", r4)

ssh.close()
