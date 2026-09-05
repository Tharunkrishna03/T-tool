const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let backend;

function startBackend() {
  const projectRoot = path.join(__dirname, '..');
  const bundledBackend = path.join(process.resourcesPath, 'backend', 'ExcelDataCleanerBackend.exe');
  const virtualPython = path.join(projectRoot, '.venv', 'Scripts', 'python.exe');
  const isBundled = app.isPackaged;
  const command = isBundled ? bundledBackend : virtualPython;
  const args = isBundled ? [] : [path.join(projectRoot, 'backend', 'app.py')];
  backend = spawn(command, args, {
    cwd: projectRoot,
    windowsHide: true,
    stdio: 'ignore',
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1120,
    minHeight: 720,
    title: 'Excel Data Cleaner',
    backgroundColor: '#eff7ff',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  const developmentUrl = process.env.VITE_DEV_SERVER_URL;
  if (developmentUrl) window.loadURL(developmentUrl);
  else window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => { startBackend(); createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => backend?.kill());
