import pymysql
conn = pymysql.connect(host='localhost', user='root', password='123456789',
                       db='mcqs-jcq', charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor)
with conn.cursor() as cur:
    cur.execute("""
        SELECT d.id_contrato,
               MAX(d.nombre_consorcio) as nombre_consorcio,
               MAX(d.entidad_contratante) as entidad_contratante,
               MAX(d.monto_contrato_original) as monto_contrato_original,
               MAX(d.moneda_contrato) as moneda_contrato,
               MAX(d.fecha_firma_contrato) as fecha_firma_contrato,
               MAX(d.fecha_prevista_fin) as fecha_prevista_fin,
               COUNT(*) as n_miembros
        FROM detalle_consorcios d
        WHERE d.fuente_api = 'OEC_FICHA'
          AND d.monto_contrato_original IS NOT NULL
          AND d.nombre_consorcio IS NOT NULL
          AND d.telefono_miembro IS NOT NULL
        GROUP BY d.id_contrato
        HAVING n_miembros >= 2
        ORDER BY MAX(d.monto_contrato_original) DESC
        LIMIT 5
    """)

    print("=== TOP 5 CONTRATOS COMPLETOS ===")
    for r in cur.fetchall():
        idc = r['id_contrato']
        print()
        print(f"  id_contrato  : {idc}")
        print(f"  Consorcio    : {r['nombre_consorcio']}")
        print(f"  Entidad      : {r['entidad_contratante']}")
        print(f"  Monto        : {r['moneda_contrato']} {r['monto_contrato_original']:,.2f}")
        print(f"  Firma        : {r['fecha_firma_contrato']}")
        print(f"  Fin previsto : {r['fecha_prevista_fin']}")
        print(f"  N miembros   : {r['n_miembros']}")
        print(f"  URL API OEC  : https://eap.oece.gob.pe/perfilprov-bus/1.0/contratacion/1@{idc}/ficha")

    # Mostrar miembros del primero
    cur.execute("""
        SELECT d.id_contrato,
               MAX(d.monto_contrato_original) as monto_contrato_original,
               COUNT(*) as n_miembros
        FROM detalle_consorcios d
        WHERE d.fuente_api = 'OEC_FICHA'
          AND d.monto_contrato_original IS NOT NULL
          AND d.nombre_consorcio IS NOT NULL
          AND d.telefono_miembro IS NOT NULL
        GROUP BY d.id_contrato
        HAVING n_miembros >= 2
        ORDER BY MAX(d.monto_contrato_original) DESC
        LIMIT 1
    """)
    top1 = cur.fetchone()
    if top1:
        print(f"\n=== DETALLE MIEMBROS DEL CONTRATO {top1['id_contrato']} ===")
        cur.execute("""
            SELECT ruc_miembro, nombre_miembro, porcentaje_participacion,
                   telefono_miembro, email_miembro, cmc_miembro, tipo_contribuyente, es_apto_contratar
            FROM detalle_consorcios
            WHERE id_contrato = %s AND fuente_api = 'OEC_FICHA'
        """, (top1['id_contrato'],))
        for m in cur.fetchall():
            print(f"  RUC   : {m['ruc_miembro']}")
            print(f"  Nombre: {m['nombre_miembro']}")
            print(f"  Part. : {m['porcentaje_participacion']}%")
            print(f"  Tel   : {m['telefono_miembro']}")
            print(f"  Email : {m['email_miembro']}")
            print(f"  CMC   : {m['cmc_miembro']}")
            print(f"  Tipo  : {m['tipo_contribuyente']}")
            print(f"  Apto  : {'SI' if m['es_apto_contratar'] else 'NO'}")
            print()

conn.close()
