import pymysql
import csv
import sys

DB_CONFIG = {
    'host': '127.0.0.1',
    'user': 'mcqs-jcq',
    'password': 'mcqs-jcq',
    'db': 'mcqs-jcq',
    'charset': 'utf8mb4',
    'autocommit': True
}

# REGLA: Si el usuario modificó un campo manualmente en el VPS, NO se sobreescribirá.
# COALESCE preserva el valor del VPS si ya existe; solo rellena si está vacío/NULL.
COALESCE_FIELDS = {
    'licitaciones_cabecera': [
        'estado_proceso', 'descripcion', 'proyecto', 'cui'
    ],
    'licitaciones_adjudicaciones': [
        # Datos del ganador/consorcio
        'ganador_nombre', 'ganador_ruc',
        'rucs_consorciados', 'nombres_consorciados', 'total_miembros',
        # Montos y fechas contractuales
        'monto_adjudicado', 'monto_final', 'moneda',
        'fecha_adjudicacion', 'fecha_fin_contrato',
        # Garantías y documentos
        'entidad_financiera', 'tipo_garantia',
        'url_pdf_contrato', 'url_pdf_consorcio', 'url_pdf_cartafianza',
        'url_pdf_oferta', 'doc_completo',
        'fiel_cumplimiento', 'adelanto_materiales', 'adelanto_directo',
        # Estado y observaciones manuales
        'estado_item', 'validado', 'observaciones',
    ],
    'detalle_consorcios': [
        'ruc_miembro', 'nombre_miembro', 'porcentaje_participacion'
    ]
}

def ensure_unique_keys(conn):
    '''Crea los UNIQUE KEYs y columnas faltantes para que la sincronización funcione.
    '''
    with conn.cursor() as cursor:
        # 1. Verificar columna 'proyecto' en licitaciones_cabecera
        cursor.execute('''
            SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'licitaciones_cabecera'
            AND COLUMN_NAME = 'proyecto'
        ''')
        res = cursor.fetchone()
        cnt = res['cnt'] if isinstance(res, dict) else res[0]
        if cnt == 0:
            print("   [FIX] Añadiendo columna 'proyecto' a licitaciones_cabecera en VPS...")
            try:
                cursor.execute("ALTER TABLE licitaciones_cabecera ADD COLUMN proyecto TEXT AFTER descripcion")
                print("   [FIX] ✅ Columna 'proyecto' añadida.")
            except Exception as e:
                print(f"   [WARN] No se pudo añadir columna proyecto: {e}")

        # 2. Asegurar que 'cui' sea suficientemente largo (ej. varchar(255))
        try:
            print("   [FIX] Asegurando que 'cui' tenga longitud suficiente (varchar(255))...")
            cursor.execute("ALTER TABLE licitaciones_cabecera MODIFY COLUMN cui varchar(255)")
            print("   [FIX] ✅ Columna 'cui' ampliada.")
        except Exception as e:
            print(f"   [WARN] No se pudo ampliar columna cui: {e}")

        # 3. Verificar unique key en detalle_consorcios
        cursor.execute('''
            SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'detalle_consorcios'
            AND INDEX_NAME = 'uq_contrato_ruc'
        ''')
        result = cursor.fetchone()
        count = result['cnt'] if isinstance(result, dict) else result[0]
        if count == 0:
            print("   [FIX] Creando UNIQUE KEY (id_contrato, ruc_miembro) en detalle_consorcios...")
            try:
                cursor.execute('''
                    ALTER TABLE detalle_consorcios
                    ADD CONSTRAINT uq_contrato_ruc UNIQUE (id_contrato, ruc_miembro)
                ''')
                print("   [FIX] ✅ UNIQUE KEY creado correctamente.")
            except Exception as e:
                # Si ya existe o hay duplicados previos, lo reportamos pero continuamos
                print(f"   [WARN] No se pudo crear UNIQUE KEY: {e}")
                print("   [WARN] Se usará id_contrato solo como fallback.")
        else:
            print("   [OK] UNIQUE KEY uq_contrato_ruc ya existe en detalle_consorcios.")

        # 4. Verificar columna 'search_text' en licitaciones_cabecera
        cursor.execute('''
            SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'licitaciones_cabecera'
            AND COLUMN_NAME = 'search_text'
        ''')
        res = cursor.fetchone()
        cnt = res['cnt'] if isinstance(res, dict) else res[0]
        if cnt == 0:
            print("   [FIX] Añadiendo columna 'search_text' a licitaciones_cabecera en VPS...")
            try:
                cursor.execute("ALTER TABLE licitaciones_cabecera ADD COLUMN search_text LONGTEXT")
                print("   [FIX] ✅ Columna 'search_text' añadida.")
            except Exception as e:
                print(f"   [WARN] No se pudo añadir columna search_text: {e}")

        # 5. Asegurar que 'cui' sea TEXT (para múltiples CUIs)
        print("   [FIX] Asegurando que 'cui' sea TEXT en licitaciones_cabecera...")
        try:
            cursor.execute("ALTER TABLE licitaciones_cabecera MODIFY COLUMN cui TEXT")
            print("   [FIX] ✅ Columna 'cui' actualizada a TEXT.")
        except Exception as e:
            print(f"   [WARN] No se pudo modificar columna cui: {e}")

