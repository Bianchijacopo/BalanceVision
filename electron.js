const { app, BrowserWindow } = require('electron');
const { fork } = require('child_process');
const path = require('path');

let serverProcess = null;

function startServer() {
  return new Promise((resolve) => {
    const serverPath = path.join(__dirname, 'server', 'src', 'index.js');
    const serverDir = path.join(__dirname, 'server');

    const serverEnv = {
      ...process.env,
      JWT_SECRET: process.env.JWT_SECRET || 'balance-vision-desktop-secret',
      GMAIL_USER: process.env.GMAIL_USER || 'desktop@balancevision.app',
      GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD || 'desktop-not-used',
      PORT: '3001'
    };

    serverProcess = fork(serverPath, [], {
      cwd: serverDir,
      env: serverEnv,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });

    const timeout = setTimeout(resolve, 10000);

    serverProcess.stdout.on('data', (data) => {
      if (data.toString().includes('server running')) {
        clearTimeout(timeout);
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('[server]', data.toString());
    });

    serverProcess.on('error', (err) => {
      console.error('[server error]', err);
      clearTimeout(timeout);
      resolve();
    });

    serverProcess.on('exit', (code) => {
      console.error('[server exited]', code);
    });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'BalanceVision',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    }
  });
  win.loadURL('http://localhost:3001');
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
