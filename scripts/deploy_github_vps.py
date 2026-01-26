import paramiko
import sys

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

# Suspected paths
PATHS_TO_CHECK = [
    "/home/admin/public_html",
    "/var/www/garantias_seacee",
    "/home/admin/public_html/frontend",
    "/home/admin/repositories/garantias_seacee" # Common cPanel git path
]

def log(msg):
    print(f"[GITHUB-OPS] {msg}")

def run_remote():
    log(f"Connecting to {VPS_HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    found_path = None
    
    # 1. Locate the Git Repo
    log("Searching for active .git repository...")
    for path in PATHS_TO_CHECK:
        stdin, stdout, stderr = ssh.exec_command(f"ls -d {path}/.git")
        if stdout.channel.recv_exit_status() == 0:
            log(f"FOUND Git Repo at: {path}")
            found_path = path
            break
            
    if not found_path:
        log("Could not find a standard .git repo in common paths. Checking active PM2 process...")
        # Check PM2
        stdin, stdout, stderr = ssh.exec_command("pm2 jlist")
        import json
        try:
            output = stdout.read().decode()
            procs = json.loads(output)
            for p in procs:
                if 'seace' in p.get('name', ''):
                    cwd = p.get('pm2_env', {}).get('pm_cwd')
                    log(f"PM2 Process '{p.get('name')}' is running from: {cwd}")
                    # Check if this has git
                    stdin2, stdout2, _ = ssh.exec_command(f"ls -d {cwd}/.git")
                    if stdout2.channel.recv_exit_status() == 0:
                         found_path = cwd
                         log(f"Confirmed Git repo at PM2 path: {cwd}")
                         break
                    # If PM2 path doesn't have git, check parent
                    stdin3, stdout3, _ = ssh.exec_command(f"ls -d {cwd}/../.git")
                    if stdout3.channel.recv_exit_status() == 0:
                         # Normalize
                         found_path = cwd + "/.." # Simply append
                         log(f"Confirmed Git repo at Parent path: {found_path}")
                         break
        except:
            pass

    if found_path:
        log(f"--- EXECUTING GIT PULL in {found_path} ---")
        
        # 2. Git Pull
        # We try strict host checking no to avoid prompt hang, or just accept.
        cmd_pull = f"cd {found_path} && git pull origin main"
        stdin, stdout, stderr = ssh.exec_command(cmd_pull)
        
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        
        if stdout.channel.recv_exit_status() == 0:
            log("Git Pull Successful!")
            print(out)
            
            # 3. Build (Determine if it's the root or frontend)
            # Check if package.json exists in this dir or subdirectory
            stdin, stdout, _ = ssh.exec_command(f"ls {found_path}/package.json")
            if stdout.channel.recv_exit_status() == 0:
                 # It's likely the frontend repo or root with workspaces?
                 # Let's check if 'next' is in package.json
                 stdin, stdout, _ = ssh.exec_command(f"grep 'next' {found_path}/package.json")
                 if stdout.channel.recv_exit_status() == 0:
                     log("Detected Next.js project. Building...")
                     build_cmd = f"cd {found_path} && npm install --legacy-peer-deps && npm run build"
                     log(f"Running: {build_cmd}")
                     stdin, stdout, stderr = ssh.exec_command(build_cmd)
                     # Wait for build
                     while not stdout.channel.exit_status_ready():
                        pass
                     if stdout.channel.recv_exit_status() == 0:
                         log("Build Success.")
                         ssh.exec_command(f"cd {found_path} && pm2 restart seace-frontend || pm2 restart all")
                         log("PM2 Restarted.")
                     else:
                         log("Build Failed.")
                         print(stderr.read().decode())
            else:
                # Check 'frontend' subdir
                stdin, stdout, _ = ssh.exec_command(f"ls {found_path}/frontend/package.json")
                if stdout.channel.recv_exit_status() == 0:
                     log("Detected 'frontend' subdirectory. Building there...")
                     build_cmd = f"cd {found_path}/frontend && npm install --legacy-peer-deps && npm run build"
                     log(f"Running: {build_cmd}")
                     stdin, stdout, stderr = ssh.exec_command(build_cmd)
                     while not stdout.channel.exit_status_ready():
                        pass
                     if stdout.channel.recv_exit_status() == 0:
                         log("Build Success.")
                         ssh.exec_command(f"cd {found_path}/frontend && pm2 restart seace-frontend || pm2 restart all")
                         log("PM2 Restarted.")
                     else:
                         log("Build Failed.")
                         print(stderr.read().decode())
        else:
            log("Git Pull Failed.")
            print(f"Error: {err}")
            print(f"Output: {out}")
            if "Permission denied" in err or "publickey" in err:
                log("HINT: SSH Key not authorized on GitHub for this VPS user.")
    else:
        log("CRITICAL: Could not locate a Git repository on the VPS. Cannot pull.")
        
    ssh.close()

if __name__ == "__main__":
    try:
        run_remote()
    except Exception as e:
        log(f"Error: {e}")
