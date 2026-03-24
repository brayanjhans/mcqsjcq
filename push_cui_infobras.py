import pymysql
import paramiko
import csv
import os

DB_CONFIG_LOCAL = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456789',
    'db': 'mcqs-jcq',
    'charset': 'utf8mb4'
}

VPS_SSH = {
    'host': '72.61.219.79',
    'user': 'root',
    'pass': 'Contra159753#'
}

def export_table(query, filename):
    conn = pymysql.connect(**DB_CONFIG_LOCAL)
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()
            if not rows:
                with open(filename, 'w') as f: pass
                return 0
            with open(filename, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=rows[0].keys())
                writer.writeheader()
                writer.writerows(rows)
            return len(rows)
    finally:
        conn.close()

def main(cui):
    print(f"1. Obteniendo datos infobras para CUI {cui} localmente...")
    
    q_obras = f"SELECT * FROM infobras_obras WHERE cui = '{cui}'"
    q_vals = f"SELECT * FROM infobras_valorizaciones WHERE cui = '{cui}'"
    
    obras_count = export_table(q_obras, 'tmp_obras.csv')
    vals_count = export_table(q_vals, 'tmp_vals.csv')
    
    print(f"Extracted {obras_count} obras, {vals_count} valorizaciones.")
    if obras_count == 0:
        print("No hay datos de obras para este CUI localmente. Abortando.")
        return
        
    print("2. Subiendo al VPS...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_SSH['host'], username=VPS_SSH['user'], password=VPS_SSH['pass'])
    
    sftp = ssh.open_sftp()
    sftp.put('tmp_obras.csv', '/tmp/tmp_obras.csv')
    sftp.put('tmp_vals.csv', '/tmp/tmp_vals.csv')
    
    script = """
import pymysql, csv, sys
from datetime import datetime

DB_VPS = {
    'host': '127.0.0.1', 'user': 'mcqs-jcq', 'password': 'mcqs-jcq',
    'db': 'mcqs-jcq', 'charset': 'utf8mb4', 'autocommit': True
}
conn = pymysql.connect(**DB_VPS)
def load_csv(path, table, replace_cui=None):
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        if not rows: return
        
        # Eliminar si queremos reemplazar todo para este CUI
        if replace_cui and table == 'infobras_valorizaciones':
            with conn.cursor() as c:
                c.execute("DELETE FROM infobras_valorizaciones WHERE cui=%s", (replace_cui,))
                
        headers = reader.fieldnames
        cols = ",".join([f"`{h}`" for h in headers if h != 'id'])
        placeholders = ",".join(["%s"] * (len(headers) - (1 if 'id' in headers else 0)))
        
        upd = ",".join([f"`{h}`=VALUES(`{h}`)" for h in headers if h != 'id' and h != 'cui'])
        
        q = f"INSERT INTO {table} ({cols}) VALUES ({placeholders}) ON DUPLICATE KEY UPDATE {upd}"
        
        vals = []
        for r in rows:
            v_row = []
            for h in headers:
                if h == 'id': continue
                val = r[h]
                v_row.append(None if val in ('', 'None', 'NULL') else val)
            vals.append(v_row)
            
        with conn.cursor() as c:
            c.executemany(q, vals)

load_csv('/tmp/tmp_obras.csv', 'infobras_obras')
load_csv('/tmp/tmp_vals.csv', 'infobras_valorizaciones', replace_cui='{CUI}')
conn.close()
print('VPS IMPORT SUCCESS')
""".replace('{CUI}', cui)

    with open('remote_import.py', 'w', encoding='utf-8') as f:
        f.write(script)
    sftp.put('remote_import.py', '/tmp/remote_import.py')
    sftp.close()
    
    print("3. Ejecutando actualización en la base de datos remota...")
    sin, sout, serr = ssh.exec_command('python3 /tmp/remote_import.py')
    print("STDOUT:", sout.read().decode())
    print("STDERR:", serr.read().decode())
    
    ssh.close()
    
    for f in ['tmp_obras.csv', 'tmp_vals.csv', 'remote_import.py']:
        try: os.remove(f)
        except: pass
        
    print("Despliegue finalizado.")

if __name__ == "__main__":
    main("2047334")
