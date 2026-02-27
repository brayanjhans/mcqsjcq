from playwright.sync_api import sync_playwright
import time

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Log all requests with their data
        def handle_req(request):
            if 'api' in request.url and request.method == 'POST':
                print(f'POST REQ: {request.url}')
                try: print(f'   Payload: {request.post_data}')
                except: pass

        page.on('request', handle_req)
        
        print('Going to SEACE...')
        page.goto('https://prod4.seace.gob.pe/contratos/publico/', wait_until='networkidle')
        time.sleep(3)
        
        # Move to advanced search
        print('Navigating...')
        page.click('text="Búsqueda avanzada"')
        time.sleep(3)
        
        # Take screenshot of the sidebar expansion
        page.screenshot(path='sidebar_expanded.png')
        
        # Try to find ANY input and fill it with our nomenclature
        # Maybe search by aria-label or something else?
        # Let's try to just fill all inputs that are editable
        inputs = page.query_selector_all('input')
        print(f'Found {len(inputs)} visible/hidden inputs.')
        for i, inp in enumerate(inputs):
            try:
                id_val = inp.get_attribute('id')
                ph = inp.get_attribute('placeholder')
                print(f'Input {i}: id={id_val}, ph={ph}')
                if id_val == 'nomenclaturaFil' or (ph and 'Nomenclatura' in ph):
                    print(f'Found Nomenclature input at index {i}')
                    inp.fill('LP-ABR-65-2025-GRH/C-3')
            except: pass
            
        # Click search anyway
        print('Clicking Search...')
        page.click('button:has-text("Buscar")')
        time.sleep(10)
        
        page.screenshot(path='after_search.png')
        browser.close()

if __name__ == '__main__':
    main()
