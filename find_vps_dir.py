
import paramiko

HOST = "72.61.219.79"
USER = "root"
PASS = "Contra159753#"

def main():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(HOST, username=USER, password=PASS)
        
        print("--- Searching for project directories ---")
        
        # Search for common folder names
        commands = [
            "find / -name 'api.mcqs-jcq.com' -type d 2>/dev/null",
            "find / -name 'mcqs-jcq.com' -type d 2>/dev/null",
            "find / -name 'garantias_seacee' -type d 2>/dev/null",
            "ls -la /www/wwwroot 2>/dev/null"
        ]
        
        for cmd in commands:
            print(f"\n[CMD] {cmd}:")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            out = stdout.read().decode().strip()
            if out:
                print(out)
            else:
                print("(No results)")
                
        ssh.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
