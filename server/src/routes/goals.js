import { Router } from 'express';
import { all, get, run } from '../db/database.js';
import { authMiddleware, verifiedMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);
router.use(verifiedMiddleware);

router.get('/', (req, res) => {
  const goals = all(
    'SELECT * FROM goals WHERE user_id = ? ORDER BY target_amount - current_amount ASC',
    [req.userId]
  );

  const initial = get('SELECT amount FROM initial_balance WHERE user_id = ?', [req.userId]);
  const initialAmount = initial ? initial.amount : 0;
  const totals = get(`
    SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses
    FROM transactions WHERE user_id = ?
  `, [req.userId]);
  const currentBalance = initialAmount + totals.total_income - totals.total_expenses;

  res.json({
    goals: goals.map(g => ({
      ...g,
      progress: Math.min(100, (g.current_amount / g.target_amount) * 100),
      remaining: Math.max(0, g.target_amount - g.current_amount),
    })),
    currentBalance,
  });
});

router.post('/', (req, res) => {
  const { name, target_amount, deadline, category } = req.body;
  if (!name || !target_amount) {
    return res.status(400).json({ error: 'Campi obbligatori: name, target_amount' });
  }
  if (target_amount <= 0) {
    return res.status(400).json({ error: 'target_amount deve essere positivo' });
  }

  const result = run(
    'INSERT INTO goals (user_id, name, target_amount, deadline, category) VALUES (?, ?, ?, ?, ?)',
    [req.userId, name, target_amount, deadline || '', category || '']
  );

  const goal = get('SELECT * FROM goals WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(goal);
});

router.put('/:id', (req, res) => {
  const g = get('SELECT * FROM goals WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!g) return res.status(404).json({ error: 'Obiettivo non trovato' });

  const { name, target_amount, current_amount, deadline, category } = req.body;
  if (!name || !target_amount) {
    return res.status(400).json({ error: 'Campi obbligatori: name, target_amount' });
  }
  if (target_amount <= 0) {
    return res.status(400).json({ error: 'target_amount deve essere positivo' });
  }

  run(
    `UPDATE goals SET name = ?, target_amount = ?, current_amount = ?, deadline = ?, category = ? WHERE id = ? AND user_id = ?`,
    [name, target_amount, current_amount ?? g.current_amount, deadline ?? g.deadline, category ?? g.category, req.params.id, req.userId]
  );

  const updated = get('SELECT * FROM goals WHERE id = ?', [req.params.id]);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const g = get('SELECT * FROM goals WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!g) return res.status(404).json({ error: 'Obiettivo non trovato' });
  run('DELETE FROM goals WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  res.json({ message: 'Obiettivo eliminato' });
});

export default router;