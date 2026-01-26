import paramiko

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def log(msg):
    print(f"[GREP-HUNT] {msg}")

def hunt():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    log("Searching for 'INTELIGENCIA SEACE' in /home and /var/www ... (This might take a moment)")
    
    # We search mostly in /home and /var/www to avoid scanning /proc /sys etc
    # grep -r -l "INTELIGENCIA SEACE" /home /var/www 2>/dev/null
    cmd = "grep -r -l 'INTELIGENCIA SEACE' /home /var/www 2>/dev/null | head -n 10"
    
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    # Wait for completion? Grep might be slow.
    # Try reading line by line
    
    # output = stdout.read().decode().strip()
    # print(output)
    
    while not stdout.channel.exit_status_ready():
        if stdout.channel.recv_ready():
            print(stdout.channel.recv(1024).decode(), end="")
            
    print(stdout.read().decode()) # Print remaining
    
    ssh.close()

if __name__ == "__main__":
    try:
        hunt()
    except Exception as e:
        log(f"Error: {e}")
