import pymysql
from decimal import Decimal

conn = pymysql.connect(host='localhost', user='root', password='123456789',
                       db='mcqs-jcq', charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor)

with conn.cursor() as cur:

    # 1. Cobertura general por columna (solo OEC_FICHA)
    cur.execute("""
        SELECT
            COUNT(*) as total_filas,
            COUNT(porcentaje_participacion) as con_porcentaje,
            COUNT(monto_contrato_original)  as con_monto,
            COUNT(fecha_firma_contrato)     as con_fecha_firma,
            COUNT(fecha_prevista_fin)       as con_fecha_fin,
            COUNT(telefono_miembro)         as con_telefono,
            COUNT(email_miembro)            as con_email,
            COUNT(cmc_miembro)              as con_cmc,
            COUNT(tipo_contribuyente)       as con_tipo,
            COUNT(entidad_contratante)      as con_entidad,
            COUNT(nombre_consorcio)         as con_consorcio
        FROM detalle_consorcios
        WHERE fuente_api = 'OEC_FICHA'
    """)
    r = cur.fetchone()
    total = r['total_filas']
    print("=== COBERTURA DE COLUMNAS (OEC_FICHA) ===")
    for k, v in r.items():
        if k != 'total_filas':
            pct = round(v/total*100, 1) if total else 0
            print(f"  {k:30s}: {v:5d}/{total} ({pct}%)")

    # 2. Muestra de montos reales capturados
    cur.execute("""
        SELECT id_contrato, nombre_consorcio, ruc_miembro, nombre_miembro,
               porcentaje_participacion, monto_contrato_original, moneda_contrato,
               fecha_firma_contrato, fecha_prevista_fin
        FROM detalle_consorcios
        WHERE fuente_api = 'OEC_FICHA' AND monto_contrato_original IS NOT NULL
        ORDER BY monto_contrato_original DESC
        LIMIT 8
    """)
    print("\n=== TOP 8 MAYORES MONTOS CAPTURADOS ===")
    for r in cur.fetchall():
        print(f"  [{r['id_contrato']}] {str(r['nombre_miembro'])[:40]:40s} "
              f"| {r['porcentaje_participacion']}% "
              f"| {r['moneda_contrato']} {r['monto_contrato_original']:>18,.2f} "
              f"| firma:{r['fecha_firma_contrato']}")

    # 3. Cuántos contratos tienen monto capturado (a nivel contrato, no por miembro)
    cur.execute("""
        SELECT
            COUNT(DISTINCT id_contrato) as contratos_totales,
            COUNT(DISTINCT CASE WHEN monto_contrato_original IS NOT NULL THEN id_contrato END) as con_monto
        FROM detalle_consorcios WHERE fuente_api = 'OEC_FICHA'
    """)
    r = cur.fetchone()
    pct = round(r['con_monto']/r['contratos_totales']*100, 1)
    print(f"\n=== CONTRATOS DISTINTOS CON MONTO ===")
    print(f"  {r['con_monto']} de {r['contratos_totales']} contratos tienen monto ({pct}%)")

    # 4. Muestra completa de un registro real
    cur.execute("""
        SELECT * FROM detalle_consorcios
        WHERE fuente_api = 'OEC_FICHA' AND monto_contrato_original IS NOT NULL
          AND telefono_miembro IS NOT NULL AND email_miembro IS NOT NULL
        LIMIT 1
    """)
    r = cur.fetchone()
    print("\n=== EJEMPLO DE FILA COMPLETA ===")
    if r:
        for k, v in r.items():
            print(f"  {k:30s}: {v}")

conn.close()
