import pymysql

conn = pymysql.connect(host='localhost', user='root', password='123456789', db='mcqs-jcq',
                        connect_timeout=10, read_timeout=30)
cur = conn.cursor()

# Find and kill all blocking transactions
cur.execute("SHOW PROCESSLIST")
killed = 0
for row in cur.fetchall():
    pid, user, host, db, cmd, time_s = row[0], row[1], row[2], row[3], row[4], row[5]
    info = str(row[7] or "")
    # Kill any connection that's been running for more than 10 seconds (except our own and the event_scheduler)
    if cmd != 'Daemon' and time_s > 10 and 'PROCESSLIST' not in info:
        print(f"KILLING PID {pid} (cmd={cmd}, time={time_s}s, info={info[:60]})")
        try:
            cur.execute(f"KILL {pid}")
            killed += 1
        except Exception as e:
            print(f"  Error killing: {e}")

print(f"\nKilled {killed} blocking connections.")
conn.close()
