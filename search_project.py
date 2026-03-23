import json
import zipfile
import os

z_path = r'c:\laragon\www\gitc\garantias_seacee\DATAJSON\2026-03_seace_v3.zip'
if not os.path.exists(z_path):
    print(f"Error: {z_path} not found")
    exit(1)

z = zipfile.ZipFile(z_path, 'r')
j_name = [f for f in z.namelist() if f.endswith('.json')][0]
with z.open(j_name) as f:
    data = json.load(f)
    records = data.get('records', [])
    
def find_key(d, key_name, path=''):
    res = []
    if isinstance(d, dict):
        for k, v in d.items():
            curr_path = path + '.' + k if path else k
            if k.lower() == key_name.lower():
                res.append((curr_path, v))
            res.extend(find_key(v, key_name, curr_path))
    elif isinstance(d, list):
        for i, v in enumerate(d):
            res.extend(find_key(v, key_name, path + '[' + str(i) + ']'))
    return res

# Search in the first 10 records to be sure
for i in range(min(10, len(records))):
    rec = records[i]
    print(f"--- Record {i} ---")
    results = find_key(rec, 'project')
    for p, v in results:
        print(f"FOUND 'project' at {p}: {v}")
    
    results_id = find_key(rec, 'projectID')
    for p, v in results_id:
        print(f"FOUND 'projectID' at {p}: {v}")
