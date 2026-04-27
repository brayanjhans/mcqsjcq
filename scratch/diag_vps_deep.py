
import paramiko
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

def diag():
    host = "72.61.219.79"
    user = "root"
    password = "Contra159753#"

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, timeout=15)
    
    tests = [
        ("ft_min_word_len del VPS", 
         "mysql -u mcqs-jcq -p'mcqs-jcq' mcqs-jcq -e \"SHOW VARIABLES LIKE 'ft_min_word_len'\" 2>/dev/null"),
        
        ("innodb_ft_min_token_size del VPS (InnoDB)",
         "mysql -u mcqs-jcq -p'mcqs-jcq' mcqs-jcq -e \"SHOW VARIABLES LIKE 'innodb_ft_min_token_size'\" 2>/dev/null"),
        
        ("Tipo de motor de la tabla",
         "mysql -u mcqs-jcq -p'mcqs-jcq' mcqs-jcq -e \"SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA='mcqs-jcq' AND TABLE_NAME='licitaciones_cabecera'\" 2>/dev/null"),
        
        ("COUNT LIKE %lean work% (sin fulltext)",
         "mysql -u mcqs-jcq -p'mcqs-jcq' mcqs-jcq -e \"SELECT COUNT(*) FROM licitaciones_adjudicaciones WHERE ganador_nombre LIKE '%lean work%' OR ganador_nombre LIKE '%LEAN WORK%'\" 2>/dev/null"),
        
        ("Prueba fulltext simple 'lean'",
         "mysql -u mcqs-jcq -p'mcqs-jcq' mcqs-jcq -e \"SELECT COUNT(*) FROM licitaciones_cabecera WHERE MATCH(nomenclatura, descripcion, comprador, id_convocatoria, ubicacion_completa) AGAINST('lean' IN BOOLEAN MODE)\" 2>/dev/null"),
        
        ("Respuesta completa API ?search=lean+work",
         "curl -s 'http://localhost:8000/api/licitaciones?search=lean+work&limit=3'"),
    ]
    
    for label, cmd in tests:
        print(f"\n=== {label} ===")
        _, o, e = ssh.exec_command(cmd)
        out = o.read().decode().strip()
        err = e.read().decode().strip()
        if out: print(out)
        if err and 'Warning' not in err: print(f"ERR: {err}")
    
    ssh.close()

if __name__ == "__main__":
    diag()
