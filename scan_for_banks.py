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
                        if "BANCO" in s or "SEGURO" in s or "CREDITO" in s:
                            compiled = rec.get("compiledRelease", {})
                            print(f"\nPotential record found! ocid={compiled.get('ocid')}")
                            # Print parties and documents
                            for p in compiled.get("parties", []):
                                if any(role in str(p.get("roles")).lower() for role in ["guarantor", "issuer", "insurer"]):
                                    print(f"  Party: {p.get('name')} roles={p.get('roles')}")
                            
                            for c in compiled.get("contracts", []):
                                if "guarantees" in c:
                                    print(f"  Guarantees: {c.get('guarantees')}")
                            
                            count += 1
                            if count >= 3: break
                    if count >= 3: break
        if count >= 3: break
