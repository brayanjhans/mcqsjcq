import requests, re, json
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

js_url = 'https://prod4.seace.gob.pe/contratos/publico/main-es2015.85feb2b8710f8f3a58e3.js'
print('Fetching', js_url)
try:
    r = requests.get(js_url, verify=False, timeout=10)
    endpoints = set(re.findall(r'"(/[^\"]*api[^\"]*)"', r.text))
    print('Found API endpoints in main JS:')
    for ep in sorted(endpoints):
        print(ep)
        
    alfresco = set(re.findall(r'"([^\"]*alfresco[^\"]*)"', r.text))
    print('\nAlfresco/Ticket patterns:')
    for a in sorted(alfresco):
        print(a)
except Exception as e:
    print('Error:', e)
