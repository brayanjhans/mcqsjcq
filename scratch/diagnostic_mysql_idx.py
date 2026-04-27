import paramiko

def check_mysql_indexes():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)
        
        _, o, _ = ssh.exec_command("mysql -u mcqs-jcq -pmcqs-jcq mcqs-jcq -e 'SHOW INDEX FROM licitaciones_adjudicaciones;'")
        print(o.read().decode())
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    check_mysql_indexes()
