
import paramiko
import sys

def apply_index_vps():
    host = "72.61.219.79"
    user = "root"
    password = "Contra159753#"

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print("Conectando al VPS para aplicar índice...")
    ssh.connect(host, username=user, password=password, timeout=60)
    
    # SQL Command to add FULLTEXT index
    # We use -e to execute directly
    sql = "ALTER TABLE licitaciones_cabecera ADD FULLTEXT INDEX ft_search (nomenclatura, descripcion, comprador, id_convocatoria, ubicacion_completa)"
    
    print(f"Ejecutando: {sql}")
    # Note: Using root mysql access if possible, or assuming environment is set up
    cmd = f"mysql -u mcqs-jcq -p'mcqs-jcq' mcqs-jcq -e '{sql}'"
    
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=600)
    
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    
    if err:
        print(f"Error/Warning: {err}")
    if out:
        print(f"Output: {out}")
    
    print("Proceso de índice finalizado.")
    ssh.close()

if __name__ == "__main__":
    apply_index_vps()
