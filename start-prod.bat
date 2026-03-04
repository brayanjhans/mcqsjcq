@echo off
echo ========================================
echo MODO PRODUCCION - MQS GARANTIAS
echo ========================================
echo.

echo [1/2] Iniciando Backend (Produccion)...
start "SEACE Backend PROD" cmd /k "cd /d %~dp0 && venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] Iniciando Frontend (Produccion)...
echo NOTA: Debes haber ejecutado 'npm run build' primero.
start "SEACE Frontend PROD" cmd /k "cd /d %~dp0frontend && npm start"

timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo Sistema Iniciado en Modo Produccion
echo ========================================
echo.
echo Backend:  http://localhost:8000/docs
echo Frontend: http://localhost:3000
echo.
echo Abriendo navegador...
start http://localhost:3000

echo.
echo Presiona cualquier tecla para cerrar esta ventana...
echo (Los servidores seguiran corriendo)
pause >nul
