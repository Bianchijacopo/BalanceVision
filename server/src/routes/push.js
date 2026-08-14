import { Router } from 'express';
import webpush from 'web-push';
import { pool } from '../db/database.js';
import { authMiddleware, verifiedMiddleware } from '../middleware/auth.js';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BBE768-FfhOMunctyaZygtyoSpGgaNdbEUSfHVjbPe2eueQF-bN2ypCQ_sXePYOwDD4YgZqQ4saTph8QVCd9xE4';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'Me_ojZNgJHhwF9He1ErCSbEjtBWvDJo7qZcZJnpM2N4';

webpush.setVapidDetails(
  'mailto:no-reply@balancevision.it',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const publicRouter = Router();
publicRouter.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

const privateRouter = Router();
privateRouter.use(authMiddleware);
privateRouter.use(verifiedMiddleware);

privateRouter.post('/subscribe', async (req, res) => {
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

privateRouter.delete('/unsubscribe', async (req, res) => {
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

privateRouter.get('/status', async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Non autorizzato' });

  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM push_subscriptions WHERE user_id = $1', [userId]);
    res.json({ subscribed: parseInt(result.rows[0].count) > 0 });
  } catch (e) {
    res.json({ subscribed: false });
  }
});

const router = Router();
router.use('/', publicRouter);
router.use('/', privateRouter);

export async function sendPushNotification(userId, title, body, url = '/') {
  try {
    const subs = await pool.query(
      'SELECT endpoint, p256dh, auth_key FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );
    for (const sub of subs.rows) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify({ title, body, url })
        );
      } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
        }
      }
    }
  } catch (e) {
    console.error('[sendPushNotification error]', e);
  }
}

export default router;
