import requests
import re
import json

# URL of a known gist or repo file that lists Ubigeo
# Trying a different source: unconvered/ubigeo-peru
url = "https://raw.githubusercontent.com/fmuedano/ubigeo-peru/master/ubigeo_peru_2019.json"

try:
    print(f"Downloading from {url}...")
    resp = requests.get(url)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Successfully downloaded {len(data)} records.")
        
        # Reformating to hierarchical Dict
        # Formato esperado: {"departamento": "...", "provincia": "...", "distrito": "..."}
        
        ubigeo_tree = {}
        
        for item in data:
            dept = item.get('departamento') or item.get('nombre_departamento')
            prov = item.get('provincia') or item.get('nombre_provincia')
            dist = item.get('distrito') or item.get('nombre_distrito')
            
            if dept and prov and dist:
                dept = dept.strip().upper()
                prov = prov.strip().upper()
                dist = dist.strip().upper()
                
                if dept not in ubigeo_tree: ubigeo_tree[dept] = {}
                if prov not in ubigeo_tree[dept]: ubigeo_tree[dept][prov] = []
                if dist not in ubigeo_tree[dept][prov]: ubigeo_tree[dept][prov].append(dist)
                    
        # Write to app/data/ubigeo_data.py
        with open("app/data/ubigeo_data.py", "w", encoding="utf-8") as f:
            f.write("# Generated Static Ubigeo Data\n")
            f.write("UBIGEO_PERU = " + json.dumps(ubigeo_tree, indent=4, ensure_ascii=False))
            
        print("Successfully created app/data/ubigeo_data.py")
            
    else:
        print(f"Failed to download: {resp.status_code}")

except Exception as e:
    print(f"Error: {e}")
