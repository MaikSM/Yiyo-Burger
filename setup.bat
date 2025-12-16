@echo off
echo ========================================
echo    RESTAUSYNC - Configuracion Inicial
echo ========================================
echo.

echo [1/4] Instalando dependencias...
call npm run install:all
if %errorlevel% neq 0 (
    echo ERROR: Fallo al instalar dependencias
    pause
    exit /b 1
)
echo ✓ Dependencias instaladas correctamente
echo.

echo [2/4] Construyendo backend...
call npm run build:backend
if %errorlevel% neq 0 (
    echo ERROR: Fallo al construir backend
    pause
    exit /b 1
)
echo ✓ Backend construido correctamente
echo.

echo [3/4] Construyendo frontend...
call npm run build:frontend
if %errorlevel% neq 0 (
    echo ERROR: Fallo al construir frontend
    pause
    exit /b 1
)
echo ✓ Frontend construido correctamente
echo.

echo [4/4] Verificando configuracion...
if not exist "backend\.env" (
    echo AVISO: No se encontro archivo .env en backend/
    echo Copia el archivo .env.example como .env y configura tus variables
    echo.
)
echo ✓ Verificacion completada
echo.

echo ========================================
echo    CONFIGURACION COMPLETADA!
echo ========================================
echo.
echo Para iniciar el proyecto:
echo   Backend:  npm run dev:backend
echo   Frontend: npm run dev:frontend
echo.
echo Asegúrate de tener MySQL corriendo y la base de datos creada.
echo.
pause