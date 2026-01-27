import paramiko
import sys

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"
REMOTE_DB = "mcqsjcqdb"
REMOTE_DUMP_PATH = "/home/admin/full_dump.sql"

def log(msg):
    print(f"[IMPORT] {msg}")

def main():
    log("Importing on VPS (Retry)...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    # Quote the password to handle # character
    db_pass = "MqsJcq2024#Secure"
    db_user = "mcqsjcquser"
    
    # Check if dump exists
    stdin, stdout, stderr = ssh.exec_command(f"ls -l {REMOTE_DUMP_PATH}")
    if not stdout.read():
        log("Dump file missing! Please re-migrate.")
        return
        
    log("Dump found. Importing...")
    # Using ' around password
    cmd_import = f"mysql -u {db_user} -p'{db_pass}' -f -D {REMOTE_DB} < {REMOTE_DUMP_PATH}"
    
    stdin, stdout, stderr = ssh.exec_command(cmd_import)
    out = stdout.read().decode()
    err = stderr.read().decode()
    
    if err and "ERROR" in err:
        log(f"Import Errors: {err}")
    else:
        log("Import completed successfully.")
        
    # Verify tables
    log("Verifying table count...")
    cmd_count = f"mysql -u {db_user} -p'{db_pass}' -D {REMOTE_DB} -e 'SELECT count(*) FROM licitaciones_cabecera;'"
    stdin, stdout, stderr = ssh.exec_command(cmd_count)
    print(stdout.read().decode())

    ssh.close()

if __name__ == "__main__":
    main()
