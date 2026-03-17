---
description: Ejecutar sincronización de BD local a VPS (Datos nuevos)
---

# Sincronización DB Local ➡️ VPS

Este flujo de trabajo automatiza: (1) La extracción de nueva data del portal OSCE hacia tu base de datos local y, (2) la subida o sincronización de estos datos frescos hacia la base de datos de producción (VPS), esquivando bloqueos del portal OSCE (Cloudflare).

## Pasos

1. Ejecuta el pipeline maestro de Python de forma local. Esto garantiza que extraigamos los enlaces de descargas de 2026 más recientes y hagamos el INSERT/UPDATE en MySQL de forma local primero eliminando solo lo obsoleto (incremental).

// turbo
```bash
.\venv\Scripts\python 0_pipeline_maestro.py --years 2026
```

2. Ejecuta el script de sincronización con Python, el cual extrae los datos recién importados en local a un CSV, los sube por SFTP, y hace un `REPLACE INTO` en la BD MySQL remota.

// turbo
```bash
.\venv\Scripts\python scripts\sync_2026_db.py
```

2. Verifica si el script de actualización tiene configurado el año correcto buscando la palabra clave `2026` dentro del archivo `scripts\sync_2026_db.py`. Si se necesita otro año, modifícalo en el script antes de ejecutar.
