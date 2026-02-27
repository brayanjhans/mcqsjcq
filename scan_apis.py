import requests
import re
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

url_base = 'https://prod4.seace.gob.pe/contratos/publico/'
try:
    print('Fetching index.html...')
    r = requests.get(url_base, verify=False, timeout=10)
    html = r.text
    # Extract script src
    scripts = re.findall(r'src="(.*?\.js)"', html)
    print('Found JS scripts:', scripts)
    
    for script in scripts:
        script_url = url_base + script if not script.startswith('http') else script
        print('\n--- Fetching', script_url)
        sr = requests.get(script_url, verify=False, timeout=10)
        js_code = sr.text
        # Look for API endpoints starting with /api/bus/ or similar
        endpoints = set(re.findall(r'"(/[^\"]*api[^\"]*)"', js_code))
        alfresco_urls = set(re.findall(r'"([^\"]*alfresco[^\"]*)"', js_code))
        
        for ep in endpoints:
            print('ENDPOINT:', ep)
        for au in alfresco_urls:
            print('ALFRESCO:', au)
            
except Exception as e:
    print('Error:', e)
