import pymysql
import logging
import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

LOCAL_DB = {
    'host': 'localhost', 'user': 'root', 'password': '123456789',
    'db': 'mcqs-jcq', 'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

TARGET_FILE = 'vps_deploy.sql'

def generate_sql():
    conn = pymysql.connect(**LOCAL_DB)
    try:
        with conn.cursor() as cur:
            # 1. Schema Fixes (ALTER TABLE ADD COLUMN IF NOT EXISTS equivalent logic)
            # Para MySQL lo hacemos con un bloque PROCEDURE para mayor robustez
            sql_header = """-- Sincronización de Estructura y Datos
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DELIMITER //
CREATE PROCEDURE add_col_if_not_exists(IN tbl VARCHAR(64), IN col VARCHAR(64), IN col_type VARCHAR(64))
BEGIN
  IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col) THEN
    SET @s = CONCAT('ALTER TABLE ', tbl, ' ADD COLUMN ', col, ' ', col_type);
    PREPARE stmt FROM @s;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL add_col_if_not_exists('detalle_consorcios', 'nombre_consorcio', 'varchar(500)');
CALL add_col_if_not_exists('detalle_consorcios', 'entidad_contratante', 'varchar(500)');
CALL add_col_if_not_exists('detalle_consorcios', 'categoria_objeto', 'varchar(50)');
CALL add_col_if_not_exists('detalle_consorcios', 'descripcion_objeto', 'text');
CALL add_col_if_not_exists('detalle_consorcios', 'monto_contrato_original', 'decimal(20,2)');
CALL add_col_if_not_exists('detalle_consorcios', 'moneda_contrato', 'varchar(10)');

DROP PROCEDURE add_col_if_not_exists;

-- Refuerzo de Clave Única
DELIMITER //
CREATE PROCEDURE fix_unique_key()
BEGIN
  -- Borrar índices viejos si existen
  IF EXISTS (SELECT * FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'detalle_consorcios' AND INDEX_NAME = 'uk_miembro') THEN
    ALTER TABLE detalle_consorcios DROP INDEX uk_miembro;
  END IF;
  IF EXISTS (SELECT * FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'detalle_consorcios' AND INDEX_NAME = 'uk_contrato_ruc') THEN
    ALTER TABLE detalle_consorcios DROP INDEX uk_contrato_ruc;
  END IF;
  -- Crear el nuevo
  ALTER TABLE detalle_consorcios ADD UNIQUE KEY uk_contrato_ruc (id_contrato, ruc_miembro);
END //
DELIMITER ;
CALL fix_unique_key();
DROP PROCEDURE fix_unique_key();

"""
            
            with open(TARGET_FILE, 'w', encoding='utf-8') as f:
                f.write(sql_header)
                
                # 2. Data Export (REPLACE INTO)
                logging.info("Extrayendo datos de detalle_consorcios...")
                cur.execute("SELECT * FROM detalle_consorcios")
                
                rows_processed = 0
                while True:
                    rows = cur.fetchmany(1000)
                    if not rows:
                        break
                    
                    for r in rows:
                        cols = []
                        vals = []
                        for k, v in r.items():
                            if k == 'id': continue # No queremos sobreescribir IDs auto-increment si es posible
                            cols.append(f"`{k}`")
                            if v is None:
                                vals.append("NULL")
                            elif isinstance(v, (int, float, Decimal)) if 'Decimal' in globals() else isinstance(v, (int, float)):
                                vals.append(str(v))
                            elif isinstance(v, (datetime.date, datetime.datetime)):
                                vals.append(f"'{str(v)}'")
                            else:
                                # Escapar strings manualmente es tedioso, usaremos escape_string de pymysql
                                escaped = pymysql.converters.escape_string(str(v))
                                vals.append(f"'{escaped}'")
                        
                        f.write(f"REPLACE INTO detalle_consorcios ({', '.join(cols)}) VALUES ({', '.join(vals)});\n")
                    
                    rows_processed += len(rows)
                    if rows_processed % 10000 == 0:
                        logging.info(f"Progreso: {rows_processed} filas escritas...")

            logging.info(f"Archivo {TARGET_FILE} generado exitosamente con {rows_processed} registros.")
            
    finally:
        conn.close()

from decimal import Decimal
if __name__ == "__main__":
    generate_sql()
