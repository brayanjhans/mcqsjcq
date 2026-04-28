
import paramiko, time
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.61.219.79', username='root', password='Contra159753#', timeout=15)

def run(cmd, timeout=15):
    _, o, _ = ssh.exec_command(cmd, timeout=timeout)
    o.channel.settimeout(timeout)
    return o.read().decode('utf-8', errors='replace').strip().encode('ascii', errors='replace').decode('ascii')

print("=== LOG sync ===")
print(run("cat /tmp/meili_sync.log 2>/dev/null | tail -30"))

print("\n=== PIDs activos ===")
print(run("pgrep -f sync_meilisearch | wc -l"))

print("\n=== Stats Meilisearch ===")
print(run("curl -s http://127.0.0.1:7700/indexes/licitaciones/stats 2>/dev/null || echo 'sin indice'"))

print("\n=== Memoria usada por Meilisearch ===")
print(run("ps -o pid,rss,comm -p $(pgrep meilisearch) 2>/dev/null || echo 'n/a'"))

ssh.close()
