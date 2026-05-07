"""Explorar estructura del VPS para encontrar los paths correctos."""
import paramiko

HOST = "72.61.219.79"
USER = "root"
PASS = "Contra159753#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=15)

def run(cmd):
    _, o, e = ssh.exec_command(cmd, timeout=60)
    out = o.read().decode('utf-8', errors='replace').strip()
    safe = out.encode('ascii', errors='replace').decode('ascii')
    if safe: print(safe)
    return out

print("=== PM2 list ===")
run("pm2 list 2>/dev/null | grep -E 'api|seace|meili|frontend'")

print("\n=== Donde esta el backend (api-mcqs) ===")
run("pm2 show api-mcqs 2>/dev/null | grep -i 'script\\|cwd\\|root'")

print("\n=== Listando /home/admin/public_html/api/scripts/ ===")
run("ls /home/admin/public_html/api/scripts/ 2>/dev/null || echo 'NO EXISTE'")

print("\n=== Listando /home/api-user ===")
run("ls /home/api-user/ 2>/dev/null || echo 'NO EXISTE'")

print("\n=== Buscando sync_meilisearch.py en el sistema ===")
run("find /home -name 'sync_meilisearch.py' 2>/dev/null")

print("\n=== Buscando meili_service.py en el sistema ===")
run("find /home -name 'meili_service.py' 2>/dev/null")

ssh.close()
