#!/bin/bash

echo "========================================"
echo "   RESTAUSYNC - Configuración Inicial"
echo "========================================"
echo

echo "[1/4] Instalando dependencias..."
npm run install:all
if [ $? -ne 0 ]; then
    echo "ERROR: Fallo al instalar dependencias"
    exit 1
fi
echo "✓ Dependencias instaladas correctamente"
echo

echo "[2/4] Construyendo backend..."
npm run build:backend
if [ $? -ne 0 ]; then
    echo "ERROR: Fallo al construir backend"
    exit 1
fi
echo "✓ Backend construido correctamente"
echo

echo "[3/4] Construyendo frontend..."
npm run build:frontend
if [ $? -ne 0 ]; then
    echo "ERROR: Fallo al construir frontend"
    exit 1
fi
echo "✓ Frontend construido correctamente"
echo

echo "[4/4] Verificando configuración..."
if [ ! -f "backend/.env" ]; then
    echo "AVISO: No se encontró archivo .env en backend/"
    echo "Copia el archivo .env.example como .env y configura tus variables"
    echo
fi
echo "✓ Verificación completada"
echo

echo "========================================"
echo "   CONFIGURACIÓN COMPLETADA!"
echo "========================================"
echo
echo "Para iniciar el proyecto:"
echo "  Backend:  npm run dev:backend"
echo "  Frontend: npm run dev:frontend"
echo
echo "Asegúrate de tener MySQL corriendo y la base de datos creada."
echo