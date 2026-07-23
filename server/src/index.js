import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getDb } from './db/database.js';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import balanceRoutes from './routes/balance.js';
import adviceRoutes from './routes/advice.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));

app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'BalanceVision API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/advice', adviceRoutes);

getDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BalanceVision server running on http://localhost:${PORT}`);
  });
});
