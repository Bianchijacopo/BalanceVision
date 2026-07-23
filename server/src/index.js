import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { getDb, run } from './db/database.js';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import balanceRoutes from './routes/balance.js';
import adviceRoutes from './routes/advice.js';
import budgetRoutes from './routes/budgets.js';
import goalRoutes from './routes/goals.js';

const REQUIRED_ENV = ['JWT_SECRET', 'GMAIL_USER', 'GMAIL_APP_PASSWORD'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error('ERRORE: Variabile d\'ambiente mancante: ' + key);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Troppe richieste. Riprova tra un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'BalanceVision API' });
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/send-otp', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/advice', adviceRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/goals', goalRoutes);

getDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('BalanceVision server running on http://localhost:' + PORT);
  });
});
