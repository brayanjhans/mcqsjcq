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
                print(f'API_RES: {res.url}')
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
        print(f'Loading contract: {url}')
        page.goto(url, wait_until='networkidle')
        time.sleep(5)
        
        print('Clicking download document icon...')
        # The document download icon is typically an 'attach_file' or 'file_download' mat-icon
        # Let's try to click the first icon button in the document section
        try:
            # Look for the button near "Contrato N 000042-2026-GRH_GGR..pdf"
            page.locator('mat-icon', has_text='attach_file').first.click(timeout=5000)
            print('Clicked attach_file icon!')
            time.sleep(5)
        except Exception as e:
            print(f'Could not click attach_file: {e}')
            
        print('Trying alternate download icon (get_app)...')
        try:
            page.locator('mat-icon', has_text='get_app').first.click(timeout=5000)
            print('Clicked get_app icon!')
            time.sleep(5)
        except Exception as e:
            print(f'Could not click get_app: {e}')

        print('--- Captured JSON endpoints ---')
        for item in captured_data:
            print(f"URL: {item['url']}")
            s = json.dumps(item['data'])
            if 'alfId' in s or 'ticket' in s.lower() or 'archivo' in s.lower():
                print(f"   => Potential Match: {s[:200]}")
                
        browser.close()

if __name__ == '__main__':
    main()
