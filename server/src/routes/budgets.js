import { Router } from 'express';
import { all, get, run } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const budgets = all(
    'SELECT * FROM budgets WHERE user_id = ? ORDER BY category',
    [req.userId]
  );

  const now = new Date();
  const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

  const monthParam = req.query.month || currentMonth;
  const year = parseInt(monthParam.slice(0, 4));
  const month = parseInt(monthParam.slice(5, 7));
  const firstDay = monthParam + '-01';
  const lastDay = new Date(year, month, 0).toISOString().split('T')[0];

  const spending = all(
    `SELECT category, SUM(amount) as total FROM transactions
     WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?
     GROUP BY category`,
    [req.userId, firstDay, lastDay]
  );

  const spendingMap = {};
  for (const s of spending) {
    spendingMap[s.category] = s.total;
  }

  const result = budgets.map(b => ({
    ...b,
    spent: spendingMap[b.category] || 0,
    remaining: b.amount - (spendingMap[b.category] || 0),
    progress: Math.min(100, ((spendingMap[b.category] || 0) / b.amount) * 100),
  }));

  res.json({ budgets: result, month: monthParam, totalBudget: budgets.reduce((s, b) => s + b.amount, 0) });
});

router.post('/', (req, res) => {
  const { category, month, amount } = req.body;
  if (!category || !month || !amount) {
    return res.status(400).json({ error: 'Campi obbligatori: category, month, amount' });
  }
  if (amount <= 0) {
    return res.status(400).json({ error: 'amount deve essere positivo' });
  }

  const existing = get(
    'SELECT * FROM budgets WHERE user_id = ? AND category = ? AND month = ?',
    [req.userId, category, month]
  );

  if (existing) {
    run(
      'UPDATE budgets SET amount = ?, updated_at = datetime("now") WHERE id = ?',
      [amount, existing.id]
    );
    const updated = get('SELECT * FROM budgets WHERE id = ?', [existing.id]);
    return res.json(updated);
  }

  const result = run(
    'INSERT INTO budgets (user_id, category, month, amount) VALUES (?, ?, ?, ?)',
    [req.userId, category, month, amount]
  );

  const budget = get('SELECT * FROM budgets WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(budget);
});

router.delete('/:id', (req, res) => {
  const b = get('SELECT * FROM budgets WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!b) return res.status(404).json({ error: 'Budget non trovato' });
  run('DELETE FROM budgets WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  res.json({ message: 'Budget eliminato' });
});

export default router;