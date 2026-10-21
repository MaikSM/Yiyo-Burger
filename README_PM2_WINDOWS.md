# Configuración de PM2 en Windows Server (AWS EC2)

## 1. Instalación de PM2 globalmente

```powershell
npm install -g pm2
```

## 2. Compilar la aplicación (si no está compilada)

```powershell
cd C:\Users\Administrator\Desktop\Restausync Oficcial\Restausync Oficcial v1\backend
npm run build
```

## 3. Iniciar la aplicación con PM2

```powershell
cd C:\Users\Administrator\Desktop\Restausync Oficcial\Restausync Oficcial v1\backend
pm2 start dist/app.js --name restausync-backend
```

## 4. Comandos esenciales de PM2

```powershell
# Ver estado de procesos
pm2 list
pm2 status

# Ver logs en tiempo real
pm2 logs restausync-backend

# Reiniciar la aplicación
pm2 restart restausync-backend

# Detener la aplicación
pm2 stop restausync-backend

# Eliminar de PM2
pm2 delete restausync-backend
```

## 5. Guardar procesos (persistencia)

```powershell
# Guardar el estado actual de PM2
pm2 save
```

## 6. Configurar inicio automático en Windows

### Opción 1: Generar script de inicio para Windows

```powershell
pm2 startup windows
```

Esto generará un comando como:
```powershell
pm2 start "C:\Users\Administrator\AppData\Roaming\npm\node_modules\pm2\bin\pm2" --name PM2
```

### Opción 2: Crear servicio de Windows usando nssm (recomendado)

1. Descargar nssm: https://nssm.cc/download
2. Extraer y copiar nssm.exe a una carpeta del sistema

```powershell
# Crear servicio de Windows
C:\ruta\nssm.exe install RestauSyncBackend "C:\Program Files\nodejs\node.exe" "C:\Users\Administrator\Desktop\Restausync Oficcial\Restausync Oficcial v1\backend\dist\app.js"

# Configurar directorio de trabajo
C:\ruta\nssm.exe set RestauSyncBackend AppDirectory "C:\Users\Administrator\Desktop\Restausync Oficcial\Restausync Oficcial v1\backend"

# Iniciar el servicio
C:\ruta\nssm.exe start RestauSyncBackend
```

### Opción 3: Usar el módulo de inicio de PM2 (más simple)

```powershell
# Instalar el módulo de inicio
pm2 install pm2-windows-startup

# Configurar para iniciar al arrancar
pm2 startup
```

## 7. Configuración completa recomendada

Crea un archivo `ecosystem.config.js` en la raíz del backend:

```javascript
module.exports = {
  apps: [{
    name: 'restausync-backend',
    script: './dist/app.js',
    cwd: 'C:\\Users\\Administrator\\Desktop\\Restausync Oficcial\\Restausync Oficcial v1\\backend',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 4003
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

## 8. Comandos finales para poner en producción

```powershell
# 1. Compilar
cd C:\Users\Administrator\Desktop\Restausync Oficcial\Restausync Oficcial v1\backend
npm run build

# 2. Crear carpeta de logs
mkdir logs

# 3. Iniciar con PM2 usando el archivo de configuración
pm2 start ecosystem.config.js

# 4. Guardar estado
pm2 save

# 5. Configurar inicio automático
pm2 startup
```

## Notas importantes

- PM2 en Windows funciona pero tiene algunas limitaciones comparado con Linux
- Para producción en Windows Server, considera usar **IIS** con **iisnode** para mejor integración
- Si usas PM2, asegúrate de que el servicio de PM2 esté configurado para iniciar automáticamente
- Los logs se guardarán en la carpeta `logs` del backend
