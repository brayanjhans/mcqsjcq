import os
import sys
import subprocess
import glob

def find_mysql_bin():
    # Common Laragon paths
    paths = glob.glob("C:/laragon/bin/mysql/*/bin")
    if paths:
        return paths[0]
    return None

def main():
    bin_path = find_mysql_bin()
    if not bin_path:
        print("[ERROR] Could not find MySQL bin directory in Laragon.")
        # Fallback: assume in PATH
        mysql = "mysql"
        mysqldump = "mysqldump"
    else:
        print(f"[INFO] Found MySQL bin: {bin_path}")
        mysql = os.path.join(bin_path, "mysql.exe")
        mysqldump = os.path.join(bin_path, "mysqldump.exe")

    source_db = "completodb"
    target_db = "mcqs-jcq"
    user = "root"
    password = "" # Empty for root in local Laragon usually, or 123456789 based on .env

    # Check .env for password
    # Simple parse
    try:
        with open(".env", "r") as f:
            for line in f:
                if line.startswith("DB_PASS="):
                    password = line.strip().split("=")[1]
    except:
        pass

    print(f"[INFO] Migrating {source_db} -> {target_db}...")
    
    dump_file = "migration_dump.sql"
    
    # 1. Dump source
    print("[1/3] Dumping source database...")
    dump_cmd = [mysqldump, "-u", user, f"-p{password}", "--databases", source_db, "--result-file=" + dump_file]
    # Note: --databases includes CREATE DATABASE statement. We might want to skip that to import into a different name.
    # Better: Dump without --databases and just tables.
    dump_cmd = [mysqldump, "-u", user, f"-p{password}", source_db, "--result-file=" + dump_file, "--add-drop-table", "--routines", "--events"]
    
    try:
        subprocess.run(dump_cmd, check=True, shell=True)
        print("[OK] Dump created.")
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Dump failed: {e}")
        return

    # 2. Create target DB if not exists
    print("[2/3] Preparing target database...")
    create_db_sql = f"CREATE DATABASE IF NOT EXISTS `{target_db}`; USE `{target_db}`; "
    # We don't need to drop tables manually if dump has DROP TABLE (it does with --add-drop-table)
    
    # 3. Import
    print("[3/3] Importing into target database...")
    # Use mysql < dump.sql structure
    # But subprocess with stdin is better or shell redirection
    
    # We must ensure we select the target DB first.
    # The dump file doesn't have 'USE target_db' if we didn't use --databases.
    # We can prepend it or use mysql argument.
    
    import_cmd = f'"{mysql}" -u {user} -p{password} {target_db} < {dump_file}'
    
    try:
        # Create DB first just in case
        subprocess.run([mysql, "-u", user, f"-p{password}", "-e", f"CREATE DATABASE IF NOT EXISTS `{target_db}`"], check=True, shell=True)
        
        # Import
        subprocess.run(import_cmd, check=True, shell=True)
        print("[SUCCESS] Migration completed!")
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Import failed: {e}")

if __name__ == "__main__":
    main()
