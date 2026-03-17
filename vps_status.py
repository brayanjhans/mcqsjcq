import paramiko

def status():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)
        
        # Show all mysql client processes
        _, stdout, _ = ssh.exec_command('ps aux | grep mysql | grep -v grep')
        print("=== MySQL processes on VPS ===")
        print(stdout.read().decode())
        
        # Show processlist via mcqs-jcq user
        _, stdout2, _ = ssh.exec_command('mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e "SHOW PROCESSLIST;"')
        print("=== MySQL PROCESSLIST ===")
        print(stdout2.read().decode())
        
        # Current rescue log
        _, stdout3, _ = ssh.exec_command('cat /root/rescue_output.log')
        print("=== RESCUE LOG ===")
        print(stdout3.read().decode())
        
        ssh.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    status()
