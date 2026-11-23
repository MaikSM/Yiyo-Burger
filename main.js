const { app, BrowserWindow, dialog, Tray, Menu, nativeImage, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let trayBalloonShown = false;
const PORT = process.env.PORT || '4003';

// Enforce single instance lock to prevent duplicate backends on port 4003
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });
}

// Disable hardware acceleration to eliminate Windows input & render freezes
app.disableHardwareAcceleration();

// Directorios y loggers
const userDataFolder = app.getPath('userData');
if (!fs.existsSync(userDataFolder)) {
  fs.mkdirSync(userDataFolder, { recursive: true });
}
const logFile = path.join(userDataFolder, 'app_error.log');
const autostartMarkerFile = path.join(userDataFolder, '.autostart_initialized');

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

function getLocalLanIp() {
  const nets = os.networkInterfaces();
  const virtualRe = /virtual|vethernet|vmware|vbox|hyper-v|loopback|wsl|docker|tailscale|zerotier|hamachi|bluetooth/i;
  const wifiOrEthRe = /wi-?fi|wlan|inal[aá]mbrica|wireless|ethernet|eth\d*|lan/i;
  let fallback = null;

  for (const name of Object.keys(nets)) {
    if (virtualRe.test(name)) continue;
    for (const net of nets[name] || []) {
      const family = typeof net.family === 'string' ? net.family : (net.family === 4 ? 'IPv4' : 'IPv6');
      if (family !== 'IPv4' || net.internal || net.address.startsWith('169.254.')) continue;
      if (wifiOrEthRe.test(name)) return net.address;
      if (!fallback) fallback = net.address;
    }
  }
  return fallback || 'localhost';
}

