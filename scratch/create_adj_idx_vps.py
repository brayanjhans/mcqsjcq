
import paramiko

host = "72.61.219.79"
user = "root"
password = "Contra159753#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=15)

indexes = [
    "ALTER TABLE licitaciones_adjudicaciones ADD INDEX idx_adj_ganador_nombre (ganador_nombre(100))",
    "ALTER TABLE licitaciones_adjudicaciones ADD INDEX idx_adj_ganador_ruc (ganador_ruc)",
    "ALTER TABLE licitaciones_adjudicaciones ADD INDEX idx_adj_id_convocatoria (id_convocatoria)",
    "ALTER TABLE licitaciones_adjudicaciones ADD INDEX idx_adj_id_contrato (id_contrato)",
]

for sql in indexes:
    cmd = f'mysql -u mcqs-jcq -p"mcqs-jcq" mcqs-jcq -e "{sql}" 2>&1'
    _, o, _ = ssh.exec_command(cmd)
    result = o.read().decode('utf-8', errors='replace').strip()
    clean = '\n'.join(l for l in result.splitlines() if 'Warning' not in l)
    if 'Duplicate key name' in clean:
        print(f"  [YA EXISTE] {sql[:60]}...")
    elif clean:
        print(f"  [ERROR] {clean}")
    else:
        print(f"  [OK] {sql[:60]}...")

ssh.close()
print("Done.")
