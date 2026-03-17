import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)

print("=== Filas por año ===")
_, o, _ = ssh.exec_command(
    'mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e '
    '"SELECT ano_eje, COUNT(*) as filas FROM mef_ejecucion GROUP BY ano_eje ORDER BY ano_eje;"'
)
print(o.read().decode())

print("=== Total filas ===")
_, o2, _ = ssh.exec_command(
    'mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e "SELECT COUNT(*) as total FROM mef_ejecucion;"'
)
print(o2.read().decode())

print("=== Disco final ===")
_, o3, _ = ssh.exec_command("df -h /")
print(o3.read().decode())

print("=== Índice uk_mef_row ===")
_, o4, _ = ssh.exec_command(
    'mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e '
    '"SELECT INDEX_NAME FROM information_schema.STATISTICS '
    "WHERE TABLE_SCHEMA='mcqs-jcq' AND TABLE_NAME='mef_ejecucion' "
    "AND INDEX_NAME='uk_mef_row' LIMIT 1;\""
)
print(o4.read().decode())

print("=== CSVs huerfanos en VPS ===")
_, o5, _ = ssh.exec_command("find /home/admin/public_html/api -name '*.csv' 2>/dev/null")
out = o5.read().decode().strip()
print(out if out else "(ninguno - limpio)")

ssh.close()
