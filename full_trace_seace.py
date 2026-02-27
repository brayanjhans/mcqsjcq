from playwright.sync_api import sync_playwright
import time

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Log all requests/responses that contain 'api'
        def handle_res(res):
            if 'api' in res.url:
                print(f'API_RES: {res.url} | STATUS: {res.status}')
                try:
                    if 'application/json' in res.headers.get('content-type', ''):
                        print(f'   JSON Data received from {res.url}')
                        # Just a preview
                        txt = res.text()
                        print(f'   Preview: {txt[:200]}')
                except: pass

        page.on('response', handle_res)
        
        print('Going to SEACE...')
        page.goto('https://prod4.seace.gob.pe/contratos/publico/', wait_until='networkidle')
        
        # Navigation
        print('Clicking Advanced Search sidebar...')
        page.click('text="Búsqueda avanzada"')
        time.sleep(2)
        
        print('Expanding search panel...')
        page.click('text="Búsqueda avanzada:"')
        time.sleep(2)
        
        print('Filling Nomenclature...')
        page.fill('#nomenclaturaFil', 'LP-ABR-65-2025-GRH/C-3')
        time.sleep(1)
        
        print('Clicking Search button...')
        page.click('button:has-text("Buscar")')
        
        # Wait for results and APIs to trigger
        time.sleep(15)
        
        # Take a screenshot to verify what we see
        page.screenshot(path='final_trace_view.png')
        print('Screenshot saved as final_trace_view.png')
            
        browser.close()

if __name__ == '__main__':
    main()
