from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print('Intercepting responses...')
        def handle_response(response):
            if 'api' in response.url:
                print(f'API Call: {response.url} | Status: {response.status}')
                try:
                    if 'application/json' in response.headers.get('content-type', ''):
                        print(f'   JSON Data received from {response.url}')
                except: pass

        page.on('response', handle_response)
        
        print('Navigating to SEACE...')
        page.goto('https://prod4.seace.gob.pe/contratos/publico/', wait_until='networkidle')
        page.wait_for_timeout(3000)
        
        print('Navigating to Advanced Search...')
        page.click('text="Búsqueda avanzada"')
        page.wait_for_timeout(2000)
        
        # Click the blue bar to expand
        print('Expanding Advanced Search...')
        page.click('text="Búsqueda avanzada:"') # Collapsible panel
        page.wait_for_timeout(1000)
        
        # Fill Nomenclatura
        print('Filling Nomenclature...')
        # Based on my earlier debug, Input 4 was nomenclaturaFil
        page.fill('#nomenclaturaFil', 'LP-ABR-65-2025-GRH/C-3')
        
        print('Clicking Search...')
        page.click('button:has-text("Buscar")')
        page.wait_for_timeout(10000)
        
        page.screenshot(path='search_results.png')
        print('Screenshot saved as search_results.png')
        
        browser.close()

if __name__ == '__main__':
    main()
