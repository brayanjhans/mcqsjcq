import json, zipfile, os, glob

data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "DATAJSON")
count = 0
for zf_path in glob.glob(os.path.join(data_dir, "*.zip")):
    with zipfile.ZipFile(zf_path, 'r') as z:
        for fname in z.namelist():
            if fname.endswith(".json"):
                with z.open(fname) as l:
                    data = json.load(l)
                    for rec in data.get("records", []):
                        s = json.dumps(rec).upper()
                        # Keywords for financial entities
                        if any(kw in s for kw in ["BANCO", "SEGURO", "CREDITO", "CAJA", "COOPERATIVA"]):
                            compiled = rec.get("compiledRelease", {})
                            print(f"\nOCID: {compiled.get('ocid')}")
                            for p in compiled.get("parties", []):
                                name = p.get("name", "").upper()
                                if any(kw in name for kw in ["BANCO", "SEGURO", "CREDITO", "CAJA", "COOPERATIVA"]):
                                    print(f"  Party Entity: {p.get('name')} Roles: {p.get('roles')}")
                            count += 1
                            if count >= 5: break
                    if count >= 5: break
        if count >= 5: break
if count == 0:
    print("No records found with keywords.")
