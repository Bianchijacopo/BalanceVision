import { Router } from 'express';
import { get, run, localNow } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { getRate, getTicker, SUPPORTED } from '../utils/currency.js';

const router = Router();
router.use(authMiddleware);

router.get('/currency', async (req, res) => {
  const settings = await get('SELECT currency FROM user_settings WHERE user_id = ?', [req.userId]);
  const currency = settings?.currency || 'EUR';
  let usdRate = 1;
  try {
    const eurToUsd = await getRate('EUR', 'USD');
    const eurToCur = await getRate('EUR', currency);
    usdRate = currency === 'USD' ? 1 : eurToCur / eurToUsd;
  } catch {}
  res.json({ currency, usdRate, supported: SUPPORTED });
});

router.put('/currency', async (req, res) => {
  const { currency } = req.body;
  if (!currency || !SUPPORTED.includes(currency)) {
    return res.status(400).json({ error: 'Valuta non supportata' });
  }
  const existing = await get('SELECT id FROM user_settings WHERE user_id = ?', [req.userId]);
  if (existing) {
    await run('UPDATE user_settings SET currency = ? WHERE user_id = ?', [currency, req.userId]);
  } else {
    await run('INSERT INTO user_settings (user_id, currency) VALUES (?, ?)', [req.userId, currency]);
  }
  let rate = 1, usdRate = 1;
  try {
    rate = await getRate('EUR', currency);
    const eurToUsd = await getRate('EUR', 'USD');
    usdRate = currency === 'USD' ? 1 : rate / eurToUsd;
  } catch {}
  res.json({ currency, rate, usdRate, supported: SUPPORTED });
});

router.get('/rate', async (req, res) => {
  const { from, to } = req.query;
  const base = from || 'EUR';
  if (!to) return res.status(400).json({ error: 'Parametro to richiesto' });
  try {
    const rate = await getRate(base, to);
    res.json({ from: base, to, rate });
  } catch {
    res.status(502).json({ error: 'Errore nel recupero tasso di cambio' });
  }
});

router.get('/ticker', async (req, res) => {
  const settings = await get('SELECT currency FROM user_settings WHERE user_id = ?', [req.userId]);
  const currency = settings?.currency || 'EUR';
  if (currency === 'USD') return res.json({ rate: 1, change: 0, changePct: 0 });
  try {
    const ticker = await getTicker('USD', currency);
    res.json(ticker);
  } catch {
    res.status(502).json({ error: 'Errore nel recupero ticker' });
  }
});

export default router;
