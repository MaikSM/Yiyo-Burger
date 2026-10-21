@echo off
title Restausync POS System
chcp 65001 > nul
cls

echo ===================================================
echo             INICIANDO RESTAUSYNC POS
echo ===================================================
echo.

rem Posicionarse en el directorio del script
cd /d "%~dp0"
set "ROOT_DIR=%~dp0"

rem Verificar Node.js y npm
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado o no se encuentra en el PATH.
    echo Por favor instala Node.js para poder ejecutar Restausync.
    echo.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm no esta instalado o no se encuentra en el PATH.
    echo.
    pause
    exit /b 1
)

rem Verificar carpetas backend y frontend
if not exist "%ROOT_DIR%backend" (
    echo [ERROR] No se encontro la carpeta backend en: "%ROOT_DIR%backend"
    echo.
    pause
    exit /b 1
)

if not exist "%ROOT_DIR%frontend" (
    echo [ERROR] No se encontro la carpeta frontend en: "%ROOT_DIR%frontend"
    echo.
    pause
    exit /b 1
)

rem Verificar archivo de entorno en backend
if not exist "%ROOT_DIR%backend\.env" (
    if exist "%ROOT_DIR%backend\.env.example" (
        echo [AVISO] Creando backend\.env desde .env.example...
        copy "%ROOT_DIR%backend\.env.example" "%ROOT_DIR%backend\.env" > nul
    )
)

rem Detectar la direccion IP local de la red Wi-Fi
set "LOCAL_IP=localhost"
if exist "%ROOT_DIR%get-ip.js" (
    for /f "tokens=*" %%i in ('node "%ROOT_DIR%get-ip.js"') do set "LOCAL_IP=%%i"
)

echo [1/2] Iniciando Servidor Backend (Puerto 4003)...
start "Restausync - Backend" cmd /k "cd /d "%ROOT_DIR%backend" && npm run dev"

timeout /t 2 >nul 2>&1 || ping -n 3 127.0.0.1 >nul

echo [2/2] Iniciando Servidor Frontend (Puerto 4200)...
start "Restausync - Frontend" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

echo.
echo ===================================================
echo        SERVICIOS INICIADOS CORRECTAMENTE
echo ===================================================
echo.
echo   [1] ACCESO LOCAL (en este equipo):
echo       - Frontend: http://localhost:4200
echo       - Backend:  http://localhost:4003/api/v1
echo.
echo   [2] ACCESO RED WI-FI (celulares, tablets, otros equipos):
echo       - Frontend: http://%LOCAL_IP%:4200
echo       - Backend:  http://%LOCAL_IP%:4003/api/v1
echo.
echo ===================================================
echo  Conecta los demas dispositivos a la misma red Wi-Fi
echo  y abre en el navegador: http://%LOCAL_IP%:4200
echo ===================================================
echo.
echo Espera unos segundos a que cargue el sistema...
echo.
timeout /t 6 >nul 2>&1 || ping -n 7 127.0.0.1 >nul
exit
