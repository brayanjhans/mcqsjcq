import paramiko
import time

def add_key_and_reimport():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)

        # Step 1: Add unique key (instant on empty table)
        _, stdout, _ = ssh.exec_command(
            'mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e '
            '"ALTER TABLE mef_ejecucion ADD UNIQUE KEY uk_mef_row '
            '(ano_eje, sec_ejec, producto_proyecto, meta_nombre(200));"'
        )
        out = stdout.read().decode()
        print("ALTER TABLE result:", out or "OK (no output = success)")

        # Verify the key exists now
        _, stdout2, _ = ssh.exec_command(
            'mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e '
            '"SELECT INDEX_NAME, COLUMN_NAME FROM information_schema.STATISTICS '
            'WHERE TABLE_SCHEMA=\'mcqs-jcq\' AND TABLE_NAME=\'mef_ejecucion\' '
            'ORDER BY INDEX_NAME, SEQ_IN_INDEX;"'
        )
        print("Indices verificados:\n" + stdout2.read().decode())

        # Step 2: Launch MEF re-import for all 4 years via nohup
        reimport_shell = (
            "#!/bin/bash\n"
            "LOG=/root/reimport_output.log\n"
            "echo 'REIMPORT STARTED' > $LOG\n"
            "date >> $LOG\n"
            "cd /home/admin/public_html/api\n"
            "source venv/bin/activate\n"
            "for YEAR in 2023 2024 2025 2026; do\n"
            "  echo \"--- Procesando ano $YEAR ---\" >> $LOG\n"
            "  date >> $LOG\n"
            "  URL=\"https://fs.datosabiertos.mef.gob.pe/datastorefiles/${YEAR}-Gasto-Devengado-Diario.csv\"\n"
            "  FILE=\"/home/admin/public_html/api/scripts/mef_${YEAR}_gasto.csv\"\n"
            "  echo \"Descargando $URL\" >> $LOG\n"
            "  curl -L -o \"$FILE\" \"$URL\" >> $LOG 2>&1\n"
            "  if [ $? -eq 0 ]; then\n"
            "    echo \"Importando $YEAR...\" >> $LOG\n"
            "    python3 scripts/import_mef_csv.py --year $YEAR --all-rows --incremental >> $LOG 2>&1\n"
            "    rm -f \"$FILE\"\n"
            "    echo \"Listo $YEAR\" >> $LOG\n"
            "  else\n"
            "    echo \"ERROR descargando $YEAR\" >> $LOG\n"
            "  fi\n"
            "done\n"
            "echo 'REIMPORT DONE' >> $LOG\n"
            "date >> $LOG\n"
            "df -h / >> $LOG\n"
        )

        sftp = ssh.open_sftp()
        with sftp.file('/root/reimport_mef.sh', 'w') as f:
            f.write(reimport_shell)
        sftp.close()

        _, stdout3, _ = ssh.exec_command('nohup bash /root/reimport_mef.sh > /dev/null 2>&1 & echo "PID: $!"')
        print("Re-import launched:", stdout3.read().decode().strip())

        time.sleep(5)
        _, stdout4, _ = ssh.exec_command('cat /root/reimport_output.log 2>/dev/null || echo "NO LOG YET"')
        print("Import log:\n" + stdout4.read().decode())

        ssh.close()

    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    add_key_and_reimport()
