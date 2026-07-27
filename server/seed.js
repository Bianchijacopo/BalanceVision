import bcrypt from 'bcryptjs';
import { getDb, get, run, close, localNow } from './src/db/database.js';

async function seed() {
  await getDb();

  const existing = get('SELECT id FROM users WHERE email = ?', ['admin@gmail.com']);
  if (existing) {
    console.log('Account admin gia esistente (id: %d, email: admin@gmail.com)', existing.id);
  } else {
    const hash = bcrypt.hashSync('admin', 10);
    const result = run('INSERT INTO users (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)', ['admin@gmail.com', hash, 'Admin', localNow()]);
    console.log('Account admin creato (id: %d, email: admin@gmail.com, password: admin)', result.lastInsertRowid);
  }

  const count = get('SELECT COUNT(*) as c FROM users');
  console.log('Utenti totali nel database: %d', count.c);

  close();
}

seed().catch(err => {
  console.error('Errore seed:', err);
  process.exit(1);
});