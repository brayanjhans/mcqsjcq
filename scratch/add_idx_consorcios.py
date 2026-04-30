import sqlalchemy
from sqlalchemy import create_engine, text

engine = create_engine('mysql+pymysql://root:123456789@localhost/mcqs-jcq')

with engine.connect() as con:
    try:
        con.execute(text("CREATE INDEX idx_detalle_consorcios_contrato ON detalle_consorcios(id_contrato);"))
        print("Index created successfully!")
    except Exception as e:
        print(f"Error (might already exist): {e}")
