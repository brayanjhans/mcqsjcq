import paramiko
import json

host         = "72.61.219.79"
ssh_user     = "root"
ssh_password = "Contra159753#"
backend_path = "/home/admin/public_html/api"

USUARIOS = [
    {"nombre": "Alisson",  "apellidos": "Tamara",  "id_corporativo": "alisson.tamara",  "password": "Alis#Tam_26"},
    {"nombre": "Zully",    "apellidos": "Barreto", "id_corporativo": "zully.barreto",   "password": "Zull#Bar_26"},
    {"nombre": "Carlos",   "apellidos": "Olaya",   "id_corporativo": "carlos.olaya",    "password": "Carl#Ola_26"},
    {"nombre": "Adriana",  "apellidos": "Poma",    "id_corporativo": "adriana.poma",    "password": "Adri#Pom_26"},
]

usuarios_json = json.dumps(USUARIOS)

# Usamos triple comilla simple para evitar conflictos y NO usamos f-string
# Reemplazamos los placeholders manualmente
remote_script_template = """
import sys, os, json
from datetime import datetime

sys.path.insert(0, 'BACKEND_PATH')

import bcrypt
from dotenv import load_dotenv
load_dotenv('BACKEND_PATH/.env')

from sqlalchemy import create_engine, text

DB_URL = os.getenv('DATABASE_URL')
engine = create_engine(DB_URL)

usuarios = json.loads('USUARIOS_JSON')

with engine.connect() as conn:
    max_id_row = conn.execute(text("SELECT COALESCE(MAX(id), 0) FROM usuarios")).fetchone()
    next_id = max_id_row[0] + 1

    for u in usuarios:
        existing = conn.execute(
            text("SELECT id FROM usuarios WHERE id_corporativo = :ic"),
            {"ic": u["id_corporativo"]}
        ).fetchone()

        if existing:
            print(f"SKIP: {u['id_corporativo']} ya existe")
            continue

        pwd_hash = bcrypt.hashpw(u["password"].encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        conn.execute(
            text("INSERT INTO usuarios (id, id_corporativo, password_hash, nombre, apellidos, perfil, activo, created_at, updated_at) VALUES (:id, :ic, :ph, :nombre, :apellidos, 'COLABORADOR', 1, :now, :now)"),
            {
                "id":        next_id,
                "ic":        u["id_corporativo"],
                "ph":        pwd_hash,
                "nombre":    u["nombre"],
                "apellidos": u["apellidos"],
                "now":       datetime.now()
            }
        )
        print(f"OK: {u['nombre']} {u['apellidos']} (id={next_id}, user={u['id_corporativo']})")
        next_id += 1

    conn.commit()
    print("\\nUsuarios creados correctamente.")
"""

remote_script = remote_script_template.replace('BACKEND_PATH', backend_path).replace('USUARIOS_JSON', usuarios_json)

print("Conectando al VPS...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=ssh_user, password=ssh_password, timeout=15)
print("Conectado!\n")

sftp = ssh.open_sftp()
with sftp.file("/tmp/create_users.py", "w") as f:
    f.write(remote_script)
sftp.close()

venv_python = f"{backend_path}/venv/bin/python"
_, out, err = ssh.exec_command(f"{venv_python} /tmp/create_users.py")
stdout = out.read().decode().strip()
stderr = err.read().decode().strip()

if stdout:
    print(stdout)
if stderr and "DeprecationWarning" not in stderr:
    print("STDERR:", stderr)

ssh.exec_command("rm /tmp/create_users.py")
ssh.close()
