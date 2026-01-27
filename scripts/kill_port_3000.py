import paramiko
import sys
import os

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def log(msg):
    print(f"[KILL-PORT] {msg}")

def main():
    log("Resolviendo conflicto de puerto 3000...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    # 1. Find PID on port 3000
    # using lsof or netstat
    # lsof -i :3000 -t
    log("Searching for process on port 3000...")
    stdin, stdout, stderr = ssh.exec_command("lsof -t -i:3000")
    pids = stdout.read().decode().strip().split()
    
    if pids:
        log(f"Found PIDs: {pids}")
        for pid in pids:
            if pid:
                log(f"Killing PID {pid}...")
                ssh.exec_command(f"kill -9 {pid}")
        log("Port 3000 should be free.")
    else:
        log("No process found on port 3000 (via lsof). Trying netstat...")
        # fallback
        stdin, stdout, _ = ssh.exec_command("netstat -nlp | grep :3000")
        out = stdout.read().decode()
        print(out)
        # Parse output manually if needed, usually `killall -9 node` is an option but risky
        if "node" in out or "next" in out:
             # Extract PID logic here is complex in python regex, let's just killall node for safety if authorized? 
             # No, too dangerous for Backend.
             pass

    # 2. Restart PM2 Frontend
    log("Restarting PM2 Frontend...")
    ssh.exec_command("pm2 restart frontend-mcqs")
    
    # 3. Verify
    log("Checking logs...")
    stdin, stdout, _ = ssh.exec_command("pm2 logs frontend-mcqs --lines 20 --nostream")
    logs = stdout.read().decode()
    print(logs)
    
    if "EADDRINUSE" not in logs[-500:]: # Check recent logs
        log("✅ SUCCESS: No address in use error detected recently.")
    else:
        log("⚠️ WARNING: EADDRINUSE still present in logs. Check output.")

    ssh.close()

if __name__ == "__main__":
    main()
