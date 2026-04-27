import paramiko

def check_vps():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)
        
        # Check Memory
        _, o, _ = ssh.exec_command("free -m")
        print("--- MEMORY ---")
        print(o.read().decode())
        
        # Check CPU
        _, o, _ = ssh.exec_command("top -b -n 1 | head -n 10")
        print("--- CPU ---")
        print(o.read().decode())
        
        # Check API Logs
        _, o, _ = ssh.exec_command("pm2 logs api-mcqs --lines 30 --nostream")
        print("--- API LOGS ---")
        print(o.read().decode())
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    check_vps()
