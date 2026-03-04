import re

def process_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace UPPER(col) LIKE UPPER(:val) -> col LIKE :val
    content = re.sub(r'UPPER\(([^)]+)\)\s*LIKE\s*UPPER\(:([^)]+)\)', r'\1 LIKE :\2', content)

    # Replace UPPER(col) = UPPER(:val) -> col = :val
    content = re.sub(r'UPPER\(([^)]+)\)\s*=\s*UPPER\(:([^)]+)\)', r'\1 = :\2', content)

    # Replace UPPER(col) = :val -> col = :val
    content = re.sub(r'UPPER\(([^)]+)\)\s*=\s*:([^)\s]+)', r'\1 = :\2', content)
    
    # Replace UPPER(col) LIKE :val -> col LIKE :val
    content = re.sub(r'UPPER\(([^)]+)\)\s*LIKE\s*:([^)\s]+)', r'\1 LIKE :\2', content)

    # Specific replacements for the banking blocks
    content = re.sub(r"UPPER\(la\.entidad_financiera\) LIKE '%([^']+)'", r"la.entidad_financiera LIKE '%\1'", content)
    content = re.sub(r"UPPER\(la\.entidad_financiera\) LIKE '%([^']+)%'", r"la.entidad_financiera LIKE '%\1%'", content)
    content = re.sub(r"UPPER\(la\.entidad_financiera\) = '([^']+)'", r"la.entidad_financiera = '\1'", content)
    
    # Final cleanup if any UPPER(la.entidad_financiera) remains
    content = re.sub(r'UPPER\(la\.entidad_financiera\)', 'la.entidad_financiera', content)
    content = re.sub(r'UPPER\(nombre_miembro\)', 'nombre_miembro', content)
    content = re.sub(r'UPPER\(ganador_nombre\)', 'ganador_nombre', content)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Processed {filepath}")

process_file(r"c:\laragon\www\gitc\garantias_seacee\app\routers\licitaciones_raw.py")
process_file(r"c:\laragon\www\gitc\garantias_seacee\app\routers\reportes.py")
process_file(r"c:\laragon\www\gitc\garantias_seacee\app\routers\tendencias.py")
