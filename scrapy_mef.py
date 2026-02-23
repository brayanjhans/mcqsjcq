import requests
from bs4 import BeautifulSoup
import urllib3

urllib3.disable_warnings()

def scrape_mef_months(cui, year):
    url = f'https://apps5.mineco.gob.pe/transparencia/Navegador/Navegar_5.aspx?y={year}&ap=Proyecto&cui={cui}'
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-PE,es;q=0.9,en-US;q=0.8,en;q=0.7',
    })

    # Step 1: Initialize session state with the CUI filter on default.aspx
    init_url = f'https://apps5.mineco.gob.pe/transparencia/Navegador/default.aspx?y={year}&ap=Proyecto&cui={cui}'
    print(f"0. Initializing ASP.NET Session at {init_url}")
    session.get(init_url, verify=False)

    print(f"1. Fetching total row for CUI {cui} Year {year}")
    res1 = session.get(url, verify=False)
    
    if res1.status_code != 200:
        print(f"Error fetching page: {res1.status_code}")
        return []

    soup = BeautifulSoup(res1.text, 'html.parser')
    
    # Extract ASP.NET variables
    viewstate = soup.find('input', {'name': '__VIEWSTATE'})
    eventvalidation = soup.find('input', {'name': '__EVENTVALIDATION'})
    
    if not viewstate or not eventvalidation:
        print("Error: Could not find __VIEWSTATE or __EVENTVALIDATION")
        return []
        
    # Get the value for the radio button that selects the project total
    radio_btn = soup.find('input', {'name': 'grp1'})
    if not radio_btn:
        print("Error: Could not find project record (grp1)")
        return []
        
    radio_value = radio_btn['value']
    
    # Prepare payload for clicking "Mes"
    # To mimic a button click in ASP.NET, we just pass the button's name in the form data
    data = {
        '__EVENTTARGET': '',
        '__EVENTARGUMENT': '',
        '__VIEWSTATE': viewstate['value'],
        '__EVENTVALIDATION': eventvalidation['value'],
        'ctl00$CPH1$DrpYear': str(year),
        'ctl00$CPH1$DrpActProy': 'Proyecto',
        'grp1': radio_value,               # Select the row
        'ctl00$CPH1$BtnMes': 'Mes'         # Click the "Mes" button
    }
    
    print("2. Requesting monthly breakdown (clicking 'Mes')")
    res2 = session.post(url, data=data, verify=False)
    
    if res2.status_code != 200:
        print(f"Error submitting form: {res2.status_code}")
        return []

    soup2 = BeautifulSoup(res2.text, 'html.parser')
    
    # Extract the rows from the resulting table
    table = soup2.find('table', class_='Data')
    if not table:
        print("Error: Monthly Data table not found in the response.")
        return []
        
    rows = table.find_all('tr')
    
    monthly_data = []
    
    for row in rows:
        cols = row.find_all('td')
        # Skip header or empty rows (monthly rows should have at least 8 columns)
        if len(cols) > 2: 
            texts = [td.text.strip().replace(',', '') for td in cols]
            
            # Usually column 1 is the Month info like "5: Mayo" or "12: Diciembre"
            mes_str = texts[1]
            if ":" in mes_str:
                num_mes = int(mes_str.split(':')[0].strip())
                
                monthly_item = {
                    "mes": num_mes,
                    "pia": float(texts[2]) if texts[2] else 0.0,
                    "pim": float(texts[3]) if texts[3] else 0.0,
                    "certificado": float(texts[4]) if texts[4] else 0.0,
                    "compromiso_anual": float(texts[5]) if texts[5] else 0.0,
                    # Atención Compromiso is texts[6]
                    "devengado": float(texts[7]) if texts[7] else 0.0,
                    "girado": float(texts[8]) if texts[8] else 0.0,
                    "avance_pct": float(texts[9]) if texts[9] else 0.0,
                }
                monthly_data.append(monthly_item)
                
    return monthly_data

if __name__ == "__main__":
    result = scrape_mef_months("2517099", 2025)
    import json
    print(json.dumps(result, indent=2))
