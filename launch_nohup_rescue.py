import paramiko
import time

def launch_nohup_rescue():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)
        
        sql_script = """
CREATE TABLE IF NOT EXISTS mef_ejecucion_new LIKE mef_ejecucion;
ALTER TABLE mef_ejecucion_new ADD UNIQUE KEY IF NOT EXISTS uk_mef_row (ano_eje, sec_ejec, producto_proyecto, meta_nombre(200));
INSERT IGNORE INTO mef_ejecucion_new SELECT * FROM mef_ejecucion WHERE ano_eje NOT IN (2025, 2026);
RENAME TABLE mef_ejecucion TO mef_ejecucion_old, mef_ejecucion_new TO mef_ejecucion;
DROP TABLE mef_ejecucion_old;
"""
        shell_script = """#!/bin/bash
echo "START: $(date)" > /root/rescue_output.log
mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq < /root/rescue_table.sql >> /root/rescue_output.log 2>&1
echo "EXIT CODE: $?" >> /root/rescue_output.log
echo "DONE: $(date)" >> /root/rescue_output.log
df -h / >> /root/rescue_output.log
mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e "SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA='mcqs-jcq' AND TABLE_NAME LIKE '%mef%';" >> /root/rescue_output.log 2>&1
"""
        # Upload both files
        sftp = ssh.open_sftp()
        with sftp.file('/root/rescue_table.sql', 'w') as f:
            f.write(sql_script)
        with sftp.file('/root/rescue_table.sh', 'w') as f:
            f.write(shell_script)
        sftp.close()
        print("Files uploaded to VPS.")
        
        # Kill any previous rescue attempt, then launch with nohup detached
        _, stdout, stderr = ssh.exec_command(
            'pkill -f "rescue_table.sql" 2>/dev/null; '
            'chmod +x /root/rescue_table.sh && '
            'nohup /root/rescue_table.sh > /dev/null 2>&1 &'
            'echo "LAUNCHED PID: $!"'
        )
        output = stdout.read().decode()
        print("Launch:", output)
        
        time.sleep(3)
        _, stdout2, _ = ssh.exec_command('ps aux | grep rescue_table | grep -v grep')
        print("Running processes:\n" + stdout2.read().decode())
        
        _, stdout3, _ = ssh.exec_command('cat /root/rescue_output.log 2>/dev/null || echo "Log not yet created"')
        print("Log so far:\n" + stdout3.read().decode())

        ssh.close()
        print("\nDone. Monitor with: tail -f /root/rescue_output.log")
        
    except Exception as e:
        import traceback
        print(f"Error: {e}")
        traceback.print_exc()

if __name__ == '__main__':
    launch_nohup_rescue()
