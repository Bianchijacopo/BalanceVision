import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { get } from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET;

export function generateToken(userId) {
  const jti = crypto.randomBytes(16).toString('hex');
  return jwt.sign({ userId, jti }, JWT_SECRET, { expiresIn: '15m' });
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Token non valido' });
  }
}

export async function verifiedMiddleware(req, res, next) {
  const user = await get('SELECT email_verified FROM users WHERE id = ?', [req.userId]);
  if (!user || !user.email_verified) {
    return res.status(403).json({ error: 'Verifica la tua email prima di usare questa funzione' });
  }
  next();
}
