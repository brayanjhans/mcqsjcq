import paramiko
import os
import sys

def deploy_fix():
    host = "72.61.219.79"
    user = "root"
    password = "Contra159753#"
    
    local_file = os.path.join(os.path.dirname(__file__), "app", "routers", "integraciones.py")
    remote_file = "/home/admin/public_html/api/app/routers/integraciones.py"
    
    print(f"Deploying local fix from {local_file} to VPS at {host}...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(host, username=user, password=password, timeout=30)
        sftp = ssh.open_sftp()
        
        # Upload the file
        sftp.put(local_file, remote_file)
        print("✅ File uploaded successfully.")
        
        # Restart the backend process using pm2
        print("Restarting backend services via PM2...")
        _, stdout, stderr = ssh.exec_command("pm2 restart all", timeout=30)
        print(f"PM2 OUT:\n{stdout.read().decode()}")
        err = stderr.read().decode()
        if err:
            print(f"PM2 ERR:\n{err}")
            
        print("✅ Deployment complete!")
        
    except Exception as e:
        print(f"❌ Deployment failed: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    deploy_fix()
