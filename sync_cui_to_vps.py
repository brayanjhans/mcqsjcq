
import paramiko
import os
import time

HOST = "72.61.219.79"
USER = "root"
PASS = "Contra159753#"

def main():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(HOST, username=USER, password=PASS)
        
        print("--- Uploading CUI Updates CSV to VPS ---")
        sftp = ssh.open_sftp()
        local_file = "cui_updates.csv"
        remote_file = "/tmp/cui_updates.csv"
        
        if not os.path.exists(local_file):
            print(f"Error: {local_file} not found. Run universal_cui_backfill.py first.")
            return

        sftp.put(local_file, remote_file)
        sftp.close()
        print(f"✅ Uploaded to {remote_file}")

        # Import script on VPS
        import_script = """
import pymysql
import csv
import os

DB_CONFIG = {
    'host': 'localhost',
    'user': 'mcqs-jcq',
    'password': 'mcqs-jcq',
    'db': 'mcqs-jcq',
    'charset': 'utf8mb4'
}

def run_import():
    try:
        conn = pymysql.connect(**DB_CONFIG)
        with conn.cursor() as cursor:
            # Create temp table with matching collation
            cursor.execute("DROP TEMPORARY TABLE IF EXISTS tmp_cui_updates")
            cursor.execute("CREATE TEMPORARY TABLE tmp_cui_updates (id_conv VARCHAR(50), cui TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci)")
            
            print("Reading CSV...")
            with open('/tmp/cui_updates.csv', 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                next(reader) # skip header
                data = list(reader)
            
            print(f"Inserting {len(data)} rows into temp table in batches...")
            batch_size = 5000
            for i in range(0, len(data), batch_size):
                batch = data[i:i+batch_size]
                cursor.executemany("INSERT INTO tmp_cui_updates VALUES (%s, %s)", batch)
                conn.commit()
                print(f"   📊 Progress: {min(i+batch_size, len(data))} / {len(data)}")
            
            print("Updating main table (forcing collation match)...")
            cursor.execute(\"\"\"
                UPDATE licitaciones_cabecera l
                JOIN tmp_cui_updates t ON l.id_convocatoria = t.id_conv COLLATE utf8mb4_general_ci
                SET l.cui = t.cui COLLATE utf8mb4_general_ci
            \"\"\")
            conn.commit()
            print(f"✅ Updated {cursor.rowcount} rows in main table.")
        conn.close()
    except Exception as e:
        print(f"ERROR inside VPS script: {e}")

if __name__ == '__main__':
    run_import()
"""
        # Save and run import script on VPS
        print("--- Executing Import on VPS ---")
        ssh.exec_command("echo '" + import_script.replace("'", "'\\''") + "' > /tmp/import_cui_updates.py")
        stdin, stdout, stderr = ssh.exec_command("python3 /tmp/import_cui_updates.py")
        
        print(stdout.read().decode())
        err = stderr.read().decode()
        if err: print(f"ERR: {err}")
        
        ssh.close()
        print("--- SYNC FINISHED ---")

    except Exception as e:
        print(f"Fatal Error: {e}")

if __name__ == "__main__":
    main()
