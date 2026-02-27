from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # We need context to track new pages/popups
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()
        
        def handle_popup(popup):
            print(f"[POPUP DETECTED] URL: {popup.url}")
            popup.on("request", lambda req: print(f"[POPUP REQ] {req.url}") if 'alfprod' in req.url else None)
        
        page.on("popup", handle_popup)
        
        def handle_request(req):
            if 'alfresco' in req.url.lower() or 'ticket' in req.url.lower() or 'alfprod' in req.url.lower():
                print(f"[OUTGOING REQUEST] URL: {req.url}")
                
        context.on("request", handle_request)
        
        target_url = "https://prod4.seace.gob.pe/contratos/publico/#/detalle/idContrato/tipo/2367059/1"
        print(f"Navigating to {target_url} ...")
        page.goto(target_url, wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(3000)
        
        print("Clicking download buttons...")
        try:
            page.evaluate('''() => {
                const btns = Array.from(document.querySelectorAll("button.mat-icon-button"));
                for(let b of btns) {
                    if(b.innerText.includes('attach_file') || b.innerText.includes('get_app') || b.innerText.includes('cloud_download') || b.innerText.includes('download')) {
                        console.log("Found download button, clicking in JS...");
                        b.click();
                    }
                }
            }''')
        except Exception as e:
            print(f"Evaluate error: {e}")
            
        page.wait_for_timeout(8000)
        browser.close()

if __name__ == "__main__":
    main()
