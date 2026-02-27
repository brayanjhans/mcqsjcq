from playwright.sync_api import sync_playwright
import time
import json

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        captured_data = []
        
        def handle_res(res):
            if 'api' in res.url:
                print(f'API_RES: {res.url} | STATUS: {res.status}')
                try:
                    if 'application/json' in res.headers.get('content-type', ''):
                        data = res.json()
                        captured_data.append({
                            'url': res.url,
                            'data': data
                        })
                except: pass

        page.on('response', handle_res)
        
        url = 'https://prod4.seace.gob.pe/contratos/publico/#/detalle/idContrato/tipo/2375062/1'
        print(f'Going directly to Contract details: {url}')
        page.goto(url, wait_until='networkidle')
        time.sleep(10)
        
        # Take a screenshot to verify what we see
        page.screenshot(path='contract_details_trace.png')
        print('Screenshot saved as contract_details_trace.png')
            
        print(f'Captured {len(captured_data)} JSON responses.')
        for item in captured_data:
            print(f"URL: {item['url']}")
            # Simple check for Alfresco IDs or document keys
            s = json.dumps(item['data'])
            if 'alfId' in s or 'documento' in s.lower() or 'archivo' in s.lower() or '88af360f' in s:
                print("   >>> FOUND POTENTIAL DOCUMENT JSON! <<<")
                with open('contract_json.json', 'w') as f:
                    json.dump(item['data'], f, indent=2)
                    
        browser.close()

if __name__ == '__main__':
    main()
