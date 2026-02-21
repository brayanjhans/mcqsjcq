import json
from sqlalchemy import create_engine, text

engine = create_engine('mysql+pymysql://root:123456789@localhost/mcqs-jcq')
conn = engine.connect()

result = conn.execute(text('''
    SELECT producto_proyecto, ano_eje, 
           SUM(monto_pia) as pia, 
           SUM(monto_pim) as pim, 
           SUM(monto_devengado) as devengado
    FROM mef_ejecucion
    GROUP BY producto_proyecto, ano_eje
    HAVING pim > 5500000 AND pim < 5600000
    ORDER BY pim DESC
    LIMIT 20
'''))

data = [dict(row._mapping) for row in result]
print(json.dumps([{k: float(v) if k in ['pia', 'pim', 'devengado'] else v for k, v in d.items()} for d in data], indent=2))
conn.close()
