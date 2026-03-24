import paramiko

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('72.61.219.79', username='root', password='Contra159753#')

    stdin, stdout, stderr = ssh.exec_command('cat /home/admin/public_html/api/app/routers/licitaciones.py')
    content = stdout.read()
    with open('vps_licitaciones_router.py', 'wb') as f:
        f.write(content)
    
    ssh.close()

if __name__ == '__main__':
    main()
