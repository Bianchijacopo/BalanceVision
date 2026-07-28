import { Router } from 'express';
import { get, run, localNow } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { getRate, SUPPORTED } from '../utils/currency.js';

const router = Router();
router.use(authMiddleware);

router.get('/currency', (req, res) => {
  const settings = get('SELECT currency FROM user_settings WHERE user_id = ?', [req.userId]);
  const currency = settings?.currency || 'EUR';
  res.json({ currency, supported: SUPPORTED });
});

router.put('/currency', async (req, res) => {
  const { currency } = req.body;
  if (!currency || !SUPPORTED.includes(currency)) {
    return res.status(400).json({ error: 'Valuta non supportata' });
  }
  const existing = get('SELECT id FROM user_settings WHERE user_id = ?', [req.userId]);
  if (existing) {
    run('UPDATE user_settings SET currency = ? WHERE user_id = ?', [currency, req.userId]);
  } else {
    run('INSERT INTO user_settings (user_id, currency) VALUES (?, ?)', [req.userId, currency]);
  }
  let rate = 1;
  try { rate = await getRate('EUR', currency); } catch {}
  res.json({ currency, rate, supported: SUPPORTED });
});

router.get('/rate', async (req, res) => {
  const { to } = req.query;
  if (!to) return res.status(400).json({ error: 'Parametro to richiesto' });
  try {
    const rate = await getRate('EUR', to);
    res.json({ from: 'EUR', to, rate });
  } catch {
    res.status(502).json({ error: 'Errore nel recupero tasso di cambio' });
  }
});

export default router;
