import paramiko
import sys

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def log(msg):
    print(f"[NUKE] {msg}")

def main():
    log("Connecting...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    # 1. Verify file content
    log("Verifying 'tipos_entidad' in licitaciones_raw.py...")
    cmd_grep = "grep -c 'tipos_entidad' /home/admin/repositories/garantias_seacee/app/routers/licitaciones_raw.py"
    stdin, stdout, stderr = ssh.exec_command(cmd_grep)
    count = stdout.read().decode().strip()
    print(f"Match count: {count}")
    
    if count and int(count) > 0:
        log("File IS updated. Proceeding to clear cache.")
    else:
        log("File is NOT updated. Please re-upload.")
        # Optional: We could upload here, but let's just warn.
    
    # 2. Clear PyCache
    log("Deleting __pycache__...")
    ssh.exec_command("rm -rf /home/admin/repositories/garantias_seacee/app/routers/__pycache__")
    ssh.exec_command("rm -rf /home/admin/repositories/garantias_seacee/app/__pycache__") # Just in case
    
    # 3. Restart
    log("Restarting api-mcqs...")
    ssh.exec_command("pm2 restart api-mcqs")
    
    log("Done.")
    ssh.close()

if __name__ == "__main__":
    main()
