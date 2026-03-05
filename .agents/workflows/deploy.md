---
description: Deploy completo al VPS (commit + push + build + restart)
---

# Deploy Completo al VPS

Este workflow despliega los cambios locales del proyecto **garantias_seacee** al servidor de producción VPS.

// turbo-all

## Arquitectura del VPS

El VPS (`72.61.219.79`) tiene **3 procesos PM2**:

| Proceso PM2 | Directorio en VPS | Función |
|---|---|---|
| `api-mcqs` | `/home/admin/public_html/api` | Backend FastAPI (uvicorn) |
| `seace-frontend` | `/home/api-user/htdocs/api.mcqs-jcq.com/frontend` | **Frontend que sirve el sitio `mcqs-jcq.com`** |
| `frontend-prod` | `/home/admin/repositories/garantias_seacee/frontend` | Frontend secundario (NO sirve el sitio principal) |

> **IMPORTANTE**: El frontend que realmente sirve `mcqs-jcq.com` es el proceso `seace-frontend` en `/home/api-user/htdocs/api.mcqs-jcq.com`. Si solo actualizas `frontend-prod`, el sitio NO cambiará.

## Credenciales

- **SSH**: `root@72.61.219.79` / password: `Contra159753#`
- **MySQL**: usuario `mcqs-jcq` / password `mcqs-jcq` / base de datos `mcqs-jcq`
- **GitHub**: `https://github.com/brayanjhans/mcqsjcq.git` (rama `main`)

## Pasos

### 1. Commit y push a GitHub

```bash
cd c:\laragon\www\gitc\garantias_seacee; git add -A; git commit -m "DESCRIPCION_DEL_CAMBIO"; git push origin main
```

### 2. Ejecutar script de deploy al VPS

```bash
$env:PYTHONPATH="."; .\venv\Scripts\python scripts\deploy_full_vps.py
```

Este script automáticamente:
- Hace `git reset --hard origin/main` en el **backend** y en el **frontend de serving**
- Borra `.next` y ejecuta `npm run build` en el frontend
- Reinicia `api-mcqs` y `seace-frontend` en PM2
- Toma aprox. 2-3 minutos por el build de Next.js

### 3. Verificar (opcional)

Abrir en el navegador `https://mcqs-jcq.com` y hacer **Ctrl+Shift+R** para forzar recarga sin caché.

## Si hay cambios de base de datos (ALTER TABLE, nuevas columnas, etc.)

Crear un script Python con paramiko que se conecte por SSH y ejecute los comandos MySQL:

```python
import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("72.61.219.79", username="root", password="Contra159753#", timeout=15)
sql = "ALTER TABLE nombre_tabla ADD COLUMN nueva_col VARCHAR(500) DEFAULT NULL;"
_, o, e = ssh.exec_command(f'mysql -umcqs-jcq -pmcqs-jcq mcqs-jcq -e "{sql}"')
print(o.read().decode(), e.read().decode())
ssh.close()
```

## Notas

- Usar `py` en vez de `python` para scripts locales en Windows
- El frontend usa Next.js, el build genera archivos estáticos en `.next/`
- Si el build falla, revisar los logs con: `pm2 logs seace-frontend --lines 50`
- El dominio `mcqs-jcq.com` apunta al frontend; `api.mcqs-jcq.com` apunta al backend
