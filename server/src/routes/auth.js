import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { get, run } from '../db/database.js';
import { generateToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', (req, res) => {
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
  res.status(201).json({ token, user: { id: result.lastInsertRowid, email, name: name || '' } });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password richieste' });
  }

  const user = get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenziali non valide' });
  }

  const token = generateToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

export default router;