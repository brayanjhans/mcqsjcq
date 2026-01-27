import paramiko
import sys

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def log(msg):
    print(f"[PORT-ID] {msg}")

def main():
    log("Identifying process on port 8001...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    # Get PID
    cmd_pid = "lsof -t -i:8001" # or netstat -tulpn | grep 8001
    stdin, stdout, stderr = ssh.exec_command("netstat -tulpn | grep 8001")
    out = stdout.read().decode().strip()
    log(f"Netstat: {out}")
    
    if out:
        # Extract PID (usually last column like 1234/program)
        parts = out.split()
        pid_prog = parts[-1] 
        pid = pid_prog.split('/')[0]
        
        if pid.isdigit():
            log(f"PID: {pid}")
            # Get details
            stdin, stdout, stderr = ssh.exec_command(f"ps -fp {pid}")
            log(f"Process Details:\n{stdout.read().decode()}")
            
            # Check cwd
            stdin, stdout, stderr = ssh.exec_command(f"pwdx {pid}")
            log(f"Process CWD: {stdout.read().decode()}")
        else:
            log("Could not extract PID.")
    else:
        log("No process found on port 8000.")

    ssh.close()

if __name__ == "__main__":
    main()
