import paramiko
import json
import sys

# VPS Connection
VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

# Domain info
FRONTEND_DOMAIN = "mcqs-jcq.com"
BACKEND_DOMAIN = "api.mcqs-jcq.com"
DB_NAME = "mcqs-jcq"

def log(msg, level="INFO"):
    prefix = {
        "INFO": "ℹ️",
        "SUCCESS": "✅",
        "ERROR": "❌",
        "SECTION": "📋"
    }.get(level, "•")
    print(f"{prefix} {msg}")

def run_cmd(ssh, cmd, description=""):
    """Execute command and return stdout, stderr, exit_status"""
    if description:
        log(description)
    stdin, stdout, stderr = ssh.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='ignore').strip()
    err = stderr.read().decode('utf-8', errors='ignore').strip()
    return out, err, exit_status

def explore_vps():
    log(f"Connecting to VPS: {VPS_HOST}...", "SECTION")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=10)
        log(f"Connected as {VPS_USER}@{VPS_HOST}", "SUCCESS")
        
        # ===== SYSTEM INFO =====
        log("\n=== SYSTEM INFORMATION ===", "SECTION")
        
        out, _, _ = run_cmd(ssh, "uname -a", "OS Version:")
        print(f"  {out}")
        
        out, _, _ = run_cmd(ssh, "cat /etc/os-release | grep PRETTY_NAME", "Distribution:")
        print(f"  {out}")
        
        out, _, _ = run_cmd(ssh, "uptime", "Uptime:")
        print(f"  {out}")
        
        # ===== DIRECTORY STRUCTURE =====
        log("\n=== DIRECTORY STRUCTURE ===", "SECTION")
        
        common_paths = [
            "/root",
            "/home",
            "/home/admin",
            "/home/admin/public_html",
            "/var/www",
            "/usr/share/nginx",
            "/opt"
        ]
        
        for path in common_paths:
            out, _, status = run_cmd(ssh, f"ls -la {path} 2>/dev/null | head -20")
            if status == 0 and out:
                print(f"\n📁 {path}:")
                print(f"  {out[:500]}...")  # Limit output
        
        # ===== GIT REPOSITORIES =====
        log("\n=== GIT REPOSITORIES ===", "SECTION")
        
        out, _, _ = run_cmd(ssh, "find /home /root /var/www -name '.git' -type d 2>/dev/null | head -10")
        if out:
            repos = out.split('\n')
            for repo in repos:
                repo_path = repo.replace('/.git', '')
                print(f"\n📦 Repository: {repo_path}")
                
                # Check remote
                remote_out, _, _ = run_cmd(ssh, f"cd {repo_path} && git remote -v 2>/dev/null")
                if remote_out:
                    print(f"  Remote: {remote_out.split()[1] if remote_out else 'N/A'}")
                
                # Check branch
                branch_out, _, _ = run_cmd(ssh, f"cd {repo_path} && git branch --show-current 2>/dev/null")
                print(f"  Branch: {branch_out or 'N/A'}")
                
                # Check status
                status_out, _, _ = run_cmd(ssh, f"cd {repo_path} && git status -s 2>/dev/null | head -5")
                if status_out:
                    print(f"  Status: {status_out}")
        else:
            log("No Git repositories found", "ERROR")
        
        # ===== PM2 PROCESSES =====
        log("\n=== PM2 PROCESSES ===", "SECTION")
        
        out, err, status = run_cmd(ssh, "pm2 jlist 2>/dev/null")
        if status == 0 and out:
            try:
                processes = json.loads(out)
                for proc in processes:
                    name = proc.get('name', 'unnamed')
                    status = proc.get('pm2_env', {}).get('status', 'unknown')
                    cwd = proc.get('pm2_env', {}).get('pm_cwd', 'N/A')
                    script = proc.get('pm2_env', {}).get('pm_exec_path', 'N/A')
                    port = proc.get('pm2_env', {}).get('env', {}).get('PORT', 'N/A')
                    
                    print(f"\n⚙️  Process: {name}")
                    print(f"  Status: {status}")
                    print(f"  CWD: {cwd}")
                    print(f"  Script: {script}")
                    print(f"  Port: {port}")
            except json.JSONDecodeError:
                print(f"  Raw output: {out[:200]}")
        else:
            log("PM2 not found or no processes running", "ERROR")
        
        # ===== NGINX CONFIGURATION =====
        log("\n=== NGINX CONFIGURATION ===", "SECTION")
        
        out, _, status = run_cmd(ssh, "nginx -v 2>&1")
        if status == 0:
            print(f"  Version: {out}")
            
            # Check site configs
            out, _, _ = run_cmd(ssh, "ls -la /etc/nginx/sites-enabled/ 2>/dev/null")
            if out:
                print(f"\n  Sites enabled:\n{out}")
            
            # Check for our domains
            for domain in [FRONTEND_DOMAIN, BACKEND_DOMAIN]:
                out, _, _ = run_cmd(ssh, f"grep -r '{domain}' /etc/nginx/ 2>/dev/null | head -5")
                if out:
                    print(f"\n  Config for {domain}:")
                    print(f"  {out}")
        else:
            log("Nginx not found, checking Apache...", "INFO")
            out, _, status = run_cmd(ssh, "apache2 -v 2>&1 || httpd -v 2>&1")
            if status == 0:
                print(f"  Apache version: {out}")
        
        # ===== DATABASE =====
        log("\n=== DATABASE CONFIGURATION ===", "SECTION")
        
        out, _, status = run_cmd(ssh, "mysql -V 2>&1")
        if status == 0:
            print(f"  MySQL version: {out}")
            
            # List databases
            out, _, _ = run_cmd(ssh, "mysql -e 'SHOW DATABASES;' 2>/dev/null")
            if out:
                print(f"\n  Databases:\n{out}")
            
            # Check for our database
            out, _, _ = run_cmd(ssh, f"mysql -e 'SHOW TABLES FROM `{DB_NAME}`;' 2>/dev/null | head -20")
            if out:
                print(f"\n  Tables in {DB_NAME}:\n{out}")
        else:
            log("MySQL not accessible", "ERROR")
        
        # ===== NODE.JS & NPM =====
        log("\n=== NODE.JS ENVIRONMENT ===", "SECTION")
        
        out, _, _ = run_cmd(ssh, "node -v 2>&1")
        print(f"  Node version: {out}")
        
        out, _, _ = run_cmd(ssh, "npm -v 2>&1")
        print(f"  NPM version: {out}")
        
        # ===== PYTHON =====
        log("\n=== PYTHON ENVIRONMENT ===", "SECTION")
        
        out, _, _ = run_cmd(ssh, "python3 --version 2>&1")
        print(f"  Python version: {out}")
        
        out, _, _ = run_cmd(ssh, "pip3 --version 2>&1")
        print(f"  Pip version: {out}")
        
        # ===== cPanel Detection =====
        log("\n=== CPANEL DETECTION ===", "SECTION")
        
        out, _, status = run_cmd(ssh, "ls -la /usr/local/cpanel 2>/dev/null | head -5")
        if status == 0:
            log("cPanel detected", "SUCCESS")
            print(f"  {out}")
        else:
            log("cPanel not detected (might be standalone VPS)", "INFO")
        
        log("\n=== EXPLORATION COMPLETE ===", "SUCCESS")
        
    except Exception as e:
        log(f"Connection error: {e}", "ERROR")
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == "__main__":
    explore_vps()
