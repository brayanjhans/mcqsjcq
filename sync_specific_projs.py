import pymysql
import paramiko
import csv
import os

DB_LOCAL = {'host': 'localhost', 'user': 'root', 'password': '123456789', 'db': 'mcqs-jcq'}
DB_VPS_CRED = {'host': '127.0.0.1', 'user': 'mcqs-jcq', 'password': 'mcqs-jcq', 'db': 'mcqs-jcq'}

IDS_TO_SYNC = ['637566', '756457']

def export_to_csv(table, ids, filename):
    conn = pymysql.connect(**DB_LOCAL)
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            # Note: id_convocatoria is VARCHAR usually
            cursor.execute(f"SELECT * FROM {table} WHERE id_convocatoria IN ({','.join(['%s']*len(ids))})", ids)
            rows = cursor.fetchall()
            if not rows: return 0
            with open(filename, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=rows[0].keys())
                writer.writeheader()
                writer.writerows(rows)
            return len(rows)
    finally:
        conn.close()

def main():
    print(f"Syncing IDs: {IDS_TO_SYNC}")
    
    # 1. Export
    c_count = export_to_csv('licitaciones_cabecera', IDS_TO_SYNC, 'sync_cab.csv')
    a_count = export_to_csv('licitaciones_adjudicaciones', IDS_TO_SYNC, 'sync_adj.csv')
    print(f"Extracted {c_count} cab, {a_count} adj.")

    # 2. Upload and Import
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('72.61.219.79', username='root', password='Contra159753#')
    
    sftp = ssh.open_sftp()
    sftp.put('sync_cab.csv', '/tmp/sync_cab.csv')
    sftp.put('sync_adj.csv', '/tmp/sync_adj.csv')
    
    import_script = f"""
import pymysql, csv
DB_VPS = {DB_VPS_CRED}
conn = pymysql.connect(**DB_VPS, autocommit=True)

def load(path, table):
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        if not rows: return
        headers = reader.fieldnames
        cols = ",".join([f"`{{h}}`" for h in headers])
        placeholders = ",".join(["%s"] * len(headers))
        upd = ",".join([f"`{{h}}`=VALUES(`{{h}}`)" for h in headers if h != 'id_convocatoria'])
        q = f"INSERT INTO {{table}} ({{cols}}) VALUES ({{placeholders}}) ON DUPLICATE KEY UPDATE {{upd}}"
        vals = [[(None if r[h] in ('', 'None', 'NULL') else r[h]) for h in headers] for r in rows]
        with conn.cursor() as c:
            c.executemany(q, vals)
            print(f"Imported {{len(rows)}} into {{table}}")

load('/tmp/sync_cab.csv', 'licitaciones_cabecera')
load('/tmp/sync_adj.csv', 'licitaciones_adjudicaciones')
conn.close()
"""
    with open('remote_sync.py', 'w') as f: f.write(import_script)
    sftp.put('remote_sync.py', '/tmp/remote_sync.py')
    sftp.close()
    
    stdin, stdout, stderr = ssh.exec_command('python3 /tmp/remote_sync.py')
    print(stdout.read().decode())
    print(stderr.read().decode())
    
    ssh.close()
    
    # Cleanup
    for f in ['sync_cab.csv', 'sync_adj.csv', 'remote_sync.py']:
        try: os.remove(f)
        except: pass

if __name__ == '__main__':
    main()
