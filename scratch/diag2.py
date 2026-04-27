
import paramiko
import sys

host = "72.61.219.79"
user = "root"
password = "Contra159753#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=15)

tests = [
    "SHOW VARIABLES LIKE 'ft_min_word_len'",
    "SHOW VARIABLES LIKE 'innodb_ft_min_token_size'",
    "SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA='mcqs-jcq' AND TABLE_NAME='licitaciones_cabecera'",
    "SELECT COUNT(*) FROM licitaciones_adjudicaciones WHERE ganador_nombre LIKE '%lean work%'",
    "SELECT COUNT(*) FROM licitaciones_cabecera WHERE MATCH(nomenclatura, descripcion, comprador, id_convocatoria, ubicacion_completa) AGAINST('lean' IN BOOLEAN MODE)",
]

for sql in tests:
    cmd = f'mysql -u mcqs-jcq -p"mcqs-jcq" mcqs-jcq -e "{sql}" 2>&1'
    _, o, _ = ssh.exec_command(cmd)
    result = o.read().decode().strip()
    print(f"Q: {sql[:60]}...")
    print(f"R: {result}")
    print()

# Test API
_, o, _ = ssh.exec_command("curl -s 'http://localhost:8000/api/licitaciones?search=lean+work&limit=2'")
api_raw = o.read().decode().strip()
print("API RAW (first 1000 chars):")
print(api_raw[:1000])

ssh.close()
