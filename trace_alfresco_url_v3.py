from playwright.sync_api import sync_playwright
import time

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # We need context to track new pages/popups
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()
        
        def handle_popup(popup):
            print(f"[POPUP DETECTED] URL: {popup.url}")
            popup.on("request", lambda req: print(f"[POPUP REQ] {req.url}") if 'alfresco' in req.url or 'alfprod' in req.url else None)
        
        page.on("popup", handle_popup)
        
        def handle_request(req):
            if 'alfresco' in req.url.lower() or 'ticket' in req.url.lower() or 'alfprod' in req.url.lower():
                print(f"[OUTGOING REQUEST] URL: {req.url}")
                
        def handle_response(res):
            if 'alfresco' in res.url.lower() or 'alfprod' in res.url.lower():
                print(f"[INCOMING RESPONSE] URL: {res.url}")
                
        context.on("request", handle_request)
        context.on("response", handle_response)
        
        target_url = "https://prod4.seace.gob.pe/contratos/publico/#/detalle/idContrato/tipo/2367059/1"
        print(f"Navigating to {target_url} ...")
        page.goto(target_url, wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(3000)
        
        print("Clicking specific PDF buttons based on screenshot analysis...")
        try:
            # En la captura se ven cajas con el SVG o icono PDF y data como "Archivos de Contrato"
            # Buscamos divs que en su texto tengan ".pdf" o usen la clase mat-icon SVG
            page.evaluate('''() => {
                const pdfContainers = Array.from(document.querySelectorAll("div"));
                let clicked = 0;
                for(let div of pdfContainers) {
                    // Los divs de la captura que muestran los pdfs tienen borde y texto "pdf" "MB" etc.
                    if(div.innerText && div.innerText.includes('.pdf') && div.innerText.includes('MB')) {
                        console.log("Found PDF container: ", div.innerText);
                        // Hacemos click en el div mismo, a menudo es un contenedor clickeable
                        div.click();
                        clicked++;
                    }
                }
                console.log(`Clicked ${clicked} PDF containers.`);
            }''')
        except Exception as e:
            print(f"Evaluate error: {e}")
            
        page.wait_for_timeout(8000)
        browser.close()

if __name__ == "__main__":
    main()
