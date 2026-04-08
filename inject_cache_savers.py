import re

file_path = "c:\\laragon\\www\\gitc\\garantias_seacee\\app\\routers\\dashboard_raw.py"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace all occurrences of:
#        return {"data": data}
#    except Exception as e:
# With:
#        DASHBOARD_CACHE[cache_key] = {"data": data}
#        return {"data": data}
#    except Exception as e:

content = re.sub(
    r'(\s+)return \{"data": data\}\n\s+except Exception as e:',
    r'\1DASHBOARD_CACHE[cache_key] = {"data": data}\1return {"data": data}\n    except Exception as e:',
    content
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Cache savers injected")
