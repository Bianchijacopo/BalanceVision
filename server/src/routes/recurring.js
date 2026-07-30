import { Router } from 'express';
import { all, get, run, localNow } from '../db/database.js';
import { authMiddleware, verifiedMiddleware } from '../middleware/auth.js';
import { validate, schemas } from '../utils/validate.js';

const router = Router();
router.use(authMiddleware);
router.use(verifiedMiddleware);

async function processRecurring(userId) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);

  const items = await all(`SELECT * FROM recurring_transactions
    WHERE user_id = ? AND active = true
    AND (end_date IS NULL OR end_date >= ?)
    AND start_date <= ?`, [userId, today, today]);

  let created = 0;
  for (const item of items) {
    let shouldCreate = false;
    const lastGen = item.last_generated ? new Date(item.last_generated + 'T00:00:00') : null;

    if (!lastGen) {
      shouldCreate = true;
    } else if (item.frequency === 'monthly') {
      const nextGen = new Date(lastGen);
      nextGen.setMonth(nextGen.getMonth() + 1);
      if (now >= nextGen) shouldCreate = true;
    } else if (item.frequency === 'weekly') {
      const nextGen = new Date(lastGen);
      nextGen.setDate(nextGen.getDate() + 7);
      if (now >= nextGen) shouldCreate = true;
    } else if (item.frequency === 'yearly') {
      const nextGen = new Date(lastGen);
      nextGen.setFullYear(nextGen.getFullYear() + 1);
      if (now >= nextGen) shouldCreate = true;
    }

    if (shouldCreate) {
      const genDate = today;
      const genMonth = currentMonth;
      const txMonth = genMonth;
      const txDay = String(now.getDate()).padStart(2, '0');
      const txDate = `${txMonth}-${txDay}`;
      const cat = (item.category || '').trim() || 'Altro';

      await run(`INSERT INTO transactions (user_id, type, title, amount, category, note, date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, item.type, item.title, item.amount, cat, item.note || '', txDate, localNow()]);

      await run(`UPDATE recurring_transactions SET last_generated = ? WHERE id = ?`,
        [genDate, item.id]);

      created++;
    }
  }
  return created;
}

router.get('/', async (req, res) => {
  try { await processRecurring(req.userId); } catch (e) { console.error('[recurring process error]', e); }
  const items = await all(`SELECT * FROM recurring_transactions
    WHERE user_id = ? ORDER BY created_at DESC`, [req.userId]);
  res.json(items);
});

router.post('/', validate(schemas.recurring), async (req, res) => {
  const { type, title, amount, category, note, frequency, start_date, end_date } = req.body;
  const lang = req.query.lang || 'it';

  const cat = (category || '').trim() || 'Altro';

  const result = await run(`INSERT INTO recurring_transactions
    (user_id, type, title, amount, category, note, frequency, start_date, end_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.userId, type, title, amount, cat, note || '', frequency || 'monthly', start_date, end_date || null, localNow()]);

  const created = await get(`SELECT * FROM recurring_transactions WHERE id = ?`, [result.lastInsertRowid]);
  res.status(201).json(created);
});

router.put('/:id', async (req, res) => {
  const existing = await get(`SELECT * FROM recurring_transactions WHERE id = ? AND user_id = ?`,
    [req.params.id, req.userId]);
  const lang = req.query.lang || 'it';
  if (!existing) return res.status(404).json({ error: lang === 'en' ? 'Not found' : 'Non trovato' });

  const { type, title, amount, category, note, frequency, start_date, end_date, active } = req.body;

  await run(`UPDATE recurring_transactions SET
    type = ?, title = ?, amount = ?, category = ?, note = ?,
    frequency = ?, start_date = ?, end_date = ?, active = ?
    WHERE id = ?`,
    [
      type || existing.type,
      title || existing.title,
      amount || existing.amount,
      category || existing.category,
      note !== undefined ? note : existing.note,
      frequency || existing.frequency,
      start_date || existing.start_date,
      end_date !== undefined ? end_date : existing.end_date,
      active !== undefined ? active : existing.active,
      req.params.id
    ]);

  const updated = await get(`SELECT * FROM recurring_transactions WHERE id = ?`, [req.params.id]);
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const existing = await get(`SELECT * FROM recurring_transactions WHERE id = ? AND user_id = ?`,
    [req.params.id, req.userId]);
  if (!existing) return res.status(404).json({ error: req.query.lang === 'en' ? 'Not found' : 'Non trovato' });

  await run(`DELETE FROM recurring_transactions WHERE id = ? AND user_id = ?`, [req.params.id, req.userId]);
  res.json({ success: true });
});

router.post('/process', async (req, res) => {
  const count = await processRecurring(req.userId);
  res.json({ created: count });
});

export { processRecurring };
export default router;
