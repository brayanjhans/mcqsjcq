import paramiko

def run_cmd(ssh, cmd, title=None):
    if title: print(f"\n🚀 {title}...")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    while True:
        line = stdout.readline()
        if not line: break
        print(f"   | {line.strip()}")
    err = stderr.read().decode().strip()
    if err:
        if "npm WARN" not in err and "notice" not in err:
            print(f"⚠️ STDERR: {err}")

def deploy():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('72.61.219.79', username='root', password='Contra159753#')
    
    # 1. FRONTEND DEPLOYMENT
    frontend_dir = "/home/admin/repositories/garantias_seacee"
    print(f"\n--- Deploying Frontend at {frontend_dir} ---")
    run_cmd(ssh, f"cd {frontend_dir} && git pull origin main", "Git Pull Frontend")
    run_cmd(ssh, f"cd {frontend_dir}/frontend && npm install --legacy-peer-deps && npm run build", "Build Frontend")
    run_cmd(ssh, "pm2 restart frontend-prod", "Restart PM2 Frontend")

    # 2. BACKEND DEPLOYMENT
    backend_dir = "/home/admin/public_html/api"
    print(f"\n--- Deploying Backend at {backend_dir} ---")
    run_cmd(ssh, f"cd {backend_dir} && git pull origin main", "Git Pull Backend")
    # Backend usually just needs a pull and restart unless there are new requirements
    run_cmd(ssh, "pm2 restart api-mcqs", "Restart PM2 Backend")
    
    ssh.close()
    print("\n✨ DEPLOY FINISHED ✨")

if __name__ == "__main__":
    deploy()
