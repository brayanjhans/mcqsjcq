import json, zipfile, os, glob

data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "DATAJSON")
done = False
for zf_path in glob.glob(os.path.join(data_dir, "*.zip")):
    with zipfile.ZipFile(zf_path, 'r') as z:
        for fname in z.namelist():
            if fname.endswith(".json"):
                with z.open(fname) as l:
                    data = json.load(l)
                    for rec in data.get("records", []):
                        compiled = rec.get("compiledRelease", {})
                        tender = compiled.get("tender", {})
                        if str(tender.get("id")) == "1184920":
                            s = json.dumps(rec)
                            print(f"Record found for 1184920. Size: {len(s)}")
                            # Search for keywords
                            keywords = ["BANCO", "CREDITO", "CONTINENTAL", "SCOTIA", "INTERBANK", "FIANZA", "GARANTIA", "POLIZA"]
                            for kw in keywords:
                                if kw in s.upper():
                                    index = s.upper().find(kw)
                                    print(f"  Found keyword: {kw} at index {index}")
                                    print(f"    Context: {s[index-50:index+100]}")
                            
                            # Print everything to inspect
                            # print("\n=== FULL RECORD ===")
                            # print(s)
                            done = True
                            break
                    if done: break
        if done: break
if not done:
    print("Record 1184920 not found.")
