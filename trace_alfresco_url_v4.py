from playwright.sync_api import sync_playwright
import time
import urllib.parse

def main():
    print("Iniciando rastreo profundo de Alfresco...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()
        
        alfresco_urls_found = []
        
        def handle_popup(popup):
            try:
                print(f"\n[POPUP CREADO] Esperando navegacion...")
                popup.wait_for_load_state('domcontentloaded', timeout=10000)
                url = popup.url
                print(f"[POPUP NAVEGÓ A] {url}")
                if 'alfresco' in url.lower() or 'alfprod' in url.lower():
                    alfresco_urls_found.append(url)
            except Exception as e:
                print(f"[POPUP ERROR] {e}")
                
            # Tambien revisamos las peticiones dentro del popup
            popup.on("request", lambda req: alfresco_urls_found.append(req.url) if 'alfprod' in req.url else None)

        page.on("popup", handle_popup)
        
        # Interceptar el evento de descarga por si el browser lo intercepta antes de abrir la tab
        def on_download(download):
            print(f"\n[DESCARGA DIRECTA] Iniciada URL: {download.url}")
            if 'alfprod' in download.url:
                alfresco_urls_found.append(download.url)
                
        page.on("download", on_download)
        
        target_url = "https://prod4.seace.gob.pe/contratos/publico/#/detalle/idContrato/tipo/2367059/1"
        page.goto(target_url, wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(3000)
        
        print("\nEjecutando click en botones PDF...")
        try:
            page.evaluate('''() => {
                const pdfContainers = Array.from(document.querySelectorAll("div"));
                let clicked = 0;
                for(let div of pdfContainers) {
                    if(div.innerText && div.innerText.includes('.pdf') && div.innerText.includes('MB')) {
                        console.log("Clicking PDF...");
                        div.click();
                        clicked++;
                        break; // Solo el primero para no saturar
                    }
                }
            }''')
        except Exception as e:
            print(f"Error click: {e}")
            
        page.wait_for_timeout(10000)
        browser.close()
        
        print("\n\n====== RESULTADOS ======")
        for u in set(alfresco_urls_found):
            print(f"URL ALFRESCO: {u}")
            # Parsear los parametros para mostrar claro el ticket y el nodo
            parsed = urllib.parse.urlparse(u)
            params = urllib.parse.parse_qs(parsed.query)
            print(f"  NODO SEACE: {parsed.path.split('/')[-2] if len(parsed.path.split('/'))>2 else 'N/A'}")
            print(f"  ALF_TICKET: {params.get('alf_ticket', ['N/A'])[0]}")

if __name__ == "__main__":
    main()
