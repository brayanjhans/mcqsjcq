from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        target_url = "https://prod4.seace.gob.pe/contratos/publico/#/detalle/idContrato/tipo/2367059/1"
        print(f"Navigating to {target_url} ...")
        page.goto(target_url, wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(5000)
        
        print("Extracting all hrefs...")
        try:
            links = page.evaluate('''() => {
                const anchors = Array.from(document.querySelectorAll("a, button"));
                return anchors.map(a => {
                    return {
                        tag: a.tagName,
                        text: a.innerText.trim(),
                        href: a.href || a.getAttribute('href'),
                        onclick: a.getAttribute('onclick')
                    };
                });
            }''')
            
            for l in links:
                if 'alf' in str(l).lower() or 'ticket' in str(l).lower() or 'descarg' in str(l).lower() or 'document' in str(l).lower() or 'descarga' in str(l).lower() or 'download' in str(l).lower():
                    print(l)
        except Exception as e:
            print(f"Evaluate error: {e}")
            
        # Also print inner HTML of elements containing attach_file
        try:
            htmls = page.evaluate('''() => {
                const icons = Array.from(document.querySelectorAll("mat-icon"));
                return icons.filter(i => i.innerText.includes('attach_file') || i.innerText.includes('get_app')).map(i => i.parentElement.outerHTML);
            }''')
            print("\nButton HTML:")
            for h in htmls:
                print(h)
        except: pass

        browser.close()

if __name__ == "__main__":
    main()
