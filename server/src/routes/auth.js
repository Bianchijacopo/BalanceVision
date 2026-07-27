import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { get, run } from '../db/database.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { sendEmail, buildOtpEmail } from '../email.js';

const router = Router();
const PASSWORD_MIN = 8;

function validatePassword(password) {
  const errors = [];
  if (password.length < PASSWORD_MIN) errors.push('Minimo ' + PASSWORD_MIN + ' caratteri');
  if (!/[A-Z]/.test(password)) errors.push('Almeno una lettera maiuscola');
  if (!/[a-z]/.test(password)) errors.push('Almeno una lettera minuscola');
  if (!/[0-9]/.test(password)) errors.push('Almeno un numero');
  return errors;
}

function audit(userId, action, ip) {
  try {
    run('INSERT INTO audit_log (user_id, action, ip) VALUES (?, ?, ?)', [userId, action, ip || '']);
  } catch (e) {}
}

function generateRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  run('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)', [userId, hash, expiresAt]);
  return token;
}

function getUser(id) {
  return get('SELECT id, email, name, surname, email_verified, avatar, created_at FROM users WHERE id = ?', [id]);
}

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password richieste' });
  }

  const pwErrors = validatePassword(password);
  if (pwErrors.length > 0) {
    return res.status(400).json({ error: 'Password: ' + pwErrors.join(', ') });
  }

  const existing = get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(409).json({ error: 'Email gia registrata' });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const result = run('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)', [email, password_hash, name || '']);

  const token = generateToken(result.lastInsertRowid);
  const refreshToken = generateRefreshToken(result.lastInsertRowid);

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  run('UPDATE users SET otp = ?, otp_expiry = ? WHERE id = ?', [otp, expiry, result.lastInsertRowid]);

  console.log('OTP per', email, ':', otp);
  try {
    const { text, html } = buildOtpEmail(name || 'Utente', otp);
    await sendEmail(email, 'Codice di verifica BalanceVision', text, html);
  } catch (err) {
    console.error('Errore invio email:', err);
  }

  audit(result.lastInsertRowid, 'register', req.ip);
  res.status(201).json({
    token, refreshToken,
    user: getUser(result.lastInsertRowid),
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password richieste' });
  }

  const user = get('SELECT id, email, name, surname, email_verified, avatar, password_hash, created_at FROM users WHERE email = ?', [email]);
  if (!user) {
    return res.status(401).json({ error: 'Credenziali non valide' });
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    audit(user.id, 'login_failed', req.ip);
    return res.status(401).json({ error: 'Credenziali non valide' });
  }

  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  run('UPDATE users SET last_login_ip = ?, last_login_at = datetime(\'now\') WHERE id = ?', [req.ip, user.id]);

  audit(user.id, 'login', req.ip);
  const { password_hash, ...safe } = user;
  res.json({ token, refreshToken, user: safe });
});

router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token richiesto' });

  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const stored = get('SELECT * FROM refresh_tokens WHERE token_hash = ?', [hash]);
  if (!stored) return res.status(401).json({ error: 'Refresh token non valido' });
  if (new Date(stored.expires_at) < new Date()) {
    run('DELETE FROM refresh_tokens WHERE id = ?', [stored.id]);
    return res.status(401).json({ error: 'Refresh token scaduto' });
  }

  run('DELETE FROM refresh_tokens WHERE id = ?', [stored.id]);
  const token = generateToken(stored.user_id);
  const newRefreshToken = generateRefreshToken(stored.user_id);
  const user = getUser(stored.user_id);

  res.json({ token, refreshToken: newRefreshToken, user });
});

router.post('/forgot-send-otp', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email richiesta' });

  const user = get('SELECT id, email, name FROM users WHERE email = ?', [email]);
  if (!user) return res.status(404).json({ error: 'Nessun account con questa email' });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  run('UPDATE users SET otp = ?, otp_expiry = ? WHERE id = ?', [otp, expiry, user.id]);

  console.log('OTP reset password per', email, ':', otp);
  try {
    const { text, html } = buildOtpEmail(user.name || 'Utente', otp);
    sendEmail(email, 'Recupero password BalanceVision', text, html).catch(() => {});
  } catch (e) {}

  res.json({ message: 'Codice inviato alla tua email' });
});

