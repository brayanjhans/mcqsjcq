import json, zipfile, os, glob

data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "DATAJSON")
for zf_path in glob.glob(os.path.join(data_dir, "*.zip")):
    with zipfile.ZipFile(zf_path, 'r') as z:
        for fname in z.namelist():
            if fname.endswith(".json"):
                with z.open(fname) as f:
                    data = json.load(f)
                    for rec in data.get("records", []):
                        compiled = rec.get("compiledRelease", {})
                        contracts = compiled.get("contracts", [])
                        for c in contracts:
                            if "guarantees" in c:
                                print(f"\n=== Guaranteed Contract found! ocid={compiled.get('ocid')} tender.id={compiled.get('tender', {}).get('id')} ===")
                                print(json.dumps(c.get("guarantees"), indent=2))
                                break
                        else:
                            continue
                        break
                    else:
                        continue
                    break
