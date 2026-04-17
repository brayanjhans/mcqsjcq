import paramiko
import select
import time

VPS_HOST = '72.61.219.79'
VPS_USER = 'root'
VPS_PASS = 'Contra159753#'

VPS_SCRIPT = '''
import pymysql, csv

DB = {
    'host': '127.0.0.1', 'user': 'mcqs-jcq', 'password': 'mcqs-jcq',
    'db': 'mcqs-jcq', 'charset': 'utf8mb4', 'autocommit': True
}

def sanitize(v):
    if v in (None, '', 'None', 'NULL', 'null', 'nan', 'NaN'): return None
    return str(v).strip() or None

print('Conectando a MySQL en VPS...')
conn = pymysql.connect(**DB)

# Eliminar la clave unica que causa conflictos (id_contrato SI puede repetirse)
with conn.cursor() as cur:
    for idx in ['uq_contrato_ruc', 'uk_contrato_ruc']:
        try:
            cur.execute(f"ALTER TABLE detalle_consorcios DROP INDEX {idx}")
            print(f"  Indice {idx} eliminado")
        except Exception:
            pass

# Limpiar tabla
with conn.cursor() as cur:
    cur.execute("TRUNCATE TABLE detalle_consorcios")
print("Tabla limpiada.")

# Importar CSV con INSERT IGNORE (salta duplicados sin fallar)
print("Importando CSV...")
with open("/tmp/detalle_consorcios_full.csv", "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    headers = [h for h in reader.fieldnames if h != "id"]
    cols = ", ".join(f"`{h}`" for h in headers)
    placeholders = ", ".join(["%s"] * len(headers))
    sql = f"INSERT IGNORE INTO detalle_consorcios ({cols}) VALUES ({placeholders})"

    batch = []
    total = 0
    skipped = 0
    for row in reader:
        vals = tuple(sanitize(row[h]) for h in headers)
        batch.append(vals)
        if len(batch) >= 2000:
            with conn.cursor() as cur:
                cur.executemany(sql, batch)
                skipped += len(batch) - cur.rowcount
                total += cur.rowcount
            batch = []
            if (total + skipped) % 50000 == 0:
                print(f"  {total} insertadas, {skipped} ignoradas...", flush=True)

    if batch:
        with conn.cursor() as cur:
            cur.executemany(sql, batch)
            skipped += len(batch) - cur.rowcount
            total += cur.rowcount

conn.close()
print(f"IMPORT COMPLETO: {total} filas insertadas, {skipped} ignoradas (duplicados).")
'''

print('Conectando al VPS...')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30)
print('Conectado.')

# Verificar que el CSV ya está en el VPS
stdin, stdout, stderr = ssh.exec_command('ls -lh /tmp/detalle_consorcios_full.csv')
print('CSV en VPS:', stdout.read().decode().strip())

# Subir script corregido
sftp = ssh.open_sftp()
with sftp.open('/tmp/import_consorcios.py', 'w') as f:
    f.write(VPS_SCRIPT)
sftp.close()
print('Script corregido subido. Ejecutando...\n')

# Ejecutar con streaming de output
stdin, stdout, stderr = ssh.exec_command('python3 /tmp/import_consorcios.py', timeout=3600)
stdout.channel.setblocking(0)
start = time.time()
last_print = 0
while not stdout.channel.exit_status_ready():
    r, _, _ = select.select([stdout.channel], [], [], 5)
    if r:
        try:
            chunk = stdout.channel.recv(4096).decode(errors='replace')
            if chunk:
                print(chunk, end='', flush=True)
        except Exception:
            pass
    elapsed = int(time.time() - start)
    if elapsed - last_print >= 30:
        last_print = elapsed
        print(f'  ... {elapsed}s transcurridos', flush=True)
    if elapsed > 3600:
        print('[WARN] Timeout')
        break

rem = stdout.read().decode(errors='replace')
if rem: print(rem, end='')
err = stderr.read().decode(errors='replace')
if err and 'Warning' not in err:
    print('STDERR:', err)

ssh.close()
print('\nListo.')
