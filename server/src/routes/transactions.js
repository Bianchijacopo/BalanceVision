import { Router } from 'express';
import { all, get, run, localNow } from '../db/database.js';
import { authMiddleware, verifiedMiddleware } from '../middleware/auth.js';
import { validate, schemas } from '../utils/validate.js';
import { processRecurring } from './recurring.js';

const router = Router();
router.use(authMiddleware);
router.use(verifiedMiddleware);

function getBalance(userId) {
  const initial = get('SELECT amount FROM initial_balance WHERE user_id = ?', [userId]);
  const initialAmount = initial ? initial.amount : 0;
  const totals = get(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses
    FROM transactions WHERE user_id = ?
  `, [userId]);
  return initialAmount + totals.total_income - totals.total_expenses;
}

router.get('/', (req, res) => {
  try { processRecurring(req.userId); } catch (e) { console.error('[recurring process error]', e); }
  const transactions = all(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, created_at DESC',
    [req.userId]
  );
  res.json(transactions);
});

router.post('/', validate(schemas.transaction), (req, res) => {
  const { type, title, amount, category, date, note } = req.body;

  if (type === 'expense') {
    const currentBalance = getBalance(req.userId);
    if (currentBalance - amount < 0) {
      return res.status(400).json({ error: 'Saldo insufficiente' });
    }
  }

  const result = run(
    'INSERT INTO transactions (user_id, type, title, amount, category, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [req.userId, type, title, amount, category, date, note || '', localNow()]
  );

  const transaction = get('SELECT * FROM transactions WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(transaction);
});

router.get('/:id', (req, res) => {
  const t = get('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!t) return res.status(404).json({ error: 'Transazione non trovata' });
  res.json(t);
});

router.put('/:id', validate(schemas.transaction), (req, res) => {
  const t = get('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!t) return res.status(404).json({ error: 'Transazione non trovata' });

  const { type, title, amount, category, date, note } = req.body;

  run(
    'UPDATE transactions SET type = ?, title = ?, amount = ?, category = ?, date = ?, note = ? WHERE id = ? AND user_id = ?',
    [type, title, amount, category, date, note || '', req.params.id, req.userId]
  );

  const updated = get('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const t = get('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!t) return res.status(404).json({ error: 'Transazione non trovata' });
  run('DELETE FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  res.json({ message: 'Transazione eliminata' });
});

export default router;