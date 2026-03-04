import re
import sys

with open(r"c:\laragon\www\gitc\garantias_seacee\app\routers\dashboard_raw.py", "r", encoding="utf-8") as f:
    content = f.read()

# We replace the year and month logic with a combined date bounds logic

pattern = r'''(        if year [^>]*> 0:
            where_clauses\.append\("YEAR\(c?\.?fecha_publicacion\) = :year"\)
            params\[["']year["']\] = year
        if mes and mes > 0:
            where_clauses\.append\("MONTH\(c?\.?fecha_publicacion\) = :mes"\)
            params\[["']mes["']\] = mes)'''

# We will replace it with:
replacement_no_alias = '''        if year and year > 0:
            if mes and mes > 0:
                import calendar
                last_day = calendar.monthrange(year, mes)[1]
                where_clauses.append("fecha_publicacion >= :date_start AND fecha_publicacion <= :date_end")
                params['date_start'] = f"{year}-{mes:02d}-01"
                params['date_end'] = f"{year}-{mes:02d}-{last_day}"
            else:
                where_clauses.append("fecha_publicacion >= :date_start AND fecha_publicacion <= :date_end")
                params['date_start'] = f"{year}-01-01"
                params['date_end'] = f"{year}-12-31"
        elif mes and mes > 0:
            # Only month across all years 
            where_clauses.append("MONTH(fecha_publicacion) = :mes")
            params['mes'] = mes'''

replacement_c_alias = '''        if year and year > 0:
            if mes and mes > 0:
                import calendar
                last_day = calendar.monthrange(year, mes)[1]
                where_clauses.append("c.fecha_publicacion >= :date_start AND c.fecha_publicacion <= :date_end")
                params['date_start'] = f"{year}-{mes:02d}-01"
                params['date_end'] = f"{year}-{mes:02d}-{last_day}"
            else:
                where_clauses.append("c.fecha_publicacion >= :date_start AND c.fecha_publicacion <= :date_end")
                params['date_start'] = f"{year}-01-01"
                params['date_end'] = f"{year}-12-31"
        elif mes and mes > 0:
            # Only month across all years 
            where_clauses.append("MONTH(c.fecha_publicacion) = :mes")
            params['mes'] = mes'''

# Manually replace each occurrence (6 places)
def replacer(match):
    text = match.group(0)
    if "c.fecha_publicacion" in text:
        return replacement_c_alias
    else:
        return replacement_no_alias

new_content = re.sub(pattern, replacer, content)

with open(r"c:\laragon\www\gitc\garantias_seacee\app\routers\dashboard_raw.py", "w", encoding="utf-8") as f:
    f.write(new_content)

print(f"Replaced {content.count('YEAR(fecha_publicacion)') + content.count('YEAR(c.fecha_publicacion)')} occurrences of YEAR().")
