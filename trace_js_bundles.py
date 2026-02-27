import requests
import re
import urllib3

urllib3.disable_warnings()
headers = {'User-Agent': 'Mozilla/5.0'}

print('Buscando referencias a alf_ticket en vendor o modulos de SEACE...')
try:
    source = requests.get('https://prod4.seace.gob.pe/contratos/publico/index.html', headers=headers, verify=False, timeout=10).text
    
    # Extract all script srcs
    scripts = re.findall(r'<script src="(.*?\.js)"', source)
    print(f'Found {len(scripts)} scripts attached to the app.')
    
    for s in scripts:
        print(f'Checking JS: {s}')
        # Make sure they are relative paths or absolute
        url = s if s.startswith('http') else f'https://prod4.seace.gob.pe/contratos/publico/{s}'
        js = requests.get(url, headers=headers, verify=False, timeout=15).text
        
        idx = js.find('alf_ticket')
        if idx != -1:
            print(f'\n\n[!!!] FOUND alf_ticket in {s} ->')
            print(js[max(0, idx-150):min(len(js), idx+200)])
            print("-" * 50)
            
        idx2 = js.find('alfprod')
        if idx2 != -1:
            print(f'\n\n[!!!] FOUND alfprod in {s} ->')
            print(js[max(0, idx2-150):min(len(js), idx2+200)])
            print("-" * 50)
            
except Exception as e:
    print('Error:', e)
