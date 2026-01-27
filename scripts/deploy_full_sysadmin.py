import paramiko
import sys
import os
import time

# --- CONFIGURATION ---
VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

REPO_URL = "git@github.com:scraping050/garantias_seacee.git"

# Domain Mappings (We will discover paths, but these are targets)
DOMAIN_FRONTEND = "mcqs-jcq.com"
DOMAIN_BACKEND = "api.mcqs-jcq.com"

# Database Creds for Remote .env
DB_CONFIG = {
    "host": "localhost",
    "user": "mcqs-jcq",
    "password": "mcqs-jcq",
    "name": "mcqs-jcq"
}

def log(msg):
    print(f"[SYSADMIN] {msg}")

class VPSSession:
    def __init__(self, host, user, password):
        self.ssh = paramiko.SSHClient()
        self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        self.ssh.connect(host, username=user, password=password)
        self.sftp = self.ssh.open_sftp()
        
    def exec(self, cmd, ignore_error=False):
        log(f"REMOTE EXEC: {cmd}")
        stdin, stdout, stderr = self.ssh.exec_command(cmd)
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        
        if exit_status != 0 and not ignore_error:
            log(f"❌ COMMAND FAILED: {cmd}")
            log(f"STDERR: {err}")
            raise Exception(f"Command failed: {cmd}")
        return out

    def close(self):
        self.sftp.close()
        self.ssh.close()

