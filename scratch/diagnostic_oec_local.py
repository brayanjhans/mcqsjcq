import requests
import pymysql
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456789',
    'db': 'mcqs-jcq',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

def investigate():
    conn = pymysql.connect(**DB_CONFIG)
    with conn.cursor() as cur:
        # Piquemos 10 IDs que están en la lista de lo que carga masiva trataría (sin year filter, force=False)
        # Probemos de varios años
        cur.execute("""
            SELECT a.id_contrato, YEAR(c.fecha_publicacion) as anio
            FROM licitaciones_adjudicaciones a
            INNER JOIN licitaciones_cabecera c ON a.id_convocatoria = c.id_convocatoria
            WHERE a.id_contrato IS NOT NULL AND a.id_contrato != ''
              AND a.id_contrato NOT IN (SELECT id_contrato FROM detalle_consorcios WHERE id_contrato IS NOT NULL)
            ORDER BY a.id_contrato DESC
            LIMIT 20
        """)
        rows = cur.fetchall()
    conn.close()

    print(f"Investigando {len(rows)} contratos pendientes...")
    
    headers = {'User-Agent': 'Mozilla/5.0'}
    url_base = 'https://eap.oece.gob.pe/perfilprov-bus/1.0/contratacion/{}/ficha'

    for r in rows:
        idc = r['id_contrato']
        anio = r['anio']
        id_oec = idc if '@' in idc else f"1@{idc}"
        
        try:
            resp = requests.get(url_base.format(id_oec), headers=headers, verify=False, timeout=10)
            status = resp.status_code
            res_code = "ERR"
            msg = "None"
            if status == 200:
                data = resp.json()
                res_code = data.get('resultadoT01', {}).get('codigo')
                msg = data.get('resultadoT01', {}).get('mensaje')
            
            print(f"ID: {id_oec:12} | Año: {anio} | Status: {status} | Cod: {res_code:3} | Msg: {msg}")
        except Exception as e:
            print(f"ID: {id_oec:12} | Error: {e}")

if __name__ == "__main__":
    investigate()
