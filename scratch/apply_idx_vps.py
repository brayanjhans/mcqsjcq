import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)
sql = "CREATE INDEX idx_detalle_consorcios_contrato ON detalle_consorcios(id_contrato);"
print("Ejecutando creacion de indice en VPS...")
_, o, e = ssh.exec_command(f'mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e "{sql}"')
out = o.read().decode()
err = e.read().decode()
if err:
    print(f"Resultado (puede ser warning si ya existe): {err}")
else:
    print(f"Resultado: {out} Indice creado exitosamente.")
ssh.close()
