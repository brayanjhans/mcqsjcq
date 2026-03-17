import paramiko
import time

def launch_rescue():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)
        
        sql_script = (
            "CREATE TABLE IF NOT EXISTS mef_ejecucion_new LIKE mef_ejecucion;\n"
            "ALTER TABLE mef_ejecucion_new ADD UNIQUE KEY IF NOT EXISTS uk_mef_row "
            "(ano_eje, sec_ejec, producto_proyecto, meta_nombre(200));\n"
            "INSERT IGNORE INTO mef_ejecucion_new "
            "SELECT * FROM mef_ejecucion WHERE ano_eje NOT IN (2025, 2026);\n"
            "RENAME TABLE mef_ejecucion TO mef_ejecucion_old, "
            "mef_ejecucion_new TO mef_ejecucion;\n"
            "DROP TABLE mef_ejecucion_old;\n"
        )
        
        shell_script = (
            "#!/bin/bash\n"
            "echo \"START: $(date)\" > /root/rescue_output.log\n"
            "mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq < /root/rescue_table.sql >> /root/rescue_output.log 2>&1\n"
            "echo \"EXIT: $?\" >> /root/rescue_output.log\n"
            "echo \"DONE: $(date)\" >> /root/rescue_output.log\n"
            "df -h / >> /root/rescue_output.log\n"
        )
        
        # Upload files via SFTP
        sftp = ssh.open_sftp()
        with sftp.file('/root/rescue_table.sql', 'w') as f:
            f.write(sql_script)
        with sftp.file('/root/rescue_table.sh', 'w') as f:
            f.write(shell_script)
        sftp.close()
        print("Files uploaded.")

        # Run with explicit bash (bypasses execute bit) and in background with nohup
        # IMPORTANT: use a single clean string with proper spacing
        cmd = 'nohup bash /root/rescue_table.sh > /dev/null 2>&1 & echo "PID: $!"'
        _, stdout, stderr = ssh.exec_command(cmd)
        print("Launch:", stdout.read().decode().strip())
        time.sleep(3)
        
        # Verify it started
        _, stdout2, _ = ssh.exec_command('ps aux | grep rescue_table | grep -v grep')
        print("Running:\n" + stdout2.read().decode())
        
        _, stdout3, _ = ssh.exec_command('cat /root/rescue_output.log 2>/dev/null || echo "NO LOG YET"')
        print("Log:\n" + stdout3.read().decode())
        
        ssh.close()
        
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    launch_rescue()
