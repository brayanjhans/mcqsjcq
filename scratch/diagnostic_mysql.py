import paramiko

def check_mysql():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)
        
        _, o, _ = ssh.exec_command("mysql -u mcqs-jcq -pmcqs-jcq mcqs-jcq -e 'SHOW FULL PROCESSLIST;'")
        print(o.read().decode())
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    check_mysql()
