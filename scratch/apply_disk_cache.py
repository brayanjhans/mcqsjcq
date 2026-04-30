import re

path = 'c:/laragon/www/garantias_seacee/app/routers/dashboard_raw.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = re.sub(
    r'from cachetools import TTLCache\s*DASHBOARD_CACHE = TTLCache\(maxsize=100, ttl=600\).*?\n',
    'from app.utils.disk_cache import disk_cache_get, disk_cache_set\n',
    content,
    flags=re.DOTALL
)

# 2. Get cache
content = re.sub(
    r'    if cache_key in DASHBOARD_CACHE:\s*return DASHBOARD_CACHE\[cache_key\]',
    '    cached_data = disk_cache_get(cache_key)\n    if cached_data is not None:\n        return cached_data',
    content
)

# 3. Set cache
content = re.sub(
    r'DASHBOARD_CACHE\[cache_key\] = ',
    'disk_cache_set(cache_key, ',
    content
)

# 4. Fix closing parenthesis for set cache
# Because it was `DASHBOARD_CACHE[cache_key] = ans`, now it's `disk_cache_set(cache_key, ans`
# We need to add the closing parenthesis.
content = re.sub(
    r'disk_cache_set\(cache_key, (ans|\{"data": data\})\)',
    r'disk_cache_set(cache_key, \1)', # if it already has one... wait.
    content
)

content = re.sub(
    r'disk_cache_set\(cache_key, ans\n',
    r'disk_cache_set(cache_key, ans)\n',
    content
)
content = re.sub(
    r'disk_cache_set\(cache_key, \{"data": data\}\)\n',
    r'disk_cache_set(cache_key, {"data": data})\n',
    content
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactorizado dashboard_raw.py exitosamente.")
