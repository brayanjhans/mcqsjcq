
import requests
import time

BASE_URL = "http://127.0.0.1:8000/api/licitaciones"

def benchmark_search():
    term = "ANCOL"
    print(f"Benchmarking search for: '{term}'")
    
    start_time = time.time()
    try:
        response = requests.get(BASE_URL, params={"search": term, "limit": 20})
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print(f"Success! Found {data['total']} items.")
            print(f"Time taken: {elapsed:.4f} seconds")
        else:
            print(f"Error: {response.status_code}")
            
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    benchmark_search()
