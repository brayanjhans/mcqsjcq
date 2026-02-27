from playwright.sync_api import sync_playwright
import json

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        found_urls = []
        
        # Intercept network responses
        def handle_response(response):
            try:
                if "application/json" in response.headers.get("content-type", ""):
                    text = response.text()
                    if "PROPUESTA" in text.upper() or "ALFRESCO" in text.upper() or "POMACUCHO" in text.upper() or "alf_ticket" in text:
                        print(f"\n[!] MATCH FOUND IN URL: {response.url}")
                        try:
                            data = response.json()
                            print(json.dumps(data, indent=2)[:1000] + "...\n")
                            found_urls.append(response.url)
                        except:
                            print("Could not parse JSON")
            except Exception as e:
                pass

        page.on("response", handle_response)
        
        target_url = "https://prod4.seace.gob.pe/contratos/publico/#/detalle/idContrato/tipo/2367059/1"
        print(f"Navigating to {target_url} ...")
        
        try:
            page.goto(target_url, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(5000) # Wait extra time for JS to render and fetch
        except Exception as e:
            print(f"Navigation error: {e}")
            
        print("Finished intercepting.")
        browser.close()

if __name__ == "__main__":
    main()
