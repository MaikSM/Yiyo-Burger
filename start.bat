@echo off
echo ========================================
echo         INICIANDO RESTAUSYNC
echo ========================================
echo.

echo Verificando archivos de configuracion...
if not exist "backend\.env" (
    echo ERROR: No se encontro el archivo .env en backend/
    echo Copia .env.example como .env y configura tus variables
    echo.
    pause
    exit /b 1
)

echo Verificando builds...
if not exist "backend\dist" (
    echo AVISO: Backend no esta construido. Ejecutando build...
    call npm run build:backend
    if %errorlevel% neq 0 (
        echo ERROR: Fallo al construir backend
        pause
        exit /b 1
    )
)

if not exist "frontend\dist" (
    echo AVISO: Frontend no esta construido. Ejecutando build...
    call npm run build:frontend
    if %errorlevel% neq 0 (
        echo ERROR: Fallo al construir frontend
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo    Iniciando servicios...
echo ========================================
echo.

echo [1/2] Iniciando Backend...
start "Backend - Restausync" cmd /k "npm run dev:backend"

timeout /t 3 /nobreak > nul

echo [2/2] Iniciando Frontend...
start "Frontend - Restausync" cmd /k "npm run dev:frontend"

echo.
echo ========================================
echo    SERVICIOS INICIADOS!
echo ========================================
echo.
echo Backend: http://localhost:4001/api/v1
echo Frontend: http://localhost:4200
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause > nul