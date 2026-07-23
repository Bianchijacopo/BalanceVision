import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { get, run } from '../db/database.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { sendEmail, buildOtpEmail } from '../email.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password richieste' });
  }

  const existing = get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(409).json({ error: 'Email gia registrata' });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const result = run('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)', [email, password_hash, name || '']);

  const token = generateToken(result.lastInsertRowid);

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

  res.status(201).json({ token, user: { id: result.lastInsertRowid, email, name: name || '', surname: '', email_verified: 0, created_at: new Date().toISOString() }, otp });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password richieste' });
  }

  const user = get('SELECT id, email, name, surname, email_verified, created_at FROM users WHERE email = ?', [email]);
  if (!user) {
    return res.status(401).json({ error: 'Credenziali non valide' });
  }

  const full = get('SELECT password_hash FROM users WHERE id = ?', [user.id]);
  if (!bcrypt.compareSync(password, full.password_hash)) {
    return res.status(401).json({ error: 'Credenziali non valide' });
  }

  const token = generateToken(user.id);
  res.json({ token, user });
});

router.get('/profile', authMiddleware, (req, res) => {
  const user = get('SELECT id, email, name, surname, email_verified, created_at FROM users WHERE id = ?', [req.userId]);
  if (!user) return res.status(404).json({ error: 'Utente non trovato' });
  res.json(user);
});

router.put('/profile', authMiddleware, (req, res) => {
  const { name, surname } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Il nome e obbligatorio' });
  run('UPDATE users SET name = ?, surname = ? WHERE id = ?', [name.trim(), surname || '', req.userId]);
  const user = get('SELECT id, email, name, surname, email_verified, created_at FROM users WHERE id = ?', [req.userId]);
  res.json({ message: 'Profilo aggiornato', user });
});

router.post('/change-password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Campi obbligatori' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'La password deve essere almeno 6 caratteri' });

  const user = get('SELECT password_hash FROM users WHERE id = ?', [req.userId]);
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Password attuale errata' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.userId]);
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

  const updated = get('SELECT id, email, name, surname, email_verified, created_at FROM users WHERE id = ?', [req.userId]);
  res.json({ message: 'Verifica completata', user: updated });
});

router.delete('/account', authMiddleware, (req, res) => {
  const { otp } = req.body;
  if (!otp) return res.status(400).json({ error: 'Codice OTP richiesto per eliminare l\'account' });

  const user = get('SELECT otp, otp_expiry FROM users WHERE id = ?', [req.userId]);
  if (!user.otp || !user.otp_expiry) return res.status(400).json({ error: 'Richiedi prima un OTP' });
  if (new Date(user.otp_expiry) < new Date()) return res.status(400).json({ error: 'OTP scaduto' });
  if (user.otp !== otp) return res.status(400).json({ error: 'Codice OTP errato' });

  run('DELETE FROM transactions WHERE user_id = ?', [req.userId]);
  run('DELETE FROM initial_balance WHERE user_id = ?', [req.userId]);
  run('DELETE FROM users WHERE id = ?', [req.userId]);
  res.json({ message: 'Account eliminato con successo' });
});

export default router;
