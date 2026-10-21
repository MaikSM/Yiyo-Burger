# Servir Angular en Puerto 80 - Windows Server (AWS EC2)

## OPCIÓN 1: Servidor Simple con `http-server` o `serve`

### Instalación de serve globally:

```powershell
npm install -g serve
```

### Crear script de inicio:

1. Compila el frontend:
```powershell
cd C:\Users\Administrator\Desktop\Restausync Oficcial\Restausync Oficcial v1\frontend
ng build --configuration=production
```

2. Crea un archivo `serve-static.bat` en la raíz del proyecto:
```batch
@echo off
cd C:\Users\Administrator\Desktop\Restausync Oficcial\Restausync Oficcial v1\frontend\dist\frontend
serve -s . -l 80
```

3. Configura PM2 para managing:
```powershell
pm2 start serve-static.bat --name restausync-frontend
pm2 save
```

### ✅ Ventajas:
- Instalación rápida
- Configuración mínima
- Compatible con SPA (Angular Router)
- Actualizaciones simples

### ❌ Desventajas:
- Menos performant que IIS/Nginx
- Sin compresión avanzada automática
- Sin cacheo de headers avanzado
- Menor seguridad integrada

---

## OPCIÓN 2: IIS (Internet Information Services) - RECOMENDADO

### Paso 1: Instalar IIS en Windows Server

1. Abre **Server Manager**
2. Click en **Add roles and features**
3. Selecciona **Web Server (IIS)**
4. Instala también:
   - **URL Rewrite** (importante para Angular Router)
   - **ASP.NET 4.8** (si no está instalado)

### Paso 2: Habilitar erforderimiento de ARR (Application Request Routing)

1. Descarga e instala **ARR 3.0** desde Microsoft:
   https://www.microsoft.com/en-us/download/details.aspx?id=47333

2. O alternativamente, habilita el módulo desde IIS Manager

### Paso 3: Configurar sitio web

1. Abre **IIS Manager**
2. Crea un nuevo sitio web:
   - Nombre: `RestauSync`
   - Ruta física: `C:\Users\Administrator\Desktop\Restausync Oficcial\Restausync Oficcial v1\frontend\dist\frontend`
   - Puerto: `80`
   - Hostname: `54.86.167.246` (tu IP elástica) o déjalo vacío

### Paso 4: Configurar URL Rewrite para Angular Router

Crea un archivo `web.config` en la carpeta `dist/frontend`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Angular Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    
    <!-- Configuración de caché para archivos estáticos -->
    <staticContent>
      <remove fileExtension=".json" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="365.00:00:00" />
    </staticContent>
    
    <!-- Headers de seguridad -->
    <httpProtocol>
      <customHeaders>
        <add name="X-Frame-Options" value="SAMEORIGIN" />
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-XSS-Protection" value="1; mode=block" />
      </customHeaders>
    </httpProtocol>
    
    <modules runAllManagedModulesForAllRequests="true" />
  </system.webServer>
</configuration>
```

### Paso 5: Habilitar CORS en IIS (si es necesario)

1. Instala **CORS Module** para IIS:
   https://www.iis.net/downloads/microsoft/iis-cors-module

2. O agrega headers CORS en web.config:
```xml
<system.webServer>
  <httpProtocol>
    <customHeaders>
      <add name="Access-Control-Allow-Origin" value="http://54.86.167.246" />
      <add name="Access-Control-Allow-Methods" value="GET, POST, PUT, DELETE, OPTIONS" />
      <add name="Access-Control-Allow-Headers" value="Content-Type, Authorization" />
    </customHeaders>
  </httpProtocol>
</system.webServer>
```

### Paso 6: Configurar compresión (opcional pero recomendado)

1. En IIS Manager, selecciona tu sitio
2. Click en **Compression**
3. Habilita **Static compression** y **Dynamic compression**

### Paso 7: Configurar SSL/HTTPS (RECOMENDADO)

1. Obtén un certificado SSL (Let's Encrypt gratis o AWS Certificate Manager)
2. En IIS, agrega binding HTTPS en el sitio
3. Configura para redirigir HTTP a HTTPS

---

## COMPARACIÓN FINAL

| Característica | serve/npm | IIS |
|---------------|-----------|-----|
| **Dificultad** | Fácil | Media |
| **Rendimiento** | Básico | Alto |
| **Seguridad** | Básica | Avanzada |
| **SSL/TLS** | Manual | Automático |
| **Compresión** | Manual | Automática |
| **Cacheo** | Manual | Automático |
| **Logs** | Consola | IIS Logs |
| **Soporte** | Comunidad | Microsoft |

---

## Resumen de comandos rápidos

### Para serve (Opción Simple):
```powershell
# Instalar serve
npm install -g serve

# Compilar
cd frontend
ng build --configuration=production

# Iniciar
serve -s dist/frontend -l 80
```

### Para IIS (Opción Profesional):
1. Compila el frontend: `ng build --configuration=production`
2. Copia `web.config` a la carpeta `dist/frontend`
3. Configura el sitio en IIS Manager
4. Listo

---

## Notas adicionales

- Tu backend está en puerto **4003** (configurado en .env)
- IIS puede funcionar como proxy reverso hacia tu backend si deseas que `/api` también funcione desde el puerto 80
- Para proxy reverso en IIS, configura Application Request Routing (ARR)
