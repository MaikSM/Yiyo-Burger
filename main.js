const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const PORT = process.env.PORT || '4003';

// Enforce single instance lock to prevent duplicate backends on port 4003
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Disable hardware acceleration to eliminate Windows input & render freezes
app.disableHardwareAcceleration();

// Directores y loggers
const userDataFolder = app.getPath('userData');
if (!fs.existsSync(userDataFolder)) {
  fs.mkdirSync(userDataFolder, { recursive: true });
}
const logFile = path.join(userDataFolder, 'app_error.log');

function logToFile(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(logFile, line);
  } catch (_) {}
}

process.on('uncaughtException', (err) => {
  const errMsg = err.stack || err.message || err;
  logToFile(`UNCAUGHT EXCEPTION: ${errMsg}`);
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  logToFile(`UNHANDLED REJECTION: ${reason}`);
  console.error('Unhandled Rejection:', reason);
});

function backupDatabase() {
  try {
    const userDataPath = path.join(userDataFolder, 'restausync.sqlite');
    const possibleDbPaths = [
      userDataPath,
      path.join(process.cwd(), 'restausync.sqlite'),
      path.join(__dirname, 'backend', 'restausync.sqlite'),
      path.join(process.cwd(), 'backend', 'restausync.sqlite')
    ];

    const dbPath = possibleDbPaths.find(p => fs.existsSync(p));
    if (!dbPath) {
      logToFile('[Backup] Base de datos no encontrada aún.');
      return;
    }

    const backupsDir = path.join(path.dirname(dbPath), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const backupPath = path.join(backupsDir, `restausync_backup_${dateStr}.sqlite`);

    fs.copyFileSync(dbPath, backupPath);
    logToFile(`[Backup] ✅ Copia de seguridad creada en: ${backupPath}`);
  } catch (err) {
    logToFile(`[Backup] ❌ Error en backup: ${err.message}`);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    title: 'Yiyo Burger - POS Restaurante',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.maximize();

  const appUrl = `http://localhost:${PORT}`;
  logToFile(`[Electron Main] Cargando interfaz desde URL: ${appUrl}`);

  mainWindow.loadURL(appUrl).catch(err => {
    logToFile(`[Electron Main] loadURL falló inicialmente: ${err.message}`);
    const possibleIndexPaths = [
      path.join(__dirname, 'frontend', 'dist', 'frontend', 'browser', 'index.html'),
      path.join(__dirname, 'frontend', 'dist', 'frontend', 'index.html'),
      path.join(process.cwd(), 'frontend', 'dist', 'frontend', 'browser', 'index.html')
    ];
    const localIndexPath = possibleIndexPaths.find(p => fs.existsSync(p));
    if (localIndexPath) {
      mainWindow.loadFile(localIndexPath);
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, _validatedURL, isMainFrame) => {
    if (isMainFrame && errorCode !== -3) {
      logToFile(`[Electron Main] Error de navegación principal (${errorCode}: ${errorDescription}), reintentando conexión HTTP local...`);
      setTimeout(() => {
        if (mainWindow) {
          mainWindow.loadURL(appUrl);
        }
      }, 1000);
    }
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startBackendInProcess() {
  const backendPath = path.join(__dirname, 'backend', 'dist', 'app.js');
  logToFile(`[Electron Main] Inicializando servidor Backend desde: ${backendPath}`);
  
  if (!fs.existsSync(backendPath)) {
    logToFile(`[Electron Main] ERROR: No existe ${backendPath}`);
    return;
  }

  try {
    require(backendPath);
    logToFile('[Electron Main] Backend inicializado correctamente en el mismo proceso.');
  } catch (err) {
    const errMsg = err.stack || err.message || err;
    logToFile(`[Electron Main] Error al iniciar backend: ${errMsg}`);
    dialog.showErrorBox('Error de Inicialización del Backend', `Error al iniciar el servidor local:\n\n${err.message}\n\nDetalles guardados en: ${logFile}`);
  }
}

const http = require('http');

function waitForBackend(callback, retries = 40) {
  const req = http.get(`http://localhost:${PORT}/api/v1/system-security/status`, (res) => {
    logToFile(`[Electron Main] Backend listo con estado HTTP: ${res.statusCode}`);
    callback();
  });

  req.on('error', (_err) => {
    if (retries > 0) {
      logToFile(`[Electron Main] Esperando servidor backend... (intentos restantes: ${retries})`);
      setTimeout(() => waitForBackend(callback, retries - 1), 300);
    } else {
      logToFile('[Electron Main] Tiempo de espera agotado para el backend. Abriendo ventana principal.');
      callback();
    }
  });

  req.end();
}

app.on('ready', () => {
  logToFile('--- APLICACIÓN INICIADA ---');
  process.env.DB_PATH = path.join(userDataFolder, 'restausync.sqlite');

  const uploadsFolder = path.join(userDataFolder, 'uploads');
  if (!fs.existsSync(uploadsFolder)) {
    try {
      fs.mkdirSync(uploadsFolder, { recursive: true });
    } catch (_) {}
  }
  process.env.UPLOADS_PATH = uploadsFolder;

  backupDatabase();
  startBackendInProcess();

  waitForBackend(() => {
    if (!mainWindow) {
      createWindow();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  backupDatabase();
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
