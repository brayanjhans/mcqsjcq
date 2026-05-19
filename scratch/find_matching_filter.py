import paramiko
import re

def find_matching_filter():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)
        
        # We want to see which years have monthly counts that range between 200 and 1500
        # Let's query by year and see the monthly counts for each year
        print("--- Querying monthly counts by Year ---")
        for year in [2020, 2021, 2022, 2023, 2024, 2025, 2026]:
            _, stdout, _ = ssh.exec_command(f'mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e "SELECT MONTH(fecha_publicacion) as mes, COUNT(*) FROM licitaciones_cabecera WHERE YEAR(fecha_publicacion) = {year} GROUP BY MONTH(fecha_publicacion) ORDER BY mes;"')
            lines = stdout.read().decode().strip().split("\n")[1:]
            counts = [int(l.split("\t")[1]) for l in lines if l]
            if counts:
                print(f"Year {year} -> Max count: {max(counts)}, Min count: {min(counts)}, Months with data: {len(counts)}, Counts: {counts}")
        
        print("\n--- Querying monthly counts by Procedure (All Years) ---")
        _, stdout, _ = ssh.exec_command('mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e "SELECT DISTINCT tipo_procedimiento FROM licitaciones_cabecera;"')
        procedures = [l.strip() for l in stdout.read().decode().strip().split("\n")[1:] if l.strip()]
        for proc in procedures:
            _, stdout, _ = ssh.exec_command(f'mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e "SELECT MONTH(fecha_publicacion) as mes, COUNT(*) FROM licitaciones_cabecera WHERE tipo_procedimiento = \'{proc}\' GROUP BY MONTH(fecha_publicacion) ORDER BY mes;"')
            lines = stdout.read().decode().strip().split("\n")[1:]
            counts = [int(l.split("\t")[1]) for l in lines if l]
            if counts:
                print(f"Proc: {proc} -> Max count: {max(counts)}, Min: {min(counts)}, Counts: {counts}")
                
        ssh.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    find_matching_filter()
