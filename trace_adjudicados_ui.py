from playwright.sync_api import sync_playwright
import time
import json

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        captured_adjudicados = None
        
        def handle_res(res):
            nonlocal captured_adjudicados
            if 'api/bus/adjudicados' in res.url:
                print(f'CAPTURED ADJUDICADOS API: {res.url}')
                try:
                    captured_adjudicados = res.json()
                except: pass

        page.on('response', handle_res)
        
        print('Navigating to SEACE Search...')
        page.goto('https://prod4.seace.gob.pe/contratos/publico/', wait_until='networkidle')
        page.click('text="Búsqueda avanzada"')
        time.sleep(2)
        
        # Expand the panel if needed (it seems it was visible in debug)
        print('Filling ID Expediente (Convocatoria)...')
        page.fill('#idExpedienteFil', '1176751')
        time.sleep(1)
        
        print('Clicking Search...')
        page.click('button:has-text("Buscar")')
        page.wait_for_timeout(5000)
        
        # Click on the result row to open details (which should trigger the adjudication API)
        print('Attempting to click on result row...')
        try:
            # Click the second mat-cell or an eye icon
            # Adjusting selector based on typical mat-table structure
            page.click('.mat-row >> .mat-icon-button', timeout=5000)
            print('Detail button clicked!')
            time.sleep(5)
        except:
            print('Could not find or click result row.')
            page.screenshot(path='search_no_results.png')
            
        if captured_adjudicados:
            print('--- JSON DATA CAPTURED ---')
            print(json.dumps(captured_adjudicados, indent=2)[:2000])
            with open('captured_sample.json', 'w') as f:
                json.dump(captured_adjudicados, f, indent=2)
        else:
            print('No adjudication JSON captured.')
        
        browser.close()

if __name__ == '__main__':
    main()
