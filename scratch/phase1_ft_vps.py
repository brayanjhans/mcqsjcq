
"""
Fase 1 en VPS: Crear índices FULLTEXT en adjudicaciones y consorcios
"""
import paramiko

host     = "72.61.219.79"
user     = "root"
password = "Contra159753#"
db_user  = "mcqs-jcq"
db_pass  = "mcqs-jcq"
db_name  = "mcqs-jcq"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=15)

def mysql(sql, timeout=120):
    cmd = f'mysql -u "{db_user}" -p"{db_pass}" "{db_name}" -e "{sql}" 2>&1'
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    return '\n'.join(l for l in out.splitlines() if 'Warning' not in l)

ops = [
    {
        "name": "FULLTEXT adj (ganador_nombre, ganador_ruc, entidad_financiera)",
        "check": "SELECT COUNT(*) FROM information_schema.STATISTICS WHERE table_schema=database() AND table_name='licitaciones_adjudicaciones' AND index_name='ft_adj_search'",
        "sql": "ALTER TABLE licitaciones_adjudicaciones ADD FULLTEXT INDEX ft_adj_search (ganador_nombre, ganador_ruc, entidad_financiera)"
    },
    {
        "name": "FULLTEXT consorcios (nombre_miembro, ruc_miembro)",
        "check": "SELECT COUNT(*) FROM information_schema.STATISTICS WHERE table_schema=database() AND table_name='detalle_consorcios' AND index_name='ft_cons_search'",
        "sql": "ALTER TABLE detalle_consorcios ADD FULLTEXT INDEX ft_cons_search (nombre_miembro, ruc_miembro)"
    },
]

for op in ops:
    print(f"\n→ {op['name']}")
    # Check if already exists
    exists = mysql(op['check']).strip()
    if exists and exists != '0' and 'COUNT' not in exists:
        print("  ⚠️  Ya existe (skip)")
        continue
    print("  Creando índice... (puede tardar 30-60s en tabla grande)")
    result = mysql(op['sql'], timeout=180)
    if result:
        print(f"  Resultado: {result}")
    else:
        print("  ✅ OK")

print("\n✅ Fase 1 VPS — índices FULLTEXT aplicados")
ssh.close()
