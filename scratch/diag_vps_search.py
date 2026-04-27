
import paramiko
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

def check_vps():
    host = "72.61.219.79"
    user = "root"
    password = "Contra159753#"

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, timeout=15)
    
    print("=== TEST 1: Llamar al endpoint de búsqueda ===")
    cmd = "curl -s 'http://localhost:8000/api/licitaciones?search=lean+work&limit=3' | python3 -c \"import sys,json; d=json.load(sys.stdin); print('total:', d.get('total')); print('error:', d.get('error')); print('items:', len(d.get('items',[])))\" 2>&1"
    _, o, e = ssh.exec_command(cmd)
    print(o.read().decode().strip())
    
    print("\n=== TEST 2: Logs recientes del backend ===")
    cmd2 = "pm2 logs api-mcqs --lines 50 --nostream 2>&1 | tail -60"
    _, o2, _ = ssh.exec_command(cmd2)
    print(o2.read().decode().strip())
    
    print("\n=== TEST 3: Verificar índice FULLTEXT en VPS ===")
    cmd3 = "mysql -u mcqs-jcq -p'mcqs-jcq' mcqs-jcq -e \"SHOW INDEX FROM licitaciones_cabecera WHERE Index_type='FULLTEXT'\" 2>/dev/null"
    _, o3, _ = ssh.exec_command(cmd3)
    print(o3.read().decode().strip())
    
    print("\n=== TEST 4: Test directo SQL en VPS ===")
    cmd4 = "mysql -u mcqs-jcq -p'mcqs-jcq' mcqs-jcq -e \"SELECT COUNT(*) FROM licitaciones_cabecera WHERE MATCH(nomenclatura, descripcion, comprador, id_convocatoria, ubicacion_completa) AGAINST('+lean* +work*' IN BOOLEAN MODE)\" 2>/dev/null"
    _, o4, _ = ssh.exec_command(cmd4)
    print(o4.read().decode().strip())
    
    ssh.close()

if __name__ == "__main__":
    check_vps()
