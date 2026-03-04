import paramiko
import time

host = "72.61.219.79"
user = "root"
password = "Contra159753#"
backend_path = "/home/admin/public_html/api"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=10)

# Step 1: Re-download fresh 2026 CSV
print("Step 1: Downloading fresh 2026 CSV on VPS...")
dl_cmd = f'cd {backend_path}/scripts && curl -L -o mef_2026_gasto.csv "https://fs.datosabiertos.mef.gob.pe/datastorefiles/2026-Gasto-Devengado-Diario.csv" --connect-timeout 30 --max-time 300 -H "User-Agent: Mozilla/5.0" && ls -lh mef_2026_gasto.csv'
_, stdout, stderr = ssh.exec_command(dl_cmd, timeout=360)
print("STDOUT:", stdout.read().decode())
lines = stderr.read().decode().strip().split('\n')
print("Progress:", lines[-1] if lines else "")

# Step 2: Re-import 2026 
print("\nStep 2: Re-importing MEF 2026...")
imp_cmd = f"cd {backend_path} && source venv/bin/activate && python3 scripts/import_mef_csv.py --year 2026"
_, stdout, stderr = ssh.exec_command(imp_cmd, timeout=600)
out = stdout.read().decode()
print("STDOUT:", out)
err = stderr.read().decode()
if err:
    print("STDERR:", err[-300:])

# Step 3: Create a cron job script for daily MEF update
print("\nStep 3: Creating daily update script...")
cron_script = '''#!/bin/bash
# Daily MEF CSV refresh - runs at 6:00 AM Lima time
cd /home/admin/public_html/api
source venv/bin/activate

YEAR=$(date +%Y)
echo "[$(date)] Downloading MEF CSV $YEAR..."
cd scripts
curl -L -o mef_${YEAR}_gasto.csv "https://fs.datosabiertos.mef.gob.pe/datastorefiles/${YEAR}-Gasto-Devengado-Diario.csv" --connect-timeout 30 --max-time 300 -H "User-Agent: Mozilla/5.0" -s
cd ..
echo "[$(date)] Importing MEF CSV $YEAR..."
python3 scripts/import_mef_csv.py --year $YEAR --incremental
echo "[$(date)] Done."
'''

create_script_cmd = f'''cat > {backend_path}/scripts/daily_mef_update.sh << 'SCRIPT_END'
{cron_script}
SCRIPT_END
chmod +x {backend_path}/scripts/daily_mef_update.sh'''
_, stdout, stderr = ssh.exec_command(create_script_cmd, timeout=10)
stdout.read()

# Step 4: Add cron job (6:00 AM Peru time = 11:00 UTC)
print("Step 4: Setting up daily cron job (6:00 AM Lima)...")
cron_cmd = f'(crontab -l 2>/dev/null | grep -v "daily_mef_update"; echo "0 11 * * * {backend_path}/scripts/daily_mef_update.sh >> /tmp/mef_daily_update.log 2>&1") | crontab -'
_, stdout, stderr = ssh.exec_command(cron_cmd, timeout=10)
stdout.read()

# Verify cron
_, stdout, _ = ssh.exec_command("crontab -l | grep mef", timeout=5)
print("Cron job:", stdout.read().decode())

# Step 5: Restart PM2
print("Step 5: Restarting PM2...")
_, stdout, _ = ssh.exec_command("pm2 restart all", timeout=15)
print(stdout.read().decode())

ssh.close()
print("\n✅ Done! 2026 CSV reimportado con datos frescos y cron configurado.")
