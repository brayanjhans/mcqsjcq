import requests
import json
import time

def test_api():
    print("Esperando 5 segundos a que el servidor esté listo...")
    time.sleep(5)
    url = "http://localhost:8001/api/seace/procedimientos?search=2609069"
    try:
        print(f"Consultando: {url}")
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"Respuesta recibida: {len(data)} resultados")
            if data:
                print("Primer resultado:", data[0].get('objeto', 'N/A'))
                print("CUI:", data[0].get('cui', 'N/A'))
        else:
            print(f"Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Error de conexión: {e}")

if __name__ == "__main__":
    test_api()
