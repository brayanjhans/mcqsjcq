import paramiko
import time

def launch_rescue():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)

        # First get MySQL version
        _, out, _ = ssh.exec_command('mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e "SELECT VERSION();"')
        print("MySQL version:", out.read().decode().strip())

        # SQL: drop new table, recreate, add key without IF NOT EXISTS, then copy historical years, then swap
        sql_script = (
            "DROP TABLE IF EXISTS mef_ejecucion_new;\n"
            "CREATE TABLE mef_ejecucion_new LIKE mef_ejecucion;\n"
            "ALTER TABLE mef_ejecucion_new ADD UNIQUE KEY uk_mef_row (ano_eje, sec_ejec, producto_proyecto, meta_nombre(200));\n"
            "INSERT IGNORE INTO mef_ejecucion_new SELECT * FROM mef_ejecucion WHERE ano_eje NOT IN (2025, 2026);\n"
            "RENAME TABLE mef_ejecucion TO mef_ejecucion_old, mef_ejecucion_new TO mef_ejecucion;\n"
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

        sftp = ssh.open_sftp()
        with sftp.file('/root/rescue_table.sql', 'w') as f:
            f.write(sql_script)
        with sftp.file('/root/rescue_table.sh', 'w') as f:
            f.write(shell_script)
        sftp.close()
        print("Files uploaded.")

        cmd = 'nohup bash /root/rescue_table.sh > /dev/null 2>&1 & echo "PID: $!"'
        _, stdout, _ = ssh.exec_command(cmd)
        pid = stdout.read().decode().strip()
        print("Launched:", pid)

        time.sleep(5)
        _, stdout2, _ = ssh.exec_command('cat /root/rescue_output.log 2>/dev/null || echo "NO LOG"')
        print("Log:\n" + stdout2.read().decode())

        _, stdout3, _ = ssh.exec_command('ps aux | grep rescue_table | grep -v grep | head -5')
        print("Process:\n" + stdout3.read().decode())

        ssh.close()

    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    launch_rescue()
