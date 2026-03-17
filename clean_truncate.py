"""
Script limpio y confiable para:
1. Mostrar el estado real del VPS
2. Matar todas las queries bloqueantes
3. Ejecutar TRUNCATE de forma limpia
4. Verificar que realmente se ejecutó
"""
import paramiko
import time

HOST = "72.61.219.79"
USER = "root"
PASS = "Contra159753#"
DB_USER = "mcqs-jcq"
DB_PASS = "mcqs-jcq"
DB_NAME = "mcqs-jcq"

def run(ssh, cmd, desc=""):
    _, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if desc:
        print(f"\n--- {desc} ---")
    if out: print(out.strip())
    if err and "Warning" not in err: print("ERR:", err.strip())
    return out.strip()

def mysql(ssh, sql, desc=""):
    return run(ssh, f'mysql -u{DB_USER} -p{DB_PASS} {DB_NAME} -e "{sql}"', desc)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=15)

print("=" * 60)
print("PASO 1: Estado real del VPS ahora mismo")
print("=" * 60)
run(ssh, "df -h /", "Disco")
run(ssh, "du -sh /home/mysql/mcqs@002djcq", "Tamaño directorio MySQL")
mysql(ssh, "SELECT TABLE_NAME, TABLE_ROWS, ROUND(DATA_LENGTH/1024/1024/1024,2) AS gb FROM information_schema.TABLES WHERE TABLE_SCHEMA='mcqs-jcq' AND TABLE_NAME='mef_ejecucion';", "Tabla mef_ejecucion")

print("\n" + "=" * 60)
print("PASO 2: Procesos activos en MySQL")
print("=" * 60)
mysql(ssh, "SHOW FULL PROCESSLIST;", "Processlist")

print("\n" + "=" * 60)
print("PASO 3: Matando TODAS las queries activas (excepto esta)")
print("=" * 60)
# Get all query IDs to kill
_, out_ids, _ = ssh.exec_command(
    f'mysql -u{DB_USER} -p{DB_PASS} {DB_NAME} -e '
    '"SELECT ID FROM information_schema.PROCESSLIST WHERE COMMAND=\'Query\' AND ID != CONNECTION_ID();"'
)
ids_output = out_ids.read().decode().strip().split('\n')[1:]  # skip header
ids_to_kill = [i.strip() for i in ids_output if i.strip().isdigit()]
print(f"Queries a matar: {ids_to_kill}")
for qid in ids_to_kill:
    result = mysql(ssh, f"KILL {qid};", f"Kill {qid}")
    print(f"  KILL {qid}: {result or 'OK'}")

time.sleep(2)

print("\n" + "=" * 60)
print("PASO 4: Ejecutando TRUNCATE TABLE mef_ejecucion")
print("=" * 60)
mysql(ssh, "TRUNCATE TABLE mef_ejecucion;", "TRUNCATE")

time.sleep(2)

print("\n" + "=" * 60)
print("PASO 5: Verificación del resultado")
print("=" * 60)
run(ssh, "df -h /", "Disco DESPUÉS de TRUNCATE")
run(ssh, "du -sh /home/mysql/mcqs@002djcq", "Directorio MySQL DESPUÉS")
mysql(ssh, "SELECT COUNT(*) as rows FROM mef_ejecucion;", "Filas en mef_ejecucion (debe ser 0)")
mysql(ssh, "SELECT INDEX_NAME, COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='mcqs-jcq' AND TABLE_NAME='mef_ejecucion' ORDER BY INDEX_NAME;", "Índices en mef_ejecucion")

ssh.close()
print("\n¡Listo!")
