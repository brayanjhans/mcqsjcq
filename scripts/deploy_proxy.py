import paramiko

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def log(msg):
    print(f"[PHP-PROXY] {msg}")

def deploy_php_proxy():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    # 1. Upload index.php
    log("Uploading index.php to /home/admin/public_html/...")
    sftp = ssh.open_sftp()
    sftp.put('scripts/index.php', '/home/admin/public_html/index.php')
    sftp.close()
    
    # 2. Update .htaccess to route everything to index.php
    htaccess = """
DirectoryIndex index.php
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]
"""
    log("Updating .htaccess to route to index.php...")
    cmd = f"echo '{htaccess.strip()}' > /home/admin/public_html/.htaccess"
    ssh.exec_command(cmd)
    
    log("PHP Proxy Deployed. Check the site.")
    ssh.close()

if __name__ == "__main__":
    try:
        deploy_php_proxy()
    except Exception as e:
        log(f"Error: {e}")
