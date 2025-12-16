# Restausync Oficial

Sistema completo de gestión para restaurantes con control de asistencia, inventario, pedidos y más.

## 🚀 Características Principales

- **Control de Asistencia**: Registro de entrada/salida de empleados mediante QR
- **Escaneo QR**: Integración con Capacitor ML Kit para escaneo nativo
- **Cámara**: Captura de fotos para diferentes funcionalidades
- **Gestión de Inventario**: Control de productos y existencias
- **Sistema de Pedidos**: Gestión completa de pedidos del restaurante
- **Roles de Usuario**: Admin, Mesero, Cliente
- **Interfaz Moderna**: Angular con Tailwind CSS

## 🛠️ Tecnologías Utilizadas

### Frontend
- **Angular 19**: Framework principal
- **Capacitor**: Desarrollo de aplicaciones móviles híbridas
- **Tailwind CSS**: Framework de estilos
- **Capacitor ML Kit Barcode Scanning**: Escaneo QR nativo
- **Capacitor Camera**: Captura de fotos
- **QRCode.js**: Generación de códigos QR

### Backend
- **Node.js**: Runtime de JavaScript
- **Express.js**: Framework web
- **TypeScript**: Tipado estático
- **TypeORM**: ORM para bases de datos
- **MySQL**: Base de datos relacional
- **JWT**: Autenticación
- **Bcrypt**: Encriptación de contraseñas

## 📦 Instalación

### Requisitos Previos
- Node.js (versión 18 o superior)
- npm o yarn
- MySQL
- Android Studio (para desarrollo Android)
- Xcode (para desarrollo iOS, solo en macOS)

### Instalación Automática (Recomendado)

1. **Clona el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd restausync-oficcial
   ```

2. **Ejecuta el instalador automático**
   ```bash
   # En Windows
   setup.bat

   # En Linux/Mac
   chmod +x setup.sh && ./setup.sh
   ```

   Esto instalará dependencias, construirá el proyecto y verificará la configuración.

### Instalación Manual

Si prefieres instalar manualmente:

1. **Instala todas las dependencias**
   ```bash
   npm run install:all
   ```

2. **Configura las variables de entorno**
   ```bash
   cp .env.example backend/.env
   # Edita backend/.env con tus configuraciones
   ```

3. **Construye el proyecto**
   ```bash
   npm run build
   ```

### Instalación Manual

Si prefieres instalar manualmente:

1. **Instalar dependencias del frontend**
   ```bash
   npm run install:frontend
   ```

2. **Instalar dependencias del backend**
   ```bash
   npm run install:backend
   ```

## 🚀 Ejecución

### Inicio Automático (Recomendado)

```bash
# En Windows
start.bat

# En Linux/Mac
./start.sh
```

Esto iniciará tanto el backend como el frontend automáticamente.

### Inicio Manual

#### Desarrollo

1. **Iniciar el backend**
   ```bash
   npm run dev:backend
   ```

2. **Iniciar el frontend** (en otra terminal)
   ```bash
   npm run dev:frontend
   ```

### Producción

1. **Construir el proyecto**
   ```bash
   npm run build
   ```

2. **Iniciar en producción**
   ```bash
   npm run start
   ```

## 📱 Desarrollo Móvil

### Android

1. **Agregar plataforma Android**
   ```bash
   cd frontend
   npx cap add android
   ```

2. **Sincronizar cambios**
   ```bash
   npx cap sync android
   ```

3. **Abrir en Android Studio**
   ```bash
   npx cap open android
   ```

### iOS

1. **Agregar plataforma iOS**
   ```bash
   cd frontend
   npx cap add ios
   ```

2. **Sincronizar cambios**
   ```bash
   npx cap sync ios
   ```

3. **Abrir en Xcode**
   ```bash
   npx cap open ios
   ```

## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.env` en la carpeta `backend` con:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=tu_usuario
DB_PASSWORD=tu_contraseña
DB_DATABASE=restausync

JWT_SECRET=tu_jwt_secret

PORT=3000
```

### Base de Datos

1. **Crear la base de datos**
   ```sql
   CREATE DATABASE restausync;
   ```

2. **Ejecutar seeders** (desde el backend)
   ```bash
   # Los seeders se ejecutan automáticamente al iniciar la aplicación
   # O puedes crear un endpoint para ejecutarlos manualmente
   ```

## 📋 Scripts Disponibles

### Raíz del proyecto
- `npm run install:all` - Instala dependencias de frontend y backend
- `npm run dev` - Inicia el frontend en modo desarrollo
- `npm run build` - Construye frontend y backend
- `npm run start` - Inicia el backend en producción

### Frontend
- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Construye la aplicación
- `npm run test` - Ejecuta tests
- `npm run lint` - Ejecuta linter
- `npm run format` - Formatea el código

### Backend
- `npm run dev` - Inicia servidor en modo desarrollo con recarga automática
- `npm run build` - Compila TypeScript
- `npm run start` - Inicia servidor en producción

## 🔐 Funcionalidades de Seguridad

- Autenticación JWT
- Encriptación de contraseñas con bcrypt
- Validación de datos con class-validator
- Sanitización de entradas
- CORS configurado
- Helmet para headers de seguridad

## 📊 API Endpoints

### Autenticación
- `POST /auth/login` - Iniciar sesión
- `POST /auth/register` - Registrar usuario

### Usuarios
- `GET /users` - Obtener todos los usuarios
- `POST /users` - Crear usuario
- `PUT /users/:id` - Actualizar usuario
- `DELETE /users/:id` - Eliminar usuario

### Asistencia
- `GET /asistencia` - Obtener registros de asistencia
- `POST /asistencia` - Crear registro de asistencia
- `PUT /asistencia/:id` - Actualizar asistencia
- `DELETE /asistencia/:id` - Eliminar asistencia

### Inventario
- `GET /inventario` - Obtener productos
- `POST /inventario` - Crear producto
- `PUT /inventario/:id` - Actualizar producto
- `DELETE /inventario/:id` - Eliminar producto

## 🐛 Solución de Problemas

### Problemas Comunes

1. **Error de dependencias**: Ejecuta `npm run install:all` para reinstalar todas las dependencias

2. **Error de base de datos**: Verifica que MySQL esté corriendo y las credenciales sean correctas

3. **Error de permisos de cámara**: En aplicaciones móviles, asegúrate de que los permisos estén configurados en el manifiesto

4. **Error de QR**: Verifica que el formato del QR sea `user-id:{numero}`

## 📄 Licencia

Este proyecto está bajo la Licencia ISC.

## 👥 Contribuidores

- JEBC-DeV - Desarrollador principal

## 📞 Soporte

Para soporte técnico, por favor contacta al equipo de desarrollo.