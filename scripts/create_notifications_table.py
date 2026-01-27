import paramiko
import sys

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    # Check tables
    print("Checking tables...")
    cmd_check = "mysql -u mcqsjcquser -p'MqsJcq2024#Secure' -D mcqsjcqdb -e 'SHOW TABLES;'"
    stdin, stdout, stderr = ssh.exec_command(cmd_check)
    tables = stdout.read().decode()
    print(tables)
    
    if "usuarios" not in tables:
        print("Wait, 'usuarios' table missing? Checking 'users'...")
        # Check if users table exists instead
    
    # Create Table SQL
    # Note: Using IF NOT EXISTS safely
    create_sql = """
    CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('licitacion', 'carta_fianza', 'adjudicacion', 'consorcio', 'reporte', 'sistema') NOT NULL,
        priority ENUM('high', 'medium', 'low') DEFAULT 'low',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(500),
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        extra_data JSON,
        INDEX (user_id),
        INDEX (is_read),
        INDEX (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
    
    # We might need to add FK constraint explicitly if users table is confirmed
    # But let's create table first.
    
    print("Creating notifications table...")
    # Escape quotes for shell
    safe_sql = create_sql.replace("\n", " ")
    cmd_create = f"mysql -u mcqsjcquser -p'MqsJcq2024#Secure' -D mcqsjcqdb -e \"{safe_sql}\""
    
    stdin, stdout, stderr = ssh.exec_command(cmd_create)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out: print(out)
    if err: print(f"Error: {err}")
    
    print("Done.")
    ssh.close()

if __name__ == "__main__":
    main()
