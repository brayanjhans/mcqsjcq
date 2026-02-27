import paramiko
import json

host = "72.61.219.79"
user = "root"
password = "Contra159753#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=10)

_, stdout_jlist, _ = ssh.exec_command("pm2 jlist")
try:
    data = json.loads(stdout_jlist.read().decode())
    for proc in data:
        print(proc.get("name"), "-->", proc.get("pm2_env", {}).get("pm_cwd"))
except Exception as e:
    print("Error parsing JSON:", e)

ssh.close()
