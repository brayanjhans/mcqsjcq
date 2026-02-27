from playwright.sync_api import sync_playwright
import time
import json

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Using a context with accept_downloads=True
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()
        
        def handle_request(req):
            if 'alfresco' in req.url.lower() or 'ticket' in req.url.lower() or 'alfprod' in req.url.lower():
                print(f"[OUTGOING REQUEST] URL: {req.url}")
                
        def handle_response(res):
            if 'alfresco' in res.url.lower() or 'ticket' in res.url.lower() or 'alfprod' in res.url.lower():
                print(f"[INCOMING RESPONSE] URL: {res.url}")
        
        page.on("request", handle_request)
        page.on("response", handle_response)
        
        target_url = "https://prod4.seace.gob.pe/contratos/publico/#/detalle/idContrato/tipo/2367059/1"
        print(f"Navigating to {target_url} ...")
        page.goto(target_url, wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(3000)
        
        print("Clicking download buttons...")
        try:
            page.evaluate('''() => {
                const btns = Array.from(document.querySelectorAll("button.mat-icon-button"));
                for(let b of btns) {
                    if(b.innerText.includes('attach_file') || b.innerText.includes('get_app') || b.innerText.includes('download')) {
                        console.log("Clicking button");
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
