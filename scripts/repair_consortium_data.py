import mysql.connector
import os
import sys
import re
import logging
from dotenv import load_dotenv

# --- CONFIGURATION ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Load .env from project root
script_path = os.path.abspath(__file__)
project_root = os.path.dirname(os.path.dirname(script_path))
sys.path.append(project_root)
load_dotenv(os.path.join(project_root, ".env"))

DB_CONFIG = {
    'host': os.getenv("DB_HOST"),
    'user': os.getenv("DB_USER"),
    'password': os.getenv("DB_PASS"),
    'database': os.getenv("DB_NAME"),
    'charset': 'utf8mb4'
}

def get_connection():
    return mysql.connector.connect(**DB_CONFIG)

def repair_consortium_data():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
    logging.info("🚀 STARTING CONSORTIUM DATA REPAIR")
    
    try:
        # 1. Identify Orphaned Records (id_contrato is None/Empty)
        # We process them by RUC group to handle duplicates efficiently
        sql_orphans = """
            SELECT ruc_miembro, COUNT(*) as count 
            FROM detalle_consorcios 
            WHERE (id_contrato IS NULL OR id_contrato = '' OR id_contrato = 'None')
            GROUP BY ruc_miembro
        """
        cursor.execute(sql_orphans)
        orphan_groups = cursor.fetchall()
        
        logging.info(f"Found {len(orphan_groups)} groups of orphaned records.")
        
        fixed_count = 0
        deleted_count = 0
        
        for group in orphan_groups:
            ruc_target = group['ruc_miembro']
            
            # Find the correct adjudication for this RUC (if it's the winner RUC)
            # This logic assumes the 'ruc_miembro' in the bad data is actually the Consortium RUC
            sql_find_adj = """
                SELECT id_adjudicacion, ganador_nombre 
                FROM licitaciones_adjudicaciones 
                WHERE ganador_ruc = %s
                LIMIT 1
            """
            cursor.execute(sql_find_adj, (ruc_target,))
            adj = cursor.fetchone()
            
            if not adj:
                logging.warning(f"⚠️ No matching adjudication found for RUC {ruc_target}. Skipping group.")
                continue
                
            target_id = adj['id_adjudicacion']
            logging.info(f"Processing RUC {ruc_target} -> Target ID: {target_id}")
            
            # Get all orphaned rows for this RUC
            sql_get_rows = """
                SELECT id, nombre_miembro 
                FROM detalle_consorcios 
                WHERE (id_contrato IS NULL OR id_contrato = '' OR id_contrato = 'None')
                AND ruc_miembro = %s
            """
            cursor.execute(sql_get_rows, (ruc_target,))
            rows = cursor.fetchall()
            
            # Track processed members to avoid duplicates
            processed_members = set()
            
            for row in rows:
                row_id = row['id']
                raw_name = row['nombre_miembro']
                
                # Default values
                final_name = raw_name
                final_ruc = ruc_target # Needs to be corrected if it's the consortium RUC!
                
                # Check for composite name (RUC - Name)
                # Clean up new lines or weird spaces
                clean_name = raw_name.replace('\n', ' ').strip()
                match = re.match(r'^(\d{11})\s*-\s*(.+)$', clean_name)
                
                if match:
                    final_ruc = match.group(1)
                    final_name = match.group(2).strip()
                    logging.info(f"   -> Extracted real member: {final_ruc} - {final_name}")
                else:
                    # If it's just a name, we keep it. But we should try to NOT use the consortium RUC 
                    # as the member RUC if possible. For now, we keep the existing RUC 
                    # unless it's clearly the consortium RUC and we want to avoid that?
                    # The user accepted T&C with the consortium RUC in the manual fix, so we proceed similarly.
                    pass
                
                # KEY: Deduplication check
                # If we already processed this member (Name + RUC) for this ID, delete this row
                member_key = (final_ruc, final_name)
                
                if member_key in processed_members:
                    logging.info(f"   🗑️ Deleting duplicate row {row_id}")
                    cursor.execute("DELETE FROM detalle_consorcios WHERE id = %s", (row_id,))
                    deleted_count += 1
                else:
                    # Update the row
                    # We update id_contrato AND potentially correct the RUC/Name
                    sql_update = """
                        UPDATE detalle_consorcios 
                        SET id_contrato = %s, ruc_miembro = %s, nombre_miembro = %s
                        WHERE id = %s
                    """
                    cursor.execute(sql_update, (target_id, final_ruc, final_name, row_id))
                    processed_members.add(member_key)
                    fixed_count += 1
                    
        conn.commit()
        logging.info(f"✅ REPAIR COMPLETE: Fixed {fixed_count} rows, Deleted {deleted_count} duplicates.")
        
    except mysql.connector.Error as err:
        logging.error(f"❌ Database error: {err}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    if not os.getenv("DB_HOST"):
        logging.error("❌ Environment variables not loaded. Check .env file.")
        sys.exit(1)
    repair_consortium_data()
