import { Router } from 'express';
import { all, get, run } from '../db/database.js';
import { authMiddleware, verifiedMiddleware } from '../middleware/auth.js';
import { processRecurring } from './recurring.js';

const router = Router();
router.use(authMiddleware);
router.use(verifiedMiddleware);

router.get('/', (req, res) => {
  try { processRecurring(req.userId); } catch (e) { console.error('[recurring process error]', e); }
  const transactions = all(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, created_at DESC',
    [req.userId]
  );
  res.json(transactions);
});

router.post('/', (req, res) => {
  const { type, title, amount, category, date, note } = req.body;
  if (!type || !title || !amount || !category || !date) {
    return res.status(400).json({ error: 'Campi obbligatori: type, title, amount, category, date' });
  }
  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'type deve essere "income" o "expense"' });
  }
  if (amount <= 0) {
    return res.status(400).json({ error: 'amount deve essere positivo' });
  }

  const result = run(
    'INSERT INTO transactions (user_id, type, title, amount, category, date, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.userId, type, title, amount, category, date, note || '']
  );

  const transaction = get('SELECT * FROM transactions WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(transaction);
});

router.get('/:id', (req, res) => {
  const t = get('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!t) return res.status(404).json({ error: 'Transazione non trovata' });
  res.json(t);
});

router.put('/:id', (req, res) => {
  const t = get('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!t) return res.status(404).json({ error: 'Transazione non trovata' });

  const { type, title, amount, category, date, note } = req.body;
  if (!type || !title || !amount || !category || !date) {
    return res.status(400).json({ error: 'Campi obbligatori: type, title, amount, category, date' });
  }
  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'type deve essere "income" o "expense"' });
  }
  if (amount <= 0) {
    return res.status(400).json({ error: 'amount deve essere positivo' });
  }

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