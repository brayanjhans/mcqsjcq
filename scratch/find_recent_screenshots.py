import os
import glob

brain_dir = r"C:\Users\PC01\.gemini\antigravity\brain\398c07c8-b760-4a3a-bf91-abacfcc4036c"
png_files = []
for root, dirs, files in os.walk(brain_dir):
    for file in files:
        if file.lower().endswith(".png"):
            path = os.path.join(root, file)
            mtime = os.path.getmtime(path)
            png_files.append((path, mtime))

png_files.sort(key=lambda x: x[1], reverse=True)

print("Found PNG files:")
for path, mtime in png_files[:10]:
    print(f"  Path: {path} -> mtime: {mtime}")