def import_csv(filename, table_name, conn):
    print(f"Importing {filename} into {table_name}...")
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            if not rows:
                print("No rows.")
                return

            headers = reader.fieldnames
            # Excluir el campo 'id' (auto-increment del LOCAL) para no conflictuar
            # con el auto-increment del VPS
            headers_sin_id = [h for h in headers if h != 'id']
            protected = COALESCE_FIELDS.get(table_name, [])

            cols = ", ".join([f"`{h}`" for h in headers_sin_id])
            placeholders = ", ".join(["%s"] * len(headers_sin_id))

            # Construir cláusula ON DUPLICATE KEY UPDATE
            update_parts = []
            for h in headers_sin_id:
                if h in protected:
                    # Conserva valor manual si ya existe en VPS (no es NULL ni vacío)
                    # El valor entrante de VALUES(`{h}`) ya viene como NULL desde Python si era vacío
                    update_parts.append(f"`{h}` = COALESCE(NULLIF(`{h}`, ''), VALUES(`{h}`))")
                else:
                    update_parts.append(f"`{h}` = VALUES(`{h}`)")
            update_clause = ", ".join(update_parts)

            query = (
                f"INSERT INTO {table_name} ({cols}) VALUES ({placeholders}) "
                f"ON DUPLICATE KEY UPDATE {update_clause}"
            )

            with conn.cursor() as cursor:
                batch_size = 500
                inserted = 0
                updated = 0
                for i in range(0, len(rows), batch_size):
                    batch = rows[i:i+batch_size]
                    values = []
                    for row in batch:
                        val_row = []
                        for h in headers_sin_id:
                            val = row[h]
                            if val is None:
                                val_row.append(None)
                                continue
                            val = str(val).strip()
                            if val in ('', 'None', 'NULL', 'null', 'nan', 'NaN', 'NoneType'):
                                val_row.append(None)
                            else:
                                val_row.append(val)
                        values.append(tuple(val_row))
                    
                    try:
                        cursor.executemany(query, values)
                        inserted += cursor.rowcount
                    except Exception as batch_error:
                        print(f"      [WARN] Lote falló, reintentando fila por fila en {table_name}: {batch_error}")
                        for single_val in values:
                            try:
                                cursor.execute(query, single_val)
                                inserted += cursor.rowcount
                            except Exception as row_error:
                                # Si falla una fila, logueamos el valor y seguimos con el resto
                                print(f"      [ERROR] Fila omitida en {table_name}. Error: {row_error}")
                                print(f"      [DEBUG] Valores: {single_val}")
                                continue
            print(f"   ✅ {table_name}: procesadas {len(rows)} filas (datos manuales del VPS preservados).")
    except Exception as e:
        print(f"   ❌ Error IMPORTANDO {table_name}: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1) # Forzar error para que el script local lo detecte

if __name__ == '__main__':
    print("\n>> Conectando al VPS DB...")
    conn = pymysql.connect(**DB_CONFIG)
    conn.autocommit = True

    print("\n>> Verificando/creando UNIQUE KEYs necesarios...")
    ensure_unique_keys(conn)

    import_csv('/tmp/cabecera_2026.csv', 'licitaciones_cabecera', conn)
    import_csv('/tmp/adjudicaciones_2026.csv', 'licitaciones_adjudicaciones', conn)
    import_csv('/tmp/consorcios_2026.csv', 'detalle_consorcios', conn)

    conn.close()
    print("\n>> ✅ Importación completada. Datos manuales preservados.")
