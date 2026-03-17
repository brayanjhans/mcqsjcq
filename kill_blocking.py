import paramiko

def kill_blocking_queries():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)

        # Show all active queries
        _, stdout, _ = ssh.exec_command(
            'mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e '
            '"SELECT ID, TIME, STATE, LEFT(INFO, 80) AS QUERY '
            'FROM information_schema.PROCESSLIST '
            'WHERE COMMAND=\'Query\' AND TIME > 5 '
            'ORDER BY TIME DESC;"'
        )
        output = stdout.read().decode()
        print("Active long queries:\n" + output)

        # Kill any query running over 10 seconds that is not this check itself
        _, stdout2, _ = ssh.exec_command(
            'mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e '
            '"SELECT GROUP_CONCAT(\'KILL \', ID SEPARATOR \'; \') '
            'FROM information_schema.PROCESSLIST '
            'WHERE COMMAND=\'Query\' AND TIME > 10 '
            'AND ID != CONNECTION_ID();"'
        )
        kill_cmds = stdout2.read().decode().strip().split('\n')
        print("Kill commands:", kill_cmds)

        for line in kill_cmds:
            line = line.strip()
            if line and line.startswith('KILL'):
                _, st, _ = ssh.exec_command(f'mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e "{line};"')
                print(f"Executed: {line} -> {st.read().decode().strip()}")

        ssh.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    kill_blocking_queries()
