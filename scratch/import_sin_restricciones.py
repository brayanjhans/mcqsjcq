import paramiko, select, time

VPS_HOST = '72.61.219.79'
VPS_USER = 'root'
VPS_PASS = 'Contra159753#'

# Script que corre DIRECTAMENTE en el VPS
VPS_SCRIPT = r"""
import pymysql, csv

import pymysql.cursors as _c
DB = {'host': '127.0.0.1', 'user': 'mcqs-jcq', 'password': 'mcqs-jcq',
      'db': 'mcqs-jcq', 'charset': 'utf8mb4', 'autocommit': True,
      'cursorclass': _c.DictCursor}

conn = pymysql.connect(**DB)

# 1. Eliminar TODOS los indices unicos de la tabla
print("Eliminando indices unicos...")
with conn.cursor() as cur:
    cur.execute("SHOW INDEX FROM detalle_consorcios WHERE Non_unique = 0 AND Key_name != 'PRIMARY'")
    indices = [r['Key_name'] for r in cur.fetchall()]
for idx in indices:
    try:
        with conn.cursor() as cur:
            cur.execute(f"ALTER TABLE detalle_consorcios DROP INDEX `{idx}`")
        print(f"  Indice eliminado: {idx}")
    except Exception as e:
        print(f"  No se pudo eliminar {idx}: {e}")

# 2. Limpiar tabla
with conn.cursor() as cur:
    cur.execute("TRUNCATE TABLE detalle_consorcios")
print("Tabla limpiada (TRUNCATE).")

# 3. INSERT limpio sin restricciones
print("Importando CSV...")
with open('/tmp/detalle_consorcios_full.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    headers = [h for h in reader.fieldnames if h != 'id']
    cols = ', '.join(f'`{h}`' for h in headers)
    ph   = ', '.join(['%s'] * len(headers))
    sql  = f"INSERT INTO detalle_consorcios ({cols}) VALUES ({ph})"

    batch, total = [], 0
    for row in reader:
        v = tuple((str(row[h]).strip() or None) if row[h] not in ('', 'None', 'NULL', 'null') else None
                  for h in headers)
        batch.append(v)
        if len(batch) >= 2000:
            with conn.cursor() as cur:
                cur.executemany(sql, batch)
            total += len(batch)
            batch = []
            if total % 50000 == 0:
                print(f"  {total} filas insertadas...", flush=True)
    if batch:
        with conn.cursor() as cur:
            cur.executemany(sql, batch)
        total += len(batch)

# 4. Verificacion final
with conn.cursor() as cur:
    cur.execute("SELECT COUNT(*) as c FROM detalle_consorcios")
    count = cur.fetchone()['c']
conn.close()
print(f"LISTO: {total} insertadas. Total en tabla: {count}")
"""

print("Conectando al VPS...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30)
print("Conectado.")

# Verificar CSV disponible
stdin, stdout, stderr = ssh.exec_command('ls -lh /tmp/detalle_consorcios_full.csv')
print("CSV en VPS:", stdout.read().decode().strip())

# Subir script
sftp = ssh.open_sftp()
with sftp.open('/tmp/import_clean.py', 'w') as f:
    f.write(VPS_SCRIPT)
sftp.close()
print("Script subido. Ejecutando en VPS...\n")

# Ejecutar con streaming de output
stdin, stdout, stderr = ssh.exec_command('python3 /tmp/import_clean.py', timeout=3600)
stdout.channel.setblocking(0)
start, last_tick = time.time(), 0
while not stdout.channel.exit_status_ready():
    r, _, _ = select.select([stdout.channel], [], [], 5)
    if r:
        try:
            chunk = stdout.channel.recv(4096).decode(errors='replace')
            if chunk: print(chunk, end='', flush=True)
        except: pass
    elapsed = int(time.time() - start)
    if elapsed - last_tick >= 30:
        last_tick = elapsed
        print(f"  ... {elapsed}s", flush=True)
    if elapsed > 3600:
        print("[TIMEOUT]"); break

rem = stdout.read().decode(errors='replace')
if rem: print(rem, end='')
err = stderr.read().decode(errors='replace')
if err and 'Warning' not in err: print("STDERR:", err)

ssh.close()
print("\n=== FIN ===")
