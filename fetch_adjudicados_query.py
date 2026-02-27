import requests
import json
import urllib3
urllib3.disable_warnings()

url = 'https://prod4.seace.gob.pe:9000/api/bus/adjudicados?idConvocatoria=1176751'
headers = {'User-Agent': 'Mozilla/5.0'}
r = requests.get(url, headers=headers, verify=False, timeout=10)
print('Status:', r.status_code)

try:
    data = r.json()
    print('\nEstructura general:')
    if isinstance(data, list):
        for adj in data:
            postor = adj.get('postor', {})
            nombre_postor = adj.get('postorNombre') or postor.get('nombre')
            docs = adj.get('listaDocumentos', [])
            print(f'- Postor Adjudicado: {nombre_postor}')
            print(f'  Total documentos anexados a esta propuesta: {len(docs)}')
            for d in docs:
                print(f"    [ID Alfresco: {d.get('alfId')}] Documento '{d.get('nombreArchivo')}' -> {d.get('tipoDocumento')}")
except Exception as e:
    print('Failed extracting JSON', e)
