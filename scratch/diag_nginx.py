
import paramiko

host = "72.61.219.79"
user = "root"  
password = "Contra159753#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=15)

print("=== Config Nginx relevante ===")
_, o, _ = ssh.exec_command("grep -r 'proxy_read_timeout\\|proxy_connect_timeout\\|proxy_send_timeout\\|timeout' /etc/nginx/sites-enabled/ 2>/dev/null || grep -r 'timeout' /etc/nginx/conf.d/ 2>/dev/null")
print(o.read().decode('utf-8', errors='replace').strip())

print("\n=== Archivos nginx activos ===")
_, o, _ = ssh.exec_command("ls /etc/nginx/sites-enabled/ 2>/dev/null; ls /etc/nginx/conf.d/ 2>/dev/null")
print(o.read().decode('utf-8', errors='replace').strip())

print("\n=== Config del sitio mcqs ===")
_, o, _ = ssh.exec_command("cat /etc/nginx/sites-enabled/* 2>/dev/null | head -80 || cat /etc/nginx/conf.d/*.conf 2>/dev/null | head -80")
print(o.read().decode('utf-8', errors='replace').strip())

ssh.close()
