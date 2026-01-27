import paramiko
import sys

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    # Describe
    print("--- DESCRIBE usuarios ---")
    cmd = "mysql -u mcqsjcquser -p'MqsJcq2024#Secure' -D mcqsjcqdb -e 'DESCRIBE usuarios;'"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode())

    # Select All with *
    print("--- SELECT * FROM usuarios LIMIT 5 ---")
    cmd = "mysql -u mcqsjcquser -p'MqsJcq2024#Secure' -D mcqsjcqdb -e 'SELECT * FROM usuarios LIMIT 5;'"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode())
    
    ssh.close()

if __name__ == "__main__":
    main()
