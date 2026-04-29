import os
import json
import hashlib
from datetime import datetime, timedelta

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".dashboard_cache")

if not os.path.exists(CACHE_DIR):
    try:
        os.makedirs(CACHE_DIR, exist_ok=True)
    except Exception as e:
        print(f"Warning: Could not create cache dir {CACHE_DIR}: {e}")

def get_window_prefix():
    now = datetime.now()
    if 6 <= now.hour < 18:
        return f"{now.date()}_day"
    else:
        d = now.date() if now.hour >= 18 else (now.date() - timedelta(days=1))
        return f"{d}_night"

def get_disk_cache_path(key: str) -> str:
    h = hashlib.md5(key.encode()).hexdigest()
    return os.path.join(CACHE_DIR, f"dash_{h}.json")

def disk_cache_get(key: str):
    full_key = f"{get_window_prefix()}_{key}"
    path = get_disk_cache_path(full_key)
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return None
    return None

def disk_cache_set(key: str, data: dict):
    full_key = f"{get_window_prefix()}_{key}"
    path = get_disk_cache_path(full_key)
    try:
        # Save atomically if possible or just write
        tmp_path = path + ".tmp"
        with open(tmp_path, 'w', encoding='utf-8') as f:
            json.dump(data, f)
        os.replace(tmp_path, path)
    except Exception as e:
        print(f"Warning: Could not save cache: {e}")
