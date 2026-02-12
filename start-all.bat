@echo off
echo ========================================
echo EJECUTANDO BACKEND Y FRONTEND
echo ========================================
echo.

echo [1/2] Iniciando Backend FastAPI...
echo [1/2] Iniciando Backend FastAPI...
start "SEACE Backend" cmd /k "cd /d %~dp0 && call .\venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] Iniciando Frontend Next.js...
start "SEACE Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo Servidores Iniciados!
echo ========================================
echo.
echo Backend:  http://localhost:8000/docs
echo Frontend: http://localhost:3000
echo.
echo Abriendo navegador...
start http://localhost:3000

echo.
echo Presiona cualquier tecla para cerrar esta ventana...
echo (Los servidores seguiran corriendo en sus propias ventanas)
pause >nul
