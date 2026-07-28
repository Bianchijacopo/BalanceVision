const { app, BrowserWindow, session } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const SERVER_PORT = 3001;

function loadEnv() {
  try {
    const envPath = path.join(__dirname, 'server', '.env');
    const content = fs.readFileSync(envPath, 'utf-8');
    const env = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      env[key] = val;
    }
    return env;
  } catch {
    return {};
  }
}

const dotEnv = loadEnv();

let serverProcess = null;

function startServer() {
  return new Promise((resolve) => {
    const serverPath = path.join(__dirname, 'server', 'src', 'index.js');
    const serverDir = path.join(__dirname, 'server');

    const serverEnv = {
      NODE_ENV: isDev ? 'development' : 'production',
      JWT_SECRET: process.env.JWT_SECRET || dotEnv.JWT_SECRET,
      GMAIL_USER: process.env.GMAIL_USER || dotEnv.GMAIL_USER || '',
      GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD || dotEnv.GMAIL_APP_PASSWORD || '',
      GROQ_API_KEY: process.env.GROQ_API_KEY || dotEnv.GROQ_API_KEY || '',
      PORT: String(SERVER_PORT),
      CORS_ORIGIN: 'http://localhost:' + SERVER_PORT,
    };

    if (!serverEnv.JWT_SECRET) {
      console.error('ERRORE FATALE: JWT_SECRET non impostato. Inseriscilo in server/.env');
      app.quit();
      return;
    }

    serverProcess = fork(serverPath, [], {
      cwd: serverDir,
      env: serverEnv,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      execArgv: [],
    });

    const timeout = setTimeout(() => {
      console.error('[server] timeout avvio server');
      resolve();
    }, 15000);

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('server running')) {
        clearTimeout(timeout);
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      if (isDev) console.error('[server]', data.toString());
    });

    serverProcess.on('error', (err) => {
      clearTimeout(timeout);
      resolve();
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0 && isDev) console.error('[server exited]', code);
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
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.js'),
      disableDialogs: true,
      spellcheck: false,
    },
  });

  win.loadURL('http://localhost:' + SERVER_PORT);

  win.once('ready-to-show', () => {
    win.show();
  });

  if (isDev) {
    win.webContents.openDevTools({ mode: 'right' });
  }

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "img-src 'self' data: blob:; " +
          "connect-src 'self' http://localhost:" + SERVER_PORT + " https://api.groq.com https://api.frankfurter.app; " +
          "font-src 'self' data: https://fonts.gstatic.com; " +
          "object-src 'none'; " +
          "frame-src 'none'; " +
          "base-uri 'self'; " +
          "form-action 'self'; ",
        ],
        'X-Content-Type-Options': ['nosniff'],
        'X-Frame-Options': ['DENY'],
        'X-XSS-Protection': ['1; mode=block'],
        'Strict-Transport-Security': ['max-age=31536000; includeSubDomains'],
        'Referrer-Policy': ['strict-origin-when-cross-origin'],
        'Permissions-Policy': [
          'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
        ],
      },
    });
  });

  win.webContents.on('will-navigate', (event, url) => {
    const allowed = url.startsWith('http://localhost:' + SERVER_PORT);
    if (!allowed) {
      event.preventDefault();
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    const allowed = url.startsWith('http://localhost:' + SERVER_PORT)
      || url.startsWith('https://console.groq.com')
      || url.startsWith('https://myaccount.google.com');
    return { action: allowed ? 'allow' : 'deny' };
  });
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('web-contents-created', (event, contents) => {
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
});
