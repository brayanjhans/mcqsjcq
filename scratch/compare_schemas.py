import paramiko
import pymysql

# Local Config
LOCAL_DB = {
    'host': 'localhost', 'user': 'root', 'password': '123456789',
    'db': 'mcqs-jcq', 'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

# VPS Config
VPS_HOST = '72.61.219.79'
VPS_SSH_USER = 'root'
VPS_SSH_PASS = 'Contra159753#'
VPS_DB_USER = 'mcqs-jcq'
VPS_DB_PASS = 'mcqs-jcq'
VPS_DB_NAME = 'mcqs-jcq'

def get_remote_columns():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_SSH_USER, password=VPS_SSH_PASS)
    
    cmd = f"mysql -u {VPS_DB_USER} -p'{VPS_DB_PASS}' {VPS_DB_NAME} -e 'SHOW COLUMNS FROM detalle_consorcios'"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    output = stdout.read().decode()
    ssh.close()
    
    cols = []
    if output:
        lines = output.strip().split('\n')
        if len(lines) > 1:
            for line in lines[1:]: # skip header
                parts = line.split('\t')
                if parts: cols.append(parts[0])
    return cols

def get_local_columns():
    conn = pymysql.connect(**LOCAL_DB)
    cols = []
    with conn.cursor() as cur:
        cur.execute("SHOW COLUMNS FROM detalle_consorcios")
        for row in cur.fetchall():
            cols.append(row)
    conn.close()
    return cols

if __name__ == "__main__":
    remote_cols = get_remote_columns()
    local_cols = get_local_columns()
    
    print("--- COMPARACION DE ESQUEMAS ---")
    print(f"Remoto ({len(remote_cols)} columnas): {remote_cols}")
    
    to_add = []
    for lc in local_cols:
        if lc['Field'] not in remote_cols:
            to_add.append(lc)
            
    print(f"\nColumnas a agregar al VPS ({len(to_add)}):")
    for c in to_add:
        print(f"  ALTER TABLE detalle_consorcios ADD COLUMN {c['Field']} {c['Type']};")
