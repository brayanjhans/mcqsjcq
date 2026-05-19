import paramiko
import json

def query_vps_trend_api():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)
        
        # Curl the VPS endpoint for monthly-trend
        print("Curling /api/dashboard/monthly-trend on VPS:")
        _, stdout, _ = ssh.exec_command("curl -s http://127.0.0.1:8000/api/dashboard/monthly-trend")
        res_str = stdout.read().decode().strip()
        try:
            res_json = json.loads(res_str)
            print("VPS Trend response:")
            for item in res_json.get("data", []):
                print(f"  Month: {item['name']} -> count: {item['count']}, value: {item['value']}")
        except Exception as ex:
            print(f"Error parsing JSON: {ex}. Raw response: {res_str}")
            
        ssh.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    query_vps_trend_api()
