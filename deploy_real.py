import paramiko

def deploy():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('72.61.219.79', username='root', password='Contra159753#')
    
    root_dir = "/home/admin/public_html/api"
    
    # 1. Pull latest code
    print("\n>> Executing git pull in root directory...")
    cmd_pull = f"cd {root_dir} && git status && git pull"
    _, s_out, s_err = ssh.exec_command(cmd_pull)
    print(f"STDOUT:\n{s_out.read().decode().strip()}")
    print(f"STDERR:\n{s_err.read().decode().strip()}")

    # 2. Build Frontend
    print("\n>> Building Next.js/React frontend...")
    cmd_build = f"cd {root_dir}/frontend && npm install && npm run build"
    _, s_out, s_err = ssh.exec_command(cmd_build)
    out = s_out.read().decode().strip()
    print(f"BUILD STDOUT:\n{out[-2000:] if out else ''}")

    # 3. Restart PM2 Services
    print("\n>> Restarting PM2...")
    _, s_out, _ = ssh.exec_command("pm2 list")
    pm2_list = s_out.read().decode()
    print("PM2 LIST:")
    print(pm2_list)
    
    _, s_out, _ = ssh.exec_command("pm2 restart all")
    print(s_out.read().decode())
    
    ssh.close()
    print("\n>> DEPLOY FINISHED")

if __name__ == "__main__":
    deploy()
