import paramiko
import sys

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

REMOTE_FILE = "/home/admin/repositories/garantias_seacee/.env"

def main():
    print("Updating .env credentials...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    sftp = ssh.open_sftp()
    
    try:
        # Read existing
        with sftp.open(REMOTE_FILE, "r") as f:
            lines = f.readlines()
            
        new_lines = []
        for line in lines:
            if line.strip().startswith("DATABASE_URL="):
                # Replace with correct one (using pymysql driver format)
                new_lines.append("DATABASE_URL=mysql+pymysql://mcqsjcquser:MqsJcq2024#Secure@localhost:3306/mcqsjcqdb\n")
            elif line.strip().startswith("DB_USER="):
                 new_lines.append("DB_USER=mcqsjcquser\n")
            elif line.strip().startswith("DB_PASS="):
                 new_lines.append("DB_PASS=MqsJcq2024#Secure\n")
            elif line.strip().startswith("DB_NAME="):
                 new_lines.append("DB_NAME=mcqsjcqdb\n")
            else:
                new_lines.append(line)
        
        # Write back
        print("Writing updated .env...")
        with sftp.open(REMOTE_FILE, "w") as f:
            f.writelines(new_lines)
            
        print("Updated .env successfully.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        sftp.close()
        ssh.close()

if __name__ == "__main__":
    main()
