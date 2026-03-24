import paramiko

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('72.61.219.79', username='root', password='Contra159753#')

    script = """
import pymysql
DB_VPS = {'host': '127.0.0.1', 'user': 'mcqs-jcq', 'password': 'mcqs-jcq', 'db': 'mcqs-jcq'}
conn = pymysql.connect(**DB_VPS)
with conn.cursor() as c:
    c.execute("SELECT id_convocatoria, cui, descripcion FROM licitaciones_cabecera WHERE descripcion LIKE '%LP-SM-3-2021-MPP%'")
    rows = c.fetchall()
    for r in rows:
        print(f"ID: {r[0]} | CUI: {r[1]} | DESC: {r[2][:100]}")
conn.close()
"""
    with open('temp_query.py', 'w') as f: f.write(script)
    
    sftp = ssh.open_sftp()
    sftp.put('temp_query.py', '/tmp/temp_query.py')
    sftp.close()
    
    stdin, stdout, stderr = ssh.exec_command('python3 /tmp/temp_query.py')
    print(stdout.read().decode())
    print(stderr.read().decode())
    
    ssh.close()

if __name__ == '__main__':
    main()
