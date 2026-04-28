
"""
Aplica la nueva configuracion del indice Meilisearch en el VPS y verifica precision.
"""
import paramiko, json

HOST      = "72.61.219.79"
USER      = "root"
PASS      = "Contra159753#"
APP_DIR   = "/home/api-user/htdocs/api.mcqs-jcq.com"
MEILI_KEY = "MEILI_MCQS_JCQ_2026_SECRET"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=15)

def run(cmd, timeout=30):
    _, o, _ = ssh.exec_command(cmd, timeout=timeout)
    o.channel.settimeout(timeout)
    return o.read().decode('utf-8', errors='replace').strip().encode('ascii', errors='replace').decode('ascii')

# Aplicar nueva configuracion via API Meilisearch
settings_payload = json.dumps({
    "searchableAttributes": [
        "ganador_nombre", "ganador_ruc", "nombres_consorciados",
        "nomenclatura", "comprador", "descripcion", "ubicacion_completa"
    ],
    "filterableAttributes": ["estado_proceso", "departamento", "categoria", "tipo_procedimiento", "anio"],
    "sortableAttributes": ["fecha_ts"],
    "rankingRules": ["words", "typo", "proximity", "attribute", "sort", "exactness"],
    "typoTolerance": {"enabled": False}
})

print("=== Actualizando configuracion del indice Meilisearch ===")
r = run(
    f"curl -s -X PATCH http://127.0.0.1:7700/indexes/licitaciones/settings "
    f"-H 'Authorization: Bearer {MEILI_KEY}' "
    f"-H 'Content-Type: application/json' "
    f"-d '{settings_payload}'"
)
print(r[:300])

import time; time.sleep(2)

# Test de precision: lean work
print("\n=== Test: 'lean work' con matchingStrategy=all ===")
r2 = run(
    f"curl -s -X POST http://127.0.0.1:7700/indexes/licitaciones/search "
    f"-H 'Authorization: Bearer {MEILI_KEY}' "
    f"-H 'Content-Type: application/json' "
    f"-d '{{\"q\":\"lean work\",\"limit\":5,\"matchingStrategy\":\"all\",\"attributesToRetrieve\":[\"id_convocatoria\",\"nomenclatura\",\"ganador_nombre\"]}}'"
)
try:
    data = json.loads(r2)
    print(f"  Total hits: {data.get('estimatedTotalHits','?')} (processingTimeMs: {data.get('processingTimeMs','?')}ms)")
    for h in data.get('hits', [])[:3]:
        print(f"  - {h.get('nomenclatura','')} | {h.get('ganador_nombre','')[:40]}")
except Exception:
    print(r2[:300])

# Test de nomenclatura directo en MySQL (via meili_service bypass)
print("\n=== Test: nomenclatura 'CP-ABR-2-2026-IVPL-CS-1' ===")
r3 = run(
    f"cd {APP_DIR} && source venv/bin/activate && PYTHONPATH=. python -c \""
    "from app.services.meili_service import _is_available; "
    "print('Meili available:', _is_available()); "
    "import re; s='CP-ABR-2-2026-IVPL-CS-1'; "
    "is_nom = '-' in s and any(c.isdigit() for c in s) and any(c.isalpha() for c in s); "
    "print('Is nomenclatura (bypasses Meili):', is_nom)"
    "\""
)
print(r3)

ssh.close()
