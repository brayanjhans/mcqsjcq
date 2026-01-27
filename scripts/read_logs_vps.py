import paramiko
import sys

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

FILES = [
    "/root/.pm2/logs/api-mcqs-out.log",
    "/root/.pm2/logs/api-mcqs-error.log"
]

def log(msg):
    print(f"[LOG-READ] {msg}")

def main():
    log("Reading PM2 logs via SFTP...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    sftp = ssh.open_sftp()
    
    for remote_file in FILES:
        try:
            log(f"--- Checking {remote_file} ---")
            # Get size
            attr = sftp.stat(remote_file)
            size = attr.st_size
            
            with sftp.open(remote_file, "r") as f:
                # Read last 2000 bytes
                if size > 2000:
                    f.seek(size - 2000)
                content = f.read().decode(errors='replace')
                print(content)
                print("-----------------------------")
        except Exception as e:
            log(f"Error reading {remote_file}: {e}")
            
    # Also check PM2 status
    log("Checking PM2 status...")
    stdin, stdout, stderr = ssh.exec_command("pm2 status api-mcqs")
    print(stdout.read().decode())
    
    sftp.close()
    ssh.close()

if __name__ == "__main__":
    main()
