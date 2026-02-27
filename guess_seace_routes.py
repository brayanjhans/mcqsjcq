from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        routes = [
            'https://prod4.seace.gob.pe/contratos/publico/#/buscar',
            'https://prod4.seace.gob.pe/contratos/publico/#/busqueda',
            'https://prod4.seace.gob.pe/contratos/publico/#/busqueda-avanzada',
            'https://prod4.seace.gob.pe/contratos/publico/#/principal'
        ]
        
        for r in routes:
            print(f'Trying route: {r}')
            page.goto(r, wait_until='networkidle')
            page.wait_for_timeout(3000)
            page.screenshot(path=f'route_{r.split("/")[-1]}.png')
            
            inputs = page.query_selector_all('input')
            print(f'   Inputs found: {len(inputs)}')
            if len(inputs) > 3:
                print(f'   SUCCESS! Route {r} seems to be the one.')
                break
                
        browser.close()

if __name__ == '__main__':
    main()
