import paramiko

def full_disk_check():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)

    print("=== df -h (todas las particiones) ===")
    _, o, _ = ssh.exec_command("df -h")
    print(o.read().decode())

    print("=== Uso por directorio en / ===")
    _, o, _ = ssh.exec_command("du -sh /* 2>/dev/null | sort -rh | head -15")
    print(o.read().decode())

    print("=== Estado de mef_ejecucion ===")
    _, o, _ = ssh.exec_command("mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e 'SELECT COUNT(*) as rows FROM mef_ejecucion;'")
    print(o.read().decode())

    print("=== Log reimport (ultimas 10 lineas) ===")
    _, o, _ = ssh.exec_command("tail -10 /root/reimport_output.log 2>/dev/null")
    print(o.read().decode())

    ssh.close()

if __name__ == '__main__':
    full_disk_check()
