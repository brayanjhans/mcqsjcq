import os
import sys
from PIL import Image
import base64
import io

dir_path = r'C:\Users\Brayan\.gemini\antigravity\brain\103931a0-3f25-4278-9fb9-4a87ee4860cf'
files = ['media__1776371685668.png', 'media__1776371696234.png']

for name in files:
    img_path = os.path.join(dir_path, name)
    if not os.path.exists(img_path):
        print('NOT FOUND:', img_path)
        continue
    else:
        print('FOUND:', img_path)
        
    try:
        img = Image.open(img_path).convert('RGBA')
        datas = img.getdata()
        
        newData = []
        for item in datas:
            # If it's a solid dark gray (checkerboard usually contains dark gray #333333 or similar, and light gray)
            # Or if it's already white, keep it.
            # We want to extract ONLY the bright white parts.
            # If the image was naturally transparent but PNG converted, maybe the checkerboard isn't there, just white.
            if item[0] > 180 and item[1] > 180 and item[2] > 180:
                newData.append((255, 255, 255, 255))
            else:
                newData.append((255, 255, 255, 0)) # transparent white
                
        img.putdata(newData)
        
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        out_name = f"b64_{name}.txt"
        with open(out_name, 'w') as f:
            f.write('data:image/png;base64,' + b64)
            print(f'Wrote {out_name} successfully, size: {len(b64)}')
            
    except Exception as e:
        print('Error with', name, ':', str(e))
