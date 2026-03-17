import paramiko

def count_rows():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)
        
        _, stdout, _ = ssh.exec_command('mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e "SELECT COUNT(*) FROM mef_ejecucion;"')
        print(stdout.read().decode())
        ssh.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    count_rows()
