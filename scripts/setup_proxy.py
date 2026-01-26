import paramiko

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

HTACCESS_CONTENT = """
DirectoryIndex disabled
RewriteEngine On
RewriteRule ^$ http://127.0.0.1:3000/ [P,L]
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
"""

def log(msg):
    print(f"[PROXY-SETUP] {msg}")

def setup_proxy():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    log(f"Writing .htaccess to /home/admin/public_html/.htaccess...")
    
    # Simple write via echo
    cmd = f"echo '{HTACCESS_CONTENT.strip()}' > /home/admin/public_html/.htaccess"
    ssh.exec_command(cmd)
    
    # Verify
    stdin, stdout, stderr = ssh.exec_command("cat /home/admin/public_html/.htaccess")
    print(stdout.read().decode())
    
    ssh.close()
    log("Proxy configured. Try accessing the site now.")

if __name__ == "__main__":
    try:
        setup_proxy()
    except Exception as e:
        log(f"Error: {e}")