router.post('/reset-password', (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Campi obbligatori: email, otp, newPassword' });

  const pwErrors = validatePassword(newPassword);
  if (pwErrors.length > 0) return res.status(400).json({ error: pwErrors.join(', ') });

  const user = get('SELECT id, otp, otp_expiry FROM users WHERE email = ?', [email]);
  if (!user) return res.status(404).json({ error: 'Nessun account con questa email' });
  if (!user.otp || !user.otp_expiry) return res.status(400).json({ error: 'Nessun codice richiesto' });
  if (new Date(user.otp_expiry) < new Date()) return res.status(400).json({ error: 'Codice scaduto' });
  if (user.otp !== otp) return res.status(400).json({ error: 'Codice errato' });

  const hash = bcrypt.hashSync(newPassword, 10);
  run('UPDATE users SET password_hash = ?, otp = NULL, otp_expiry = NULL WHERE id = ?', [hash, user.id]);
  run('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id]);

  audit(user.id, 'password_reset', req.ip);
  res.json({ message: 'Password cambiata con successo' });
});

router.post('/logout', authMiddleware, (req, res) => {
  run('DELETE FROM refresh_tokens WHERE user_id = ?', [req.userId]);
  audit(req.userId, 'logout', req.ip);
  res.json({ message: 'Disconnessione effettuata' });
});

router.get('/profile', authMiddleware, (req, res) => {
  const user = getUser(req.userId);
  if (!user) return res.status(404).json({ error: 'Utente non trovato' });
  res.json(user);
});

router.put('/profile', authMiddleware, (req, res) => {
  const { name, surname } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Il nome e obbligatorio' });
  run('UPDATE users SET name = ?, surname = ? WHERE id = ?', [name.trim(), surname || '', req.userId]);
  const user = getUser(req.userId);
  audit(req.userId, 'profile_update', req.ip);
  res.json({ message: 'Profilo aggiornato', user });
});

router.post('/change-password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Campi obbligatori' });

  const pwErrors = validatePassword(newPassword);
  if (pwErrors.length > 0) {
    return res.status(400).json({ error: 'Password: ' + pwErrors.join(', ') });
  }

  const user = get('SELECT password_hash FROM users WHERE id = ?', [req.userId]);
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Password attuale errata' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.userId]);
  run('DELETE FROM refresh_tokens WHERE user_id = ?', [req.userId]);

  audit(req.userId, 'change_password', req.ip);
  res.json({ message: 'Password cambiata con successo' });
});

router.post('/send-otp', authMiddleware, async (req, res) => {
  const user = get('SELECT email, name FROM users WHERE id = ?', [req.userId]);
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  run('UPDATE users SET otp = ?, otp_expiry = ? WHERE id = ?', [otp, expiry, req.userId]);

  console.log('OTP per', user.email, ':', otp);
  try {
    const { text, html } = buildOtpEmail(user.name || 'Utente', otp);
    await sendEmail(user.email, 'Codice di verifica BalanceVision', text, html);
    res.json({ message: 'Codice inviato alla tua email' });
  } catch (err) {
    console.error('Errore invio email:', err);
    res.json({ message: 'Codice generato (modalita test)', otp });
  }
});

router.post('/verify-otp', authMiddleware, (req, res) => {
  const { otp, newEmail } = req.body;
  if (!otp) return res.status(400).json({ error: 'Codice OTP richiesto' });

  const user = get('SELECT otp, otp_expiry FROM users WHERE id = ?', [req.userId]);
  if (!user.otp || !user.otp_expiry) return res.status(400).json({ error: 'Nessun OTP richiesto. Richiedine uno nuovo.' });
  if (new Date(user.otp_expiry) < new Date()) return res.status(400).json({ error: 'OTP scaduto. Richiedine uno nuovo.' });
  if (user.otp !== otp) return res.status(400).json({ error: 'Codice OTP errato' });

  if (newEmail) {
    run('UPDATE users SET email = ?, email_verified = 1, otp = NULL, otp_expiry = NULL WHERE id = ?', [newEmail, req.userId]);
  } else {
    run('UPDATE users SET email_verified = 1, otp = NULL, otp_expiry = NULL WHERE id = ?', [req.userId]);
  }

  audit(req.userId, 'email_verified', req.ip);
  const updated = getUser(req.userId);
  res.json({ message: 'Verifica completata', user: updated });
});

router.put('/avatar', authMiddleware, (req, res) => {
  const { avatar } = req.body;
  if (!avatar) return res.status(400).json({ error: 'Immagine richiesta' });
  if (avatar.length > 4 * 1024 * 1024) return res.status(400).json({ error: 'Immagine troppo grande (max 4MB)' });
  run('UPDATE users SET avatar = ? WHERE id = ?', [avatar, req.userId]);
  audit(req.userId, 'avatar_update', req.ip);
  res.json({ message: 'Avatar aggiornato', avatar });
});

router.delete('/account', authMiddleware, (req, res) => {
  const { otp } = req.body;
  if (!otp) return res.status(400).json({ error: 'Codice OTP richiesto per eliminare l\'account' });

  const user = get('SELECT otp, otp_expiry FROM users WHERE id = ?', [req.userId]);
  if (!user.otp || !user.otp_expiry) return res.status(400).json({ error: 'Richiedi prima un OTP' });
  if (new Date(user.otp_expiry) < new Date()) return res.status(400).json({ error: 'OTP scaduto' });
  if (user.otp !== otp) return res.status(400).json({ error: 'Codice OTP errato' });

  audit(req.userId, 'account_deleted', req.ip);
  run('DELETE FROM refresh_tokens WHERE user_id = ?', [req.userId]);
  run('DELETE FROM transactions WHERE user_id = ?', [req.userId]);
  run('DELETE FROM initial_balance WHERE user_id = ?', [req.userId]);
  run('DELETE FROM users WHERE id = ?', [req.userId]);
  res.json({ message: 'Account eliminato con successo' });
});

export default router;
