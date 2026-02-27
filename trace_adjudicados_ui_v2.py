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
                print(f'CAPTURED ADJUDICADOS API: {res.url} | STATUS: {res.status}')
                try:
                    captured_adjudicados = res.json()
                except: pass

        page.on('response', handle_res)
        
        print('Navigating to SEACE Search...')
        page.goto('https://prod4.seace.gob.pe/contratos/publico/', wait_until='networkidle')
        page.click('text="Búsqueda avanzada"')
        time.sleep(3)
        
        # Expand ALL panels to reveal hidden inputs
        print('Expanding all panels...')
        headers = page.query_selector_all('.mat-expansion-panel-header')
        for h in headers:
            try: h.click()
            except: pass
        time.sleep(2)
        
        print('Filling ID Expediente (Convocatoria)...')
        # Try both ID and CSS finding
        try:
            page.fill('#idExpedienteFil', '1176751')
        except:
            print('Could not fill by ID, trying generic input...')
            page.fill('input[placeholder*="Expediente"]', '1176751')
            
        time.sleep(1)
        
        print('Clicking Search...')
        page.click('button:has-text("Buscar")')
        
        # Wait for results table
        print('Waiting for results table...')
        try:
            page.wait_for_selector('.mat-table', timeout=15000)
            print('Results table found!')
            
            # Click the action button (usually an eye icon in the last column)
            btn = page.query_selector('.mat-row .mat-icon-button')
            if btn:
                print('Clicking detail button...')
                btn.click()
                time.sleep(10) # Wait for APIs to load
            else:
                print('No detail button found in the row.')
        except Exception as e:
            print(f'Results error: {e}')
            page.screenshot(path='no_table.png')
            
        if captured_adjudicados:
            print('--- JSON DATA CAPTURED SUCCESS ---')
            with open('captured_sample.json', 'w') as f:
                json.dump(captured_adjudicados, f, indent=2)
            print(f'Saved {len(json.dumps(captured_adjudicados))} bytes to captured_sample.json')
        else:
            print('No adjudication JSON captured.')
        
        browser.close()

if __name__ == '__main__':
    main()
