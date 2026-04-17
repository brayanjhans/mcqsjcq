import paramiko, select, time

VPS_HOST = '72.61.219.79'
VPS_USER = 'root'
VPS_PASS = 'Contra159753#'

VPS_SCRIPT = """
import pymysql.cursors as _c, pymysql

DB = {'host': '127.0.0.1', 'user': 'mcqs-jcq', 'password': 'mcqs-jcq',
      'db': 'mcqs-jcq', 'charset': 'utf8mb4', 'autocommit': True,
      'cursorclass': _c.DictCursor}

conn = pymysql.connect(**DB)

# 1. Verificar duplicados de (id_contrato, ruc_miembro)
with conn.cursor() as cur:
    cur.execute('''
        SELECT COUNT(*) as total,
               SUM(cnt) - COUNT(*) as duplicados
        FROM (
            SELECT id_contrato, ruc_miembro, COUNT(*) as cnt
            FROM detalle_consorcios
            WHERE id_contrato IS NOT NULL AND ruc_miembro IS NOT NULL
            GROUP BY id_contrato, ruc_miembro
            HAVING COUNT(*) > 1
        ) t
    ''')
    r = cur.fetchone()
    dup_groups = r['total'] or 0
    dup_rows   = r['duplicados'] or 0
    print(f"Grupos duplicados: {dup_groups}, filas extra: {dup_rows}")

# 2. Si hay duplicados, eliminar los extras (conservar el de menor id)
if dup_rows > 0:
    print("Eliminando filas duplicadas (conservando la de menor id)...")
    with conn.cursor() as cur:
        cur.execute('''
            DELETE dc FROM detalle_consorcios dc
            INNER JOIN (
                SELECT MIN(id) as keep_id, id_contrato, ruc_miembro
                FROM detalle_consorcios
                WHERE id_contrato IS NOT NULL AND ruc_miembro IS NOT NULL
                GROUP BY id_contrato, ruc_miembro
                HAVING COUNT(*) > 1
            ) dup ON dc.id_contrato = dup.id_contrato
                  AND dc.ruc_miembro = dup.ruc_miembro
                  AND dc.id != dup.keep_id
        ''')
        deleted = cur.rowcount
    print(f"  {deleted} filas duplicadas eliminadas.")
else:
    print("Sin duplicados. Procediendo a crear la clave unica.")

# 3. Restaurar clave unica
print("Creando clave unica (id_contrato, ruc_miembro)...")
with conn.cursor() as cur:
    try:
        cur.execute('''
            ALTER TABLE detalle_consorcios
            ADD UNIQUE KEY uq_contrato_ruc (id_contrato, ruc_miembro)
        ''')
        print("  Clave unica creada OK.")
    except Exception as e:
        print(f"  Error: {e}")

# 4. Verificacion final
with conn.cursor() as cur:
    cur.execute("SELECT COUNT(*) as c FROM detalle_consorcios")
    total = cur.fetchone()['c']
    print(f"Total filas en tabla: {total}")

conn.close()
print("LISTO.")
"""

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=15)

sftp = ssh.open_sftp()
with sftp.open('/tmp/restore_key.py', 'w') as f:
    f.write(VPS_SCRIPT)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('python3 /tmp/restore_key.py', timeout=300)
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
    if elapsed - last_tick >= 15:
        last_tick = elapsed
        print(f"  ... {elapsed}s", flush=True)

rem = stdout.read().decode(errors='replace')
if rem: print(rem, end='')
err = stderr.read().decode(errors='replace')
if err and 'Warning' not in err: print("STDERR:", err)

ssh.close()
