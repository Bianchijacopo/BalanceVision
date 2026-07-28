import { Router } from 'express';
import { z } from 'zod';
import { get, run, localNow } from '../db/database.js';
import { authMiddleware, verifiedMiddleware } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';

const initialBalanceSchema = z.object({
  amount: z.number().nonnegative('amount deve essere >= 0'),
});

const router = Router();
router.use(authMiddleware);
router.use(verifiedMiddleware);

router.get('/', (req, res) => {
  const initial = get('SELECT amount FROM initial_balance WHERE user_id = ?', [req.userId]);
  const initialAmount = initial ? initial.amount : 0;

  const totals = get(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses
    FROM transactions WHERE user_id = ?
  `, [req.userId]);

  const balance = initialAmount + totals.total_income - totals.total_expenses;

  res.json({
    initial_balance: initialAmount,
    total_income: totals.total_income,
    total_expenses: totals.total_expenses,
    current_balance: balance
  });
});

router.post('/initial-balance', validate(initialBalanceSchema), (req, res) => {
  const { amount } = req.body;

  const existing = get('SELECT id FROM initial_balance WHERE user_id = ?', [req.userId]);
  if (existing) {
    run('UPDATE initial_balance SET amount = ? WHERE user_id = ?', [amount, req.userId]);
  } else {
    run('INSERT INTO initial_balance (user_id, amount, created_at) VALUES (?, ?, ?)', [req.userId, amount, localNow()]);
  }

  res.json({ initial_balance: amount });
});

export default router;