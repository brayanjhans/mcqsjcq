import paramiko
import sys

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

FILES = [
    "/home/admin/repositories/garantias_seacee/.env",
    "/home/mcqs-jcq-front/htdocs/mcqs-jcq.cloud/.env"
]

def main():
    print("Reading credentials via SFTP...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    sftp = ssh.open_sftp()
    
    for remote_file in FILES:
        try:
            print(f"\n--- Checking {remote_file} ---")
            with sftp.open(remote_file, "r") as f:
                content = f.read().decode()
                # Parse loosely
                for line in content.splitlines():
                    if "DATABASE_URL" in line or "DB_" in line:
                         print(line)
        except Exception as e:
            print(f"Error reading {remote_file}: {e}")
            
    sftp.close()
    ssh.close()

if __name__ == "__main__":
    main()
