import paramiko
import os

def deploy():
    local_file = r'c:\laragon\www\gitc\garantias_seacee\app\services\mef_ssi_api.py'
    remote_file = '/home/admin/public_html/api/app/services/mef_ssi_api.py'
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        print(f"Connecting to VPS...")
        ssh.connect('72.61.219.79', username='root', password='Contra159753#', timeout=10)
        
        print(f"Uploading {local_file}...")
        sftp = ssh.open_sftp()
        sftp.put(local_file, remote_file)
        sftp.close()
        print("✅ Upload complete.")
        
        print("Restarting PM2...")
        stdin, stdout, stderr = ssh.exec_command("pm2 restart all")
        print(stdout.read().decode())
        print(stderr.read().decode())
        print("✅ PM2 Restarted.")
        
    finally:
        ssh.close()

if __name__ == "__main__":
    deploy()