function getAppIconPath() {
  const candidates = [
    path.join(__dirname, 'frontend', 'public', 'icon.ico'),
    path.join(__dirname, 'frontend', 'public', 'icon-192.png'),
    path.join(__dirname, 'frontend', 'dist', 'frontend', 'browser', 'icon-192.png'),
    path.join(__dirname, 'frontend', 'dist', 'frontend', 'browser', 'favicon.ico'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function configureAutoStartOnce() {
  if (!app.isPackaged || process.platform !== 'win32') return;
  try {
    if (!fs.existsSync(autostartMarkerFile)) {
      app.setLoginItemSettings({ openAtLogin: true });
      fs.writeFileSync(autostartMarkerFile, new Date().toISOString());
      logToFile('[AutoStart] Inicio automático con Windows habilitado por defecto.');
    }
  } catch (err) {
    logToFile(`[AutoStart] No se pudo configurar autoarranque: ${err.message}`);
  }
}

function buildTrayMenu() {
  const lanIp = getLocalLanIp();
  const lanUrl = `http://${lanIp}:${PORT}`;
  const loginSettings = process.platform === 'win32' ? app.getLoginItemSettings() : { openAtLogin: false };

  return Menu.buildFromTemplate([
    {
      label: 'Abrir Yiyo Burger POS',
      click: () => showMainWindow(),
    },
    { type: 'separator' },
    {
      label: `Red Tablets: ${lanUrl}`,
      enabled: false,
    },
    {
      label: 'Copiar IP para Tablets',
      click: () => {
        clipboard.writeText(lanIp);
        if (tray && process.platform === 'win32') {
          tray.displayBalloon({
            title: 'Yiyo Burger POS',
            content: `IP copiada al portapapeles: ${lanIp}`,
          });
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Iniciar con Windows',
      type: 'checkbox',
      checked: !!loginSettings.openAtLogin,
      enabled: app.isPackaged && process.platform === 'win32',
      click: (menuItem) => {
        try {
          app.setLoginItemSettings({ openAtLogin: menuItem.checked });
          logToFile(`[AutoStart] openAtLogin = ${menuItem.checked}`);
        } catch (err) {
          logToFile(`[AutoStart] Error cambiando preferencia: ${err.message}`);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Salir y apagar servidor',
      click: () => {
        const choice = dialog.showMessageBoxSync(mainWindow || undefined, {
          type: 'warning',
          buttons: ['Cancelar', 'Sí, apagar servidor'],
          defaultId: 0,
          cancelId: 0,
          title: 'Apagar Yiyo Burger POS',
          message: '¿Seguro que deseas cerrar el servidor de Yiyo Burger POS?',
          detail: 'Las tablets de los meseros perderán conexión con la caja hasta que vuelvas a abrir el programa.',
        });
        if (choice === 1) {
          isQuitting = true;
          app.quit();
        }
      },
    },
  ]);
}

function createTray() {
  try {
    const iconPath = getAppIconPath();
    const icon = iconPath ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
    tray = new Tray(icon);
    tray.setToolTip(`Yiyo Burger POS - Servidor activo (http://${getLocalLanIp()}:${PORT})`);
    tray.setContextMenu(buildTrayMenu());

    tray.on('double-click', () => showMainWindow());
    tray.on('right-click', () => {
      // Actualizar IP y estado del menú al abrir clic derecho
      tray.setContextMenu(buildTrayMenu());
      tray.popUpContextMenu();
    });
  } catch (err) {
    logToFile(`[Tray] No se pudo crear el ícono en la bandeja del sistema: ${err.message}`);
  }
}

function backupDatabase() {
  try {
    const userDataPath = path.join(userDataFolder, 'restausync.sqlite');
    const possibleDbPaths = [
      userDataPath,
      path.join(process.cwd(), 'restausync.sqlite'),
      path.join(__dirname, 'backend', 'restausync.sqlite'),
      path.join(process.cwd(), 'backend', 'restausync.sqlite'),
    ];

    const dbPath = possibleDbPaths.find((p) => fs.existsSync(p));
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
    logToFile(`[Backup] Copia de seguridad creada en: ${backupPath}`);
  } catch (err) {
    logToFile(`[Backup] Error en backup: ${err.message}`);
  }
}

function createWindow() {
  const iconPath = getAppIconPath();
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    title: 'Yiyo Burger - POS Restaurante',
    icon: iconPath || undefined,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.maximize();

  const appUrl = `http://localhost:${PORT}`;
  logToFile(`[Electron Main] Cargando interfaz desde URL: ${appUrl}`);

  mainWindow.loadURL(appUrl).catch((err) => {
    logToFile(`[Electron Main] loadURL falló inicialmente: ${err.message}`);
    const possibleIndexPaths = [
      path.join(__dirname, 'frontend', 'dist', 'frontend', 'browser', 'index.html'),
      path.join(__dirname, 'frontend', 'dist', 'frontend', 'index.html'),
      path.join(process.cwd(), 'frontend', 'dist', 'frontend', 'browser', 'index.html'),
    ];
    const localIndexPath = possibleIndexPaths.find((p) => fs.existsSync(p));
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

  // Al cerrar la ventana (X), minimizar a la bandeja del sistema para que las tablets sigan conectadas
  mainWindow.on('close', (event) => {
    if (!isQuitting && tray) {
      event.preventDefault();
      mainWindow.hide();
      if (!trayBalloonShown && process.platform === 'win32') {
        trayBalloonShown = true;
        tray.displayBalloon({
          title: 'Yiyo Burger POS sigue activo',
          content: 'El servidor continúa funcionando en segundo plano para las tablets. Haz clic derecho en el ícono junto al reloj para salir.',
        });
      }
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
    dialog.showErrorBox(
      'Error de Inicialización del Backend',
      `Error al iniciar el servidor local:\n\n${err.message}\n\nDetalles guardados en: ${logFile}`
    );
  }
}

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

  configureAutoStartOnce();
  createTray();
  backupDatabase();
  startBackendInProcess();

  waitForBackend(() => {
    if (!mainWindow) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', function () {
  // Si hay bandeja activa y el usuario no pidió salir, mantener el servidor corriendo
  if (isQuitting && process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  backupDatabase();
});

app.on('activate', function () {
  showMainWindow();
});
