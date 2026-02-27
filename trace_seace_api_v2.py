from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        def handle_response(response):
            if 'api' in response.url:
                print(f'API Call: {response.url} | Status: {response.status}')

        page.on('response', handle_response)
        
        print('Navigating to SEACE...')
        page.goto('https://prod4.seace.gob.pe/contratos/publico/', wait_until='networkidle')
        page.wait_for_timeout(3000)
        
        print('Navigating to Advanced Search section...')
        page.click('text="Búsqueda avanzada"')
        page.wait_for_timeout(2000)
        
        # Try to expand ALL expansion panels
        panels = page.query_selector_all('.mat-expansion-panel-header')
        print(f'Found {len(panels)} expansion panels.')
        for i, panel in enumerate(panels):
            try:
                print(f'Clicking panel {i}...')
                panel.click()
                page.wait_for_timeout(500)
            except: pass
            
        page.wait_for_timeout(2000)
        
        # Now try to find Nomenclature input
        nom_input = page.query_selector('#nomenclaturaFil')
        if nom_input:
            print('Found Nomenclature input! Filling it...')
            nom_input.fill('LP-ABR-65-2025-GRH/C-3')
            page.wait_for_timeout(500)
            
            print('Clicking Search button...')
            # Find the button that says "Buscar"
            page.click('button:has-text("Buscar")')
            page.wait_for_timeout(10000)
            
            page.screenshot(path='search_results_success.png')
            print('Screenshot saved as search_results_success.png')
        else:
            print('Could not find Nomenclature input even after expanding panels.')
            # List all inputs again to see what's visible
            inputs = page.query_selector_all('input')
            for i, inp in enumerate(inputs):
                print(f'Visible Input {i}: id={inp.get_attribute("id")} placeholder={inp.get_attribute("placeholder")}')
            page.screenshot(path='fail_expansion.png')
        
        browser.close()

if __name__ == '__main__':
    main()
