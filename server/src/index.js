import 'dotenv/config';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', '..', 'client', 'dist');

const REQUIRED_ENV = ['JWT_SECRET', 'GMAIL_USER', 'GMAIL_APP_PASSWORD'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error('ERRORE: Variabile d\'ambiente mancante: ' + key);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false }));
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin.split(',').map(s => s.trim()),
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Troppe richieste. Riprova tra un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

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
app.use('/api/auth/forgot-send-otp', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/refresh', authLimiter);
app.use('/api/auth/change-password', authLimiter);

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

// SPA fallback
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
    http.createServer(app).listen(PORT, '0.0.0.0', () => {
      console.log('BalanceVision server running on http://localhost:' + PORT);
    });
  }
});
