---
description: Ejecutar sincronización de BD local a VPS (Datos nuevos)
---

# Sincronización DB Local ➡️ VPS

Este flujo de trabajo se utiliza cuando se ha extraído nueva data del OSCE a la base de datos local y se desea subirla de manera segura a producción sin afectar los años anteriores y esquivando los bloqueos del portal OSCE en IPs de servidores (Cloudflare).

## Pasos

1. Ejecuta el script de sincronización con Python, el cual extrae los datos a un CSV, los sube por SFTP, y hace un `REPLACE INTO` en la BD MySQL remota.

// turbo
```bash
.\venv\Scripts\python scripts\sync_2026_db.py
```

2. Verifica si el script de actualización tiene configurado el año correcto buscando la palabra clave `2026` dentro del archivo `scripts\sync_2026_db.py`. Si se necesita otro año, modifícalo en el script antes de ejecutar.
