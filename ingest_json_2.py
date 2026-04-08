import sys, json
sys.path.insert(0, '1_motor_etl')
from cargador_ocds_osce import process_record, guardar_bd

with open('data_ocds_2.json', 'r', encoding='utf-8') as f:
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
        print('CAB State:', cab['estado_proceso'])
        print('ADJ Count:', len(adj_list))

if batch_cabeceras:
    guardar_bd(batch_cabeceras, batch_adjudicaciones)
    print('OK.')
