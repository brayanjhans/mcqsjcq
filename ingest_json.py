import sys, json
sys.path.insert(0, '1_motor_etl')
from cargador_ocds_osce import process_record, guardar_bd

with open('data_ocds.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

records = data.get('records', [])
if not records:
    records = [data]

batch_cabeceras = []
batch_adjudicaciones = []

for rec in records:
    cab, adj_list = process_record(rec)
    if cab:
        batch_cabeceras.append(cab)
        batch_adjudicaciones.extend(adj_list)

# We must ensure there is no 'None' objects inside tuples
if batch_cabeceras:
    print('Guardando bd local...')
    guardar_bd(batch_cabeceras, batch_adjudicaciones)
    print('OK.')
else:
    print('No data to ingest.')

