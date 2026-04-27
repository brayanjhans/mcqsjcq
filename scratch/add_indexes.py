import paramiko

def add_index():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)
        
        print("Adding BTREE index to id_contrato in licitaciones_adjudicaciones...")
        _, o, e = ssh.exec_command("mysql -u mcqs-jcq -pmcqs-jcq mcqs-jcq -e 'CREATE INDEX idx_id_contrato ON licitaciones_adjudicaciones(id_contrato);'")
        print(o.read().decode())
        print(e.read().decode())
        
        print("Adding BTREE index to id_convocatoria in licitaciones_adjudicaciones...")
        _, o, e = ssh.exec_command("mysql -u mcqs-jcq -pmcqs-jcq mcqs-jcq -e 'CREATE INDEX idx_id_convocatoria ON licitaciones_adjudicaciones(id_convocatoria);'")
        print(o.read().decode())
        print(e.read().decode())
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    add_index()
