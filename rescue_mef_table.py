import paramiko
import time

def rescue_mef_table():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)
        
        sql_script = """
DROP TABLE IF EXISTS mef_ejecucion_new;
CREATE TABLE mef_ejecucion_new LIKE mef_ejecucion;
ALTER TABLE mef_ejecucion_new ADD UNIQUE KEY uk_mef_row (ano_eje, sec_ejec, producto_proyecto, meta_nombre(200));
INSERT IGNORE INTO mef_ejecucion_new SELECT * FROM mef_ejecucion WHERE ano_eje NOT IN (2025, 2026);
RENAME TABLE mef_ejecucion TO mef_ejecucion_old, mef_ejecucion_new TO mef_ejecucion;
DROP TABLE mef_ejecucion_old;
SELECT ano_eje, count(*) as count FROM mef_ejecucion GROUP BY ano_eje;
"""
        
        # Write sql file to remote
        sftp = ssh.open_sftp()
        with sftp.file('rescue_table.sql', 'w') as f:
            f.write(sql_script)
        sftp.close()
        
        print("Iniciando la cirugía en MySQL. Esto tomará un par de minutos dependiendo de las filas extraídas...")
        stdin, stdout, stderr = ssh.exec_command('mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq < rescue_table.sql && df -h /')
        
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        
        print("\n===== RESULTADOS =====")
        print(output)
        if error:
            print("ERRORES:\n" + error)
            
        ssh.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    rescue_mef_table()