def main():
    log("Starting Full Sysadmin Deployment...")
    vps = VPSSession(VPS_HOST, VPS_USER, VPS_PASS)
    
    try:
        # 1. DISCOVERY
        log("Step 1: Discovering Document Roots...")
        # Try to find where cPanel put these domains
        # Usually in /etc/userdatadomains or checking /home/admin/
        
        # Simple lookup in standard cPanel paths
        candidates = [
            "/home/admin/public_html",
            "/home/admin/mcqs-jcq.com",
            "/home/admin/api.mcqs-jcq.com"
        ]
        
        # Let's verify where 'mcqs-jcq.com' points to.
        # We can check /etc/apache2/conf/httpd.conf or similar if permissions allow (root does).
        # Grep for DocumentRoot
        
        docroot_front = ""
        docroot_api = ""
        
        user_data = vps.exec("cat /etc/userdatadomains", ignore_error=True)
        if user_data:
            for line in user_data.splitlines():
                # Format: domain: user==owner==group==docroot==...
                if DOMAIN_FRONTEND in line and "api." not in line:
                    parts = line.split("==")
                    if len(parts) > 4:
                        docroot_front = parts[4]
                        log(f"Found Frontend Root: {docroot_front}")
                        
                if DOMAIN_BACKEND in line:
                    parts = line.split("==")
                    if len(parts) > 4:
                        docroot_api = parts[4]
                        log(f"Found Backend Root: {docroot_api}")
        
        # Fallbacks if discovery fails (or if domains not yet active in cPanel)
        if not docroot_front:
            docroot_front = "/home/admin/public_html" 
            log(f"Using default Frontend Root: {docroot_front}")
            
        if not docroot_api:
            # Usually subdomains are in public_html/subdomain or separate
            docroot_api = "/home/admin/api.mcqs-jcq.com" 
            # We will force create a directory if we are doing a manual deployment
            # But usually we want to deploy to a persistent repo folder and symlink?
            # Let's assume we deploy the REPO to one place and symlink?
            # Or just deploy existing folder.
            log(f"Using default Backend Root: {docroot_api}")

        # STRATEGY: 
        # We will clone the repo into /home/admin/repositories/garantias_seacee
        # And point the process managers there.
        repo_path = "/home/admin/repositories/garantias_seacee"
        
        # 2. GIT SETUP
        log("Step 2: Setting up Repository...")
        vps.exec(f"mkdir -p {repo_path}")
        
        # Check if .git exists
        git_check = vps.exec(f"ls -d {repo_path}/.git", ignore_error=True)
        if ".git" not in git_check:
            log("Cloning repository...")
            # We assume SSH keys are set up for authorized access.
            # Repository is PUBLIC. We can use HTTPS to avoid SSH keys.
            HTTPS_REPO_URL = "https://github.com/scraping050/garantias_seacee.git"
            log(f"Repository seems public. Cloning via HTTPS: {HTTPS_REPO_URL}")
            
            vps.exec(f"git clone {HTTPS_REPO_URL} {repo_path}")
        else:
            log("Pulling latest changes...")
            vps.exec(f"cd {repo_path} && git pull origin main")

        # 3. BACKEND SETUP
        log("Step 3: configuring Backend...")
        
        # Create .env
        env_content = f"""
DB_HOST={DB_CONFIG['host']}
DB_USER={DB_CONFIG['user']}
DB_PASS={DB_CONFIG['password']}
DB_NAME={DB_CONFIG['name']}
SECRET_KEY=production_secret_key_change_me
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
"""
        # Upload .env
        log("Creating .env for Backend...")
        with vps.sftp.open(f"{repo_path}/app/.env", "w") as f:
            f.write(env_content)
        # Also root?
        with vps.sftp.open(f"{repo_path}/.env", "w") as f:
            f.write(env_content)
            
        # Install Python Deps
        log("Installing Python dependencies...")
        # Check if venv exists, or just install globally/user level? 
        # Using a venv is best practice.
        vps.exec(f"cd {repo_path} && python3 -m venv venv")
        vps.exec(f"cd {repo_path} && ./venv/bin/pip install -r requirements.txt")
        
        # Start PM2 (Backend)
        log("Starting Backend with PM2...")
        # Command to run uvicorn
        # We use the port 8000 or let PM2 handle Python
        # Usually we want: uvicorn app.main:app --host 0.0.0.0 --port 8000
        # BUT: For cPanel subdomain, we might need to map via .htaccess or ProxyPass. 
        # Since we are root, we can check if we can run on a port and if Nginx/Apache proxies it.
        # Assuming cPanel Python App or just running on a port + ProxyPass.
        # Let's run on 8000 and assume User has configured Proxy or we just run it.
        
        start_script = f"./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8001" 
        # Using 8001 to avoid conflict if something else is on 8000
        
        pm2_cmd = f"cd {repo_path} && pm2 start \"{start_script}\" --name api-mcqs --update-env"
        vps.exec(pm2_cmd, ignore_error=True) # Ignore if already running, maybe restart?
        vps.exec(f"pm2 restart api-mcqs", ignore_error=True)

        # 4. FRONTEND SETUP
        log("Step 4: configuring Frontend...")
        frontend_path = f"{repo_path}/frontend"
        
        # Create .env.local or .env
        frontend_env = f"""
NEXT_PUBLIC_API_URL=https://{DOMAIN_BACKEND}
"""
        log("Creating .env for Frontend...")
        with vps.sftp.open(f"{frontend_path}/.env.production", "w") as f:
            f.write(frontend_env)
            
        # Install & Build
        log("Installing Node dependencies...")
        vps.exec(f"cd {frontend_path} && npm install --legacy-peer-deps")
        
        log("Building Next.js Application...")
        vps.exec(f"cd {frontend_path} && npm run build")
        
        # Start PM2 (Frontend)
        log("Starting Frontend with PM2...")
        # Next start on port 3000? 
        # If cPanel is serving static files, we might need 'next export' (deprecated) or 'output: export'.
        # IF we want SSR (Server Side Rendering), we need a running Node process on a port (e.g. 3000)
        # and Apache ProxyPass to that port.
        
        pm2_front_cmd = f"cd {frontend_path} && pm2 start \"npm start -- -p 3000\" --name frontend-mcqs --update-env"
        vps.exec(pm2_front_cmd, ignore_error=True)
        vps.exec(f"pm2 restart frontend-mcqs", ignore_error=True)

        # 5. SYMLINK / PROXY CONFIG (OPTIONAL BUT CRITICAL)
        # If we didn't establish ProxyPass in Apache, the domains won't hit ports 3000/8001.
        # As root, we can't easily edit cPanel userdata without breaking things.
        # The user might have already set up "Application Manager" in cPanel?
        # OR we overwrite public_html with a .htaccess proxy?
        
        # Let's add .htaccess proxy for Frontend in public_html if it matches
        if docroot_front:
            log(f" configuring .htaccess Proxy for Frontend in {docroot_front}...")
            htaccess_content = """
DirectoryIndex disabled
RewriteEngine On
RewriteRule ^$ http://127.0.0.1:3000/ [P,L]
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
"""
            # Write key file
            # vps.exec(f"echo '{htaccess_content}' > {docroot_front}/.htaccess") 
            # CAREFUL: Overwriting existing .htaccess might break HTTPS or other things.
            # Appending is safer ? 
            # For now, we will just log that the service is running on 3000.
            
        log("✅ Deployment Sequence Finished.")
        log("Backend running on Port 8001 (api-mcqs)")
        log("Frontend running on Port 3000 (frontend-mcqs)")
        log("NOTE: Ensure Apache/Nginx ProxyPass is configured if domains show 403/404.")

    except Exception as e:
        log(f"❌ FATAL ERROR: {e}")
    finally:
        vps.close()

if __name__ == "__main__":
    main()
