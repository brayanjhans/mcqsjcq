
"""
Instala httpx en el venv del VPS y ejecuta el sync inicial de Meilisearch.
"""
import paramiko, time

HOST = "72.61.219.79"
USER = "root"
PASS = "Contra159753#"
MEILI_KEY = "MEILI_MCQS_JCQ_2026_SECRET"
APP_DIR = "/home/api-user/htdocs/api.mcqs-jcq.com"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=15)

def run(cmd, timeout=30, show=True):
    _, o, e = ssh.exec_command(cmd, timeout=timeout)
    o.channel.settimeout(timeout)
    out = o.read().decode('utf-8', errors='replace').strip()
    err = e.read().decode('utf-8', errors='replace').strip()
    def sp(s): print(s.encode('ascii', errors='replace').decode('ascii'))
    if show and out: sp(out)
    if show and err and 'warning' not in err.lower() and 'Notice' not in err: sp("[ERR] " + err[:300])
    return out

print("=== Instalando httpx en venv del VPS ===")
result = run(f"cd {APP_DIR} && source venv/bin/activate && pip install httpx -q 2>&1 | tail -3", timeout=60)

print("\n=== Verificando imports ===")
result = run(f"cd {APP_DIR} && source venv/bin/activate && python -c \"import httpx; import meilisearch; print('OK')\" 2>&1")
if "OK" not in result:
    print("httpx OK, meilisearch pkg no necesario (usamos httpx directo)")

print("\n=== Health check Meilisearch ===")
health = run("curl -s http://127.0.0.1:7700/health")
print(f"Health: {health}")

print("\n=== Iniciando SYNC INICIAL (puede tardar 5-15 min) ===")
print("Corriendo en background con nohup...")
sync_cmd = (
    f"cd {APP_DIR} && "
    f"nohup bash -c 'source venv/bin/activate && PYTHONPATH=. python scripts/sync_meilisearch.py > /tmp/meili_sync.log 2>&1' &"
)
run(sync_cmd, timeout=10, show=False)
print("Sync iniciado en background. PID guardado en /tmp/meili_sync.log")
time.sleep(3)

print("\n=== Estado inicial del sync (primeras lineas) ===")
run("head -20 /tmp/meili_sync.log 2>/dev/null || echo 'Log aun vacio...'")

ssh.close()
print("\nSync corriendo en VPS. Verificar con: tail -f /tmp/meili_sync.log")
