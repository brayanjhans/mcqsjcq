import paramiko
import time

def run_on_vps():
    host = "72.61.219.79"
    user = "root"
    password = "Contra159753#"
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, timeout=10)
    
    backend_path = "/home/admin/public_html/api"
    
    # Step 1: Fix AUTO_INCREMENT on VPS table
    print("=" * 60)
    print("STEP 1: Fixing AUTO_INCREMENT on mef_ejecucion table in VPS...")
    print("=" * 60)
    
    fix_cmd = f"""cd {backend_path} && source venv/bin/activate && python3 -c "
from app.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    try:
        conn.execute(text('ALTER TABLE mef_ejecucion MODIFY COLUMN id INT AUTO_INCREMENT PRIMARY KEY;'))
        conn.commit()
        print('SUCCESS: AUTO_INCREMENT added to mef_ejecucion.id')
    except Exception as e:
        if '1068' in str(e) or 'Multiple primary key' in str(e):
            print('PRIMARY KEY already exists, trying just AUTO_INCREMENT...')
            conn.execute(text('ALTER TABLE mef_ejecucion MODIFY COLUMN id INT AUTO_INCREMENT;'))
            conn.commit()
            print('SUCCESS: AUTO_INCREMENT added')
        else:
            print(f'Error: {{e}}')
"
"""
    _, stdout, stderr = ssh.exec_command(fix_cmd, timeout=60)
    print("STDOUT:", stdout.read().decode())
    err = stderr.read().decode()
    if err:
        print("STDERR:", err)
    
    # Step 2: Import MEF data for 2025
    print("\n" + "=" * 60)
    print("STEP 2: Importing MEF CSV 2025 on VPS...")
    print("This may take several minutes for the 2.6GB file...")
    print("=" * 60)
    
    import_cmd = f"cd {backend_path} && source venv/bin/activate && python3 scripts/import_mef_csv.py --year 2025"
    _, stdout, stderr = ssh.exec_command(import_cmd, timeout=600)
    print("STDOUT:", stdout.read().decode())
    err = stderr.read().decode()
    if err:
        print("STDERR:", err[-500:])
    
    # Step 3: Import MEF data for 2024
    print("\n" + "=" * 60)
    print("STEP 3: Importing MEF CSV 2024 on VPS...")
    print("=" * 60)
    
    import_cmd_2024 = f"cd {backend_path} && source venv/bin/activate && python3 scripts/import_mef_csv.py --year 2024"
    _, stdout, stderr = ssh.exec_command(import_cmd_2024, timeout=600)
    print("STDOUT:", stdout.read().decode())
    err = stderr.read().decode()
    if err:
        print("STDERR:", err[-500:])
    
    # Step 4: Import MEF data for 2026
    print("\n" + "=" * 60)
    print("STEP 4: Importing MEF CSV 2026 on VPS...")
    print("=" * 60)
    
    import_cmd_2026 = f"cd {backend_path} && source venv/bin/activate && python3 scripts/import_mef_csv.py --year 2026"
    _, stdout, stderr = ssh.exec_command(import_cmd_2026, timeout=600)
    print("STDOUT:", stdout.read().decode())
    err = stderr.read().decode()
    if err:
        print("STDERR:", err[-500:])
    
    # Step 5: Restart services
    print("\n" + "=" * 60)
    print("STEP 5: Restarting backend services...")
    print("=" * 60)
    
    _, stdout, stderr = ssh.exec_command("pm2 restart all", timeout=30)
    print("STDOUT:", stdout.read().decode())
    
    ssh.close()
    print("\n✅ Deployment complete!")

if __name__ == "__main__":
    run_on_vps()
