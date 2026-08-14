import { Router } from 'express';
import { all, get, run, localNow } from '../db/database.js';
import { authMiddleware, verifiedMiddleware } from '../middleware/auth.js';
import { validate, schemas } from '../utils/validate.js';
import { processRecurring } from './recurring.js';

const router = Router();
router.use(authMiddleware);
router.use(verifiedMiddleware);

async function getBalance(userId) {
  const initial = await get('SELECT amount FROM initial_balance WHERE user_id = ?', [userId]);
  const initialAmount = initial ? initial.amount : 0;
  const totals = await get(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses
    FROM transactions WHERE user_id = ?
  `, [userId]);
  return initialAmount + totals.total_income - totals.total_expenses;
}

router.get('/', async (req, res) => {
  try { processRecurring(req.userId); } catch (e) { console.error('[recurring process error]', e); }
  const transactions = await all(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, created_at DESC',
    [req.userId]
  );
  res.json(transactions);
});

router.post('/', validate(schemas.transaction), async (req, res) => {
  const { type, title, amount, category, date, note } = req.body;

  if (type === 'expense') {
    const currentBalance = await getBalance(req.userId);
    if (currentBalance - amount < 0) {
      return res.status(400).json({ error: 'Saldo insufficiente' });
    }
  }

  const result = await run(
    'INSERT INTO transactions (user_id, type, title, amount, category, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [req.userId, type, title, amount, category, date, note || '', localNow()]
  );

  const transaction = await get('SELECT * FROM transactions WHERE id = ?', [result.lastInsertRowid]);

  if (type === 'income' && amount > 0) {
    try {
      const goals = await all('SELECT * FROM goals WHERE user_id = ? AND auto_contribute_percent > 0', [req.userId]);
      for (const goal of goals) {
        const contribution = Math.round((amount * goal.auto_contribute_percent / 100) * 100) / 100;
        if (contribution <= 0) continue;
        const newAmount = Math.min(goal.current_amount + contribution, goal.target_amount);
        await run('UPDATE goals SET current_amount = ? WHERE id = ?', [newAmount, goal.id]);
      }
    } catch (e) { console.error('[auto-contribute error]', e); }
  }

  res.status(201).json(transaction);
});

router.get('/:id', async (req, res) => {
  const t = await get('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!t) return res.status(404).json({ error: 'Transazione non trovata' });
  res.json(t);
});

router.put('/:id', validate(schemas.transaction), async (req, res) => {
  const t = await get('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!t) return res.status(404).json({ error: 'Transazione non trovata' });

  const { type, title, amount, category, date, note } = req.body;

  await run(
    'UPDATE transactions SET type = ?, title = ?, amount = ?, category = ?, date = ?, note = ? WHERE id = ? AND user_id = ?',
    [type, title, amount, category, date, note || '', req.params.id, req.userId]
  );

  const updated = await get('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const t = await get('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!t) return res.status(404).json({ error: 'Transazione non trovata' });
  await run('DELETE FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  res.json({ message: 'Transazione eliminata' });
});

export default router;