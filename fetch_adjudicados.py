import requests
import json
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

url = 'https://prod4.seace.gob.pe:9000/api/bus/adjudicados/idConvocatoria/1176751'
headers = {'User-Agent': 'Mozilla/5.0'}

try:
    r = requests.get(url, headers=headers, verify=False, timeout=10)
    data = r.json()
    
    docs_encontrados = []
    
    def find_docs(obj, context=""):
        if isinstance(obj, dict):
            if 'alfId' in obj or 'idAlfresco' in obj:
                docs_encontrados.append(obj)
            for k, v in obj.items():
                find_docs(v, k)
        elif isinstance(obj, list):
            for obj_i in obj:
                find_docs(obj_i, context)
                
    if isinstance(data, list):
        for index, item in enumerate(data):
            docs_encontrados = []
            nombre = item.get("postorNombre", "Desconocido")
            if not nombre and "postor" in item:
                nombre = item["postor"].get("nombre", "Desconocido")
                
            print(f"--- POSTOR: {nombre} ---")
            find_docs(item)
            for d in docs_encontrados:
                nombre_archivo = d.get('nombreArchivo') or d.get('nombre')
                alf_id = d.get('alfId') or d.get('idAlfresco')
                print(f"Documento: {nombre_archivo} -> Alfresco ID: {alf_id}")
            print("\n")
            
except Exception as e:
    print('Fallo:', e)
