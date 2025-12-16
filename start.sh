#!/bin/bash

echo "========================================"
echo "        INICIANDO RESTAUSYNC"
echo "========================================"
echo

echo "Verificando archivos de configuración..."
if [ ! -f "backend/.env" ]; then
    echo "ERROR: No se encontró el archivo .env en backend/"
    echo "Copia .env.example como .env y configura tus variables"
    echo
    exit 1
fi

echo "Verificando builds..."
if [ ! -d "backend/dist" ]; then
    echo "AVISO: Backend no está construido. Ejecutando build..."
    npm run build:backend
    if [ $? -ne 0 ]; then
        echo "ERROR: Fallo al construir backend"
        exit 1
    fi
fi

if [ ! -d "frontend/dist" ]; then
    echo "AVISO: Frontend no está construido. Ejecutando build..."
    npm run build:frontend
    if [ $? -ne 0 ]; then
        echo "ERROR: Fallo al construir frontend"
        exit 1
    fi
fi

echo
echo "========================================"
echo "   Iniciando servicios..."
echo "========================================"
echo

echo "[1/2] Iniciando Backend..."
npm run dev:backend &
BACKEND_PID=$!

sleep 3

echo "[2/2] Iniciando Frontend..."
npm run dev:frontend &
FRONTEND_PID=$!

echo
echo "========================================"
echo "   SERVICIOS INICIADOS!"
echo "========================================"
echo
echo "Backend: http://localhost:4001/api/v1"
echo "Frontend: http://localhost:4200"
echo
echo "Presiona Ctrl+C para detener todos los servicios"

# Función para manejar la señal de interrupción
cleanup() {
    echo
    echo "Deteniendo servicios..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✓ Servicios detenidos"
    exit 0
}

# Configurar el manejador de señales
trap cleanup SIGINT SIGTERM

# Esperar a que los procesos terminen
wait