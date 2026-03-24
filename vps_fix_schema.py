import paramiko

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('72.61.219.79', username='root', password='Contra159753#')

    script = """
import pymysql
DB_VPS = {'host': '127.0.0.1', 'user': 'mcqs-jcq', 'password': 'mcqs-jcq', 'db': 'mcqs-jcq'}
conn = pymysql.connect(**DB_VPS, autocommit=True)
with conn.cursor() as c:
    print("Checking search_text column...")
    c.execute("DESC licitaciones_cabecera")
    cols = [col[0] for col in c.fetchall()]
    if 'search_text' not in cols:
        print("Adding search_text column to licitaciones_cabecera...")
        c.execute("ALTER TABLE licitaciones_cabecera ADD COLUMN search_text LONGTEXT")
        print("Column added.")
    else:
        print("Column already exists.")
conn.close()
"""
    with open('temp_fix.py', 'w') as f: f.write(script)
    
    sftp = ssh.open_sftp()
    sftp.put('temp_fix.py', '/tmp/temp_fix.py')
    sftp.close()
    
    stdin, stdout, stderr = ssh.exec_command('python3 /tmp/temp_fix.py')
    print(stdout.read().decode())
    print(stderr.read().decode())
    
    ssh.close()

if __name__ == '__main__':
    main()
