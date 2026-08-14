const express = require('express');
const router = express.Router();
const { pool } = require('../db/database');

router.post('/subscribe', async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Non autorizzato' });

  const { endpoint, keys } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'Endpoint mancante' });

  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_key)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = $3, auth_key = $4, updated_at = NOW()`,
      [userId, endpoint, keys?.p256dh || '', keys?.auth || '']
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('Push subscribe error:', e);
    res.status(500).json({ error: 'Errore server' });
  }
});

router.delete('/unsubscribe', async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Non autorizzato' });

  const { endpoint } = req.body;
  try {
    if (endpoint) {
      await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [userId, endpoint]);
    } else {
      await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1', [userId]);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('Push unsubscribe error:', e);
    res.status(500).json({ error: 'Errore server' });
  }
});

router.get('/status', async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Non autorizzato' });

  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM push_subscriptions WHERE user_id = $1', [userId]);
    res.json({ subscribed: parseInt(result.rows[0].count) > 0 });
  } catch (e) {
    res.json({ subscribed: false });
  }
});

module.exports = router;
