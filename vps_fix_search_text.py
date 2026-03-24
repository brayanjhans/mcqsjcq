import paramiko

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('72.61.219.79', username='root', password='Contra159753#')

    script = """
import pymysql
DB_VPS = {'host': '127.0.0.1', 'user': 'mcqs-jcq', 'password': 'mcqs-jcq', 'db': 'mcqs-jcq'}
conn = pymysql.connect(**DB_VPS, autocommit=True)

IDS = ['637566', '756457']

with conn.cursor() as c:
    for id_conv in IDS:
        print(f"Generating search_text for ID: {id_conv}")
        
        # 1. Collect parts
        parts = [id_conv]
        
        # Corrected columns: comprador instead of nombre_entidad
        c.execute("SELECT nomenclatura, descripcion, comprador, cui FROM licitaciones_cabecera WHERE id_convocatoria = %s", (id_conv,))
        row = c.fetchone()
        if row:
            parts.extend([str(x) for x in row if x])
            
        c.execute("SELECT ganador_ruc, ganador_nombre FROM licitaciones_adjudicaciones WHERE id_convocatoria = %s", (id_conv,))
        adjs = c.fetchall()
        for a in adjs:
            parts.extend([str(x) for x in a if x])
            
        # 2. Join and Update
        s_text = " | ".join(sorted(list(set([p.strip() for p in parts if p]))))
        c.execute("UPDATE licitaciones_cabecera SET search_text = %s WHERE id_convocatoria = %s", (s_text, id_conv))
        print(f"Updated search_text for {id_conv} (len={len(s_text)})")

conn.close()
"""
    with open('temp_fix_st.py', 'w') as f: f.write(script)
    
    sftp = ssh.open_sftp()
    sftp.put('temp_fix_st.py', '/tmp/temp_fix_st.py')
    sftp.close()
    
    stdin, stdout, stderr = ssh.exec_command('python3 /tmp/temp_fix_st.py')
    print(stdout.read().decode())
    print(stderr.read().decode())
    
    ssh.close()

if __name__ == '__main__':
    main()
