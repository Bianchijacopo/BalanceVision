const { app, BrowserWindow } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'balance-vision-desktop-secret';
process.env.GMAIL_USER = process.env.GMAIL_USER || 'desktop@balancevision.app';
process.env.GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || 'desktop-not-used';
process.env.PORT = '3001';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'BalanceVision',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.loadFile(path.join(__dirname, 'client', 'dist', 'index.html'));
}

app.whenReady().then(async () => {
  try {
    const serverPath = path.join(__dirname, 'server', 'src', 'index.js');
    const serverDir = path.join(__dirname, 'server');
    const origCwd = process.cwd();
    process.chdir(serverDir);
    await import(pathToFileURL(serverPath).href);
    process.chdir(origCwd);
  } catch (e) {
    console.error('Server start error:', e);
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
