import os
import shutil

cache_dir = r"c:\laragon\www\garantias_seacee\app\.dashboard_cache"
if os.path.exists(cache_dir):
    shutil.rmtree(cache_dir)
    os.makedirs(cache_dir, exist_ok=True)
    print("Local cache cleared successfully.")
else:
    print("Cache dir does not exist.")
