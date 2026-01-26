import paramiko

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def log(msg):
    print(f"[SEARCH] {msg}")

def search():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    log("Searching for any 'BUILD_ID' file (Next.js build marker)...")
    # Search in /home/admin
    cmd = "find /home/admin -name BUILD_ID"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    output = stdout.read().decode().strip()
    print(f"--- BUILD_ID locations ---\n{output}")
    
    log("Searching for 'index.html' (Static roots)...")
    cmd2 = "find /home/admin -maxdepth 4 -name index.html"
    stdin, stdout, stderr = ssh.exec_command(cmd2)
    output2 = stdout.read().decode().strip()
    print(f"--- index.html locations ---\n{output2}")

    ssh.close()

if __name__ == "__main__":
    search()
