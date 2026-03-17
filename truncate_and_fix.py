import paramiko

def truncate_and_fix():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)

        sql = (
            "DROP TABLE IF EXISTS mef_ejecucion_new;\n"
            "TRUNCATE TABLE mef_ejecucion;\n"
            "ALTER TABLE mef_ejecucion ADD UNIQUE KEY uk_mef_row (ano_eje, sec_ejec, producto_proyecto, meta_nombre(200));\n"
        )

        sftp = ssh.open_sftp()
        with sftp.file('/root/truncate_fix.sql', 'w') as f:
            f.write(sql)
        sftp.close()

        shell = (
            "#!/bin/bash\n"
            "echo 'START: $(date)' > /root/truncate_output.log\n"
            "mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq < /root/truncate_fix.sql >> /root/truncate_output.log 2>&1\n"
            "echo 'EXIT: '$? >> /root/truncate_output.log\n"
            "echo 'DONE: $(date)' >> /root/truncate_output.log\n"
            "df -h / >> /root/truncate_output.log\n"
            "mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e 'SHOW CREATE TABLE mef_ejecucion\\\\G' >> /root/truncate_output.log 2>&1\n"
        )

        sftp2 = ssh.open_sftp()
        with sftp2.file('/root/truncate_fix.sh', 'w') as f:
            f.write(shell)
        sftp2.close()

        _, stdout, _ = ssh.exec_command('nohup bash /root/truncate_fix.sh > /dev/null 2>&1 & echo "PID: $!"')
        print("Launched:", stdout.read().decode().strip())

        import time
        time.sleep(8)

        _, stdout2, _ = ssh.exec_command('cat /root/truncate_output.log')
        print("Log:\n" + stdout2.read().decode())

        ssh.close()

    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    truncate_and_fix()
