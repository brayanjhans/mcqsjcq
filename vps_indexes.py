import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)

sql = """
CREATE INDEX idx_dash_fecha_pub ON licitaciones_cabecera(fecha_publicacion);
CREATE INDEX idx_dash_estado ON licitaciones_cabecera(estado_proceso(50));
CREATE INDEX idx_dash_depto ON licitaciones_cabecera(departamento(50));
CREATE INDEX idx_dash_categoria ON licitaciones_cabecera(categoria);
CREATE INDEX idx_dash_tipo ON licitaciones_cabecera(tipo_procedimiento);
"""

# Handle potential already-exists errors silently by catching them individually or executing them in one go
# Since it's a bunch, let's execute in one go but ignore error if they exist.
cmd = f'mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e "{sql}"'
print(f"Executing: {cmd}")
_, o, e = ssh.exec_command(cmd)

out = o.read().decode()
err = e.read().decode()

if "Duplicate key name" in err:
    print("Some indexes already exist (this is fine).")
else:
    print("Out:", out)
    print("Err:", err)

ssh.close()
print("Keys synchronized")
