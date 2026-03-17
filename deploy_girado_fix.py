import paramiko
import os

def deploy_fix():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)

    local_file = r"c:\laragon\www\gitc\garantias_seacee\app\services\mef_ssi_api.py"
    remote_file = "/home/admin/public_html/api/app/services/mef_ssi_api.py"

    sftp = ssh.open_sftp()
    sftp.put(local_file, remote_file)
    sftp.close()
    print("Archivo subido OK:", remote_file)

    # Restart PM2
    _, stdout, stderr = ssh.exec_command("pm2 restart all && pm2 list")
    out = stdout.read().decode()
    err = stderr.read().decode()
    print("PM2 restart:\n", out)
    if err: print("ERR:", err[:200])

    ssh.close()

if __name__ == '__main__':
    deploy_fix()
