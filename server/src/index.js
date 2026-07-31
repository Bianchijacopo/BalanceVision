import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import { getDb, run } from './db/database.js';
import { sanitizeBody } from './utils/sanitize.js';
import { errorHandler, notFoundHandler } from './utils/errorHandler.js';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import balanceRoutes from './routes/balance.js';
import adviceRoutes from './routes/advice.js';
import budgetRoutes from './routes/budgets.js';
import goalRoutes from './routes/goals.js';
import recurringRoutes from './routes/recurring.js';
import importRoutes from './routes/import.js';
import reportRoutes from './routes/reports.js';
import translateRoutes from './routes/translate.js';
import settingsRoutes from './routes/settings.js';
import suggestCategoryRoutes from './routes/suggestCategory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', '..', 'client', 'dist');

const REQUIRED_ENV = ['JWT_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error('ERRORE FATALE: Variabile d\'ambiente mancante: ' + key);
    process.exit(1);
  }
}

if (!process.env.GROQ_API_KEY) {
  console.log('AVVISO: GROQ_API_KEY non impostata — funzionalità AI disabilitate');
}
if (!process.env.RESEND_API_KEY && (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD)) {
  console.log('AVVISO: RESEND_API_KEY / GMAIL non impostati — email disabilitate (uso mock/fallback OTP)');
}
if (!process.env.DATABASE_URL) {
  console.error('ERRORE FATALE: DATABASE_URL non impostata');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "http://localhost:3001", "https://api.groq.com", "https://api.frankfurter.app"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xFrameOptions: { action: 'deny' },
  xContentTypeOptions: true,
  xDnsPrefetchControl: { allow: false },
  xDownloadOptions: true,
  xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
}));

app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  next();
});
app.set('trust proxy', 1);
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3001';
const allowedOrigins = corsOrigin.split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('https://balance-vision') || origin.startsWith('http://localhost')) {
      cb(null, true);
    } else {
      console.warn('[CORS] blocked origin:', origin);
      cb(null, false);
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(sanitizeBody);

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Troppe richieste. Riprova tra un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Troppe richieste. Riprova tra un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', globalLimiter);

// Serve frontend static files
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

app.get('/', (req, res) => {
  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    return res.sendFile(path.join(distDir, 'index.html'));
  }
  res.json({ status: 'ok', app: 'BalanceVision API' });
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/send-otp', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);
app.use('/api/auth/forgot-send-otp', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/refresh', authLimiter);
app.use('/api/auth/change-password', authLimiter);

// Rate limiters for non-auth routes
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Troppe richieste. Riprova tra un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/import', writeLimiter);
app.use('/api/reports/send', writeLimiter);
app.use('/api/translate', writeLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/advice', adviceRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/import', importRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/transactions/suggest-category', suggestCategoryRoutes);

// Error handling
app.use('/api', errorHandler);
app.use('/api', notFoundHandler);

// SPA fallback — send index.html for all non-API, non-static routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).json({ error: 'Not found' });
});

getDb().then(() => {
  console.log('DB ready, starting server...');
  const sslKeyPath = process.env.SSL_KEY_PATH;
  const sslCertPath = process.env.SSL_CERT_PATH;

  if (sslKeyPath && sslCertPath && fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
    const options = {
      key: fs.readFileSync(sslKeyPath),
      cert: fs.readFileSync(sslCertPath),
    };
    https.createServer(options, app).listen(PORT, '0.0.0.0', () => {
      console.log('BalanceVision server running on https://localhost:' + PORT);
    });
  } else {
    const server = http.createServer(app);
    console.log('Created HTTP server, calling listen...');
    server.listen(PORT, '0.0.0.0', () => {
      console.log('BalanceVision server running on http://localhost:' + PORT);
    });
    server.on('error', (err) => {
      console.error('SERVER ERROR:', err.message);
    });
  }
}).catch(err => {
  console.error('FATAL: getDb() failed:', err.message);
  process.exit(1);
});
