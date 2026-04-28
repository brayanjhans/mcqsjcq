
"""
Configura el sync incremental de Meilisearch como cron en PM2 (cada 15 min).
"""
import paramiko, time, json

HOST    = "72.61.219.79"
USER    = "root"
PASS    = "Contra159753#"
APP_DIR = "/home/api-user/htdocs/api.mcqs-jcq.com"
MEILI_KEY = "MEILI_MCQS_JCQ_2026_SECRET"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=15)

def run(cmd, timeout=30):
    _, o, _ = ssh.exec_command(cmd, timeout=timeout)
    o.channel.settimeout(timeout)
    return o.read().decode('utf-8', errors='replace').strip().encode('ascii', errors='replace').decode('ascii')

# 1. Test de busqueda via API
print("=== Test busqueda Meilisearch ===")
test_result = run(
    f"curl -s -X POST http://127.0.0.1:7700/indexes/licitaciones/search "
    f"-H 'Authorization: Bearer {MEILI_KEY}' "
    f"-H 'Content-Type: application/json' "
    f"-d '{{\"q\":\"lean work\",\"limit\":3,\"attributesToRetrieve\":[\"id_convocatoria\",\"nomenclatura\",\"ganador_nombre\"]}}'"
)
print(test_result[:500])

print("\n=== Stats del indice ===")
stats_result = run(
    f"curl -s http://127.0.0.1:7700/indexes/licitaciones/stats "
    f"-H 'Authorization: Bearer {MEILI_KEY}'"
)
import json as jmod
try:
    stats = jmod.loads(stats_result)
    print(f"  Documentos indexados: {stats.get('numberOfDocuments', '?'):,}")
    print(f"  Indexacion activa: {stats.get('isIndexing', '?')}")
except Exception:
    print(stats_result[:300])

# 2. Configurar cron PM2 para sync incremental cada 15 min
print("\n=== Configurando sync periodico (cada 15 min) ===")
pm2_existing = run("pm2 list 2>/dev/null | grep meili-sync || echo 'NOT_FOUND'")
if 'NOT_FOUND' in pm2_existing or 'meili-sync' not in pm2_existing:
    ecosystem_conf = {
        "apps": [{
            "name": "meili-sync",
            "script": f"{APP_DIR}/venv/bin/python",
            "args": f"{APP_DIR}/scripts/sync_meilisearch.py --incremental",
            "cwd": APP_DIR,
            "env": {"PYTHONPATH": APP_DIR},
            "cron_restart": "*/15 * * * *",
            "autorestart": False,
            "watch": False,
            "exec_mode": "fork"
        }]
    }
    conf_json = json.dumps(ecosystem_conf)
    
    # Write ecosystem file
    run(f"echo '{conf_json}' > /tmp/meili_sync_ecosystem.json")
    run(f"cd {APP_DIR} && pm2 start /tmp/meili_sync_ecosystem.json 2>&1 | head -5", timeout=15)
    run("pm2 save 2>&1 | head -3")
    print("Cron PM2 configurado: sync incremental cada 15 min")
else:
    print("meili-sync ya existe en PM2")

print("\n=== PM2 list final ===")
print(run("pm2 list 2>/dev/null | grep -E 'meili|api-mcqs'"))

ssh.close()
