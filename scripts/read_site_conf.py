import paramiko
import sys

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    stdin, stdout, stderr = ssh.exec_command("cat /etc/nginx/sites-enabled/mcqs-jcq.com.conf")
    print(stdout.read().decode())
    ssh.close()

if __name__ == "__main__":
    main()
