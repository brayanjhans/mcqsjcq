
"""
Instala Meilisearch en el VPS y lo lanza como servicio PM2.
"""
import paramiko, time

HOST = "72.61.219.79"
USER = "root"
PASS = "Contra159753#"
MEILI_KEY = "MEILI_MCQS_JCQ_2026_SECRET"
MEILI_DIR = "/opt/meilisearch"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=15)

def run(cmd, timeout=60, show=True):
    _, o, e = ssh.exec_command(cmd, timeout=timeout)
    o.channel.settimeout(timeout)
    out = o.read().decode('utf-8', errors='replace').strip()
    err = e.read().decode('utf-8', errors='replace').strip()
    def sp(s): print(s.encode('ascii', errors='replace').decode('ascii'))
    if show and out: sp(out)
    if show and err and 'Warning' not in err: sp("[STDERR] " + err)
    return out

print("=== 1. Creando directorio de datos ===")
run(f"mkdir -p {MEILI_DIR}/data")

print("\n=== 2. Verificando si ya existe Meilisearch ===")
existing = run(f"ls {MEILI_DIR}/meilisearch 2>/dev/null || echo 'NOT_FOUND'")
if 'NOT_FOUND' not in existing:
    print("Meilisearch ya existe, saltando descarga")
else:
    print("\n=== 3. Descargando Meilisearch binary ===")
    run(f"curl -sL https://github.com/meilisearch/meilisearch/releases/download/v1.7.6/meilisearch-linux-amd64 -o {MEILI_DIR}/meilisearch", timeout=120)
    run(f"chmod +x {MEILI_DIR}/meilisearch")
    print("Descarga OK")

print("\n=== 4. Verificando versión ===")
run(f"{MEILI_DIR}/meilisearch --version")

print("\n=== 5. Verificando si ya está corriendo en PM2 ===")
pm2_list = run("pm2 list 2>/dev/null | grep meili || echo 'NOT_RUNNING'")
if 'NOT_RUNNING' in pm2_list or 'meili' not in pm2_list:
    print("\n=== 6. Iniciando con PM2 ===")
    start_cmd = (
        f"pm2 start {MEILI_DIR}/meilisearch --name meili -- "
        f"--master-key '{MEILI_KEY}' "
        f"--db-path {MEILI_DIR}/data.ms "
        f"--http-addr 127.0.0.1:7700 "
        f"--env production"
    )
    run(start_cmd, timeout=30)
    run("pm2 save", timeout=15)
    print("Esperando 3s para que arranque...")
    time.sleep(3)
else:
    print("Meilisearch ya está en PM2")

print("\n=== 7. Health check ===")
health = run("curl -s http://127.0.0.1:7700/health 2>/dev/null || echo 'FAILED'")
print(f"Health: {health}")

print("\n=== 8. Estado PM2 ===")
run("pm2 list | grep meili")

ssh.close()
print("\n✅ Meilisearch instalado y corriendo en localhost:7700")
