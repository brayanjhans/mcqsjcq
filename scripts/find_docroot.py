import paramiko

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def log(msg):
    print(f"[FIND-ROOT] {msg}")

def find_root():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    # 1. Search for generic cPanel user data file
    log("Scanning cPanel userdata...")
    cmd = "grep -r 'documentroot' /var/cpanel/userdata/admin/"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode())
    
    # 2. Search for the domain in httpd.conf (Apache) - often restricted but root can read
    log("Scanning httpd.conf...")
    cmd2 = "grep -i 'DocumentRoot' /etc/apache2/conf/httpd.conf | grep 'mcqs-jcq' | head -n 5"
    stdin, stdout, stderr = ssh.exec_command(cmd2)
    print(stdout.read().decode())

    ssh.close()
    
if __name__ == "__main__":
    find_root()
