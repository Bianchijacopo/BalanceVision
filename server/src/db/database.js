import 'dotenv/config';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'balance.db');
const BACKUP_DIR = path.join(__dirname, '..', '..', '..', 'db-backups');
const MAX_BACKUPS = 3;

let db = null;
let SQL = null;

export async function getDb() {
  if (db) return db;

  SQL = await initSqlJs();

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  initSchema();
  migrate();
  return db;
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      title TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS initial_balance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      amount REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      ip TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  save();
}

function migrate() {
  const migrations = [
    "ALTER TABLE users ADD COLUMN surname TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN otp TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN otp_expiry TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN last_login_ip TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN last_login_at TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN login_attempts INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN locked_until TEXT DEFAULT NULL",
  ];
  for (const sql of migrations) {
    try { db.run(sql); } catch (e) {}
  }

  try {
    db.run(`CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL CHECK(target_amount > 0),
      current_amount REAL NOT NULL DEFAULT 0,
      deadline TEXT DEFAULT '',
      category TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
  } catch(e) {}

  try {
    db.run(`CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      month TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, category, month),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
  } catch(e) {}

  try {
    db.run("ALTER TABLE audit_log RENAME TO audit_log_old");
    db.run(`CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      ip TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`);
    db.run("INSERT INTO audit_log SELECT * FROM audit_log_old");
    db.run("DROP TABLE audit_log_old");
  } catch(e) {}

  try {
    db.run(`CREATE TABLE IF NOT EXISTS recurring_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      title TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      category TEXT NOT NULL,
      note TEXT DEFAULT '',
      frequency TEXT NOT NULL DEFAULT 'monthly',
      start_date TEXT NOT NULL,
      end_date TEXT DEFAULT NULL,
      last_generated TEXT DEFAULT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
  } catch(e) {}

  try {
    db.run(`CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      report_enabled INTEGER NOT NULL DEFAULT 0,
      report_day INTEGER NOT NULL DEFAULT 1,
      last_report_sent TEXT DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
  } catch(e) {}

  try {
    db.run("ALTER TABLE user_settings ADD COLUMN currency TEXT NOT NULL DEFAULT 'EUR'");
  } catch(e) {}
  try {
    db.run(`CREATE TABLE IF NOT EXISTS exchange_rates (
      base_currency TEXT NOT NULL DEFAULT 'EUR',
      target_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (base_currency, target_currency)
    )`);
  } catch(e) {}

  fixTimezones();

  save();
}

function getFixedOffset() {
  const d = new Date();
  const sign = d.getTimezoneOffset() > 0 ? '-' : '+';
  const abs = Math.abs(d.getTimezoneOffset());
  const hours = String(Math.floor(abs / 60)).padStart(2, '0');
  return `${sign}${hours}:00`;
}

function fixTimezones() {
  try {
    const row = get("SELECT value FROM meta WHERE key = 'tz_fixed'");
    if (row) return;
  } catch(e) {}
  try {
    db.run("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)");
  } catch(e) {}

  const offset = getFixedOffset();
  const tables = [
    { name: 'users', cols: ['created_at', 'last_login_at'] },
    { name: 'transactions', cols: ['created_at'] },
    { name: 'initial_balance', cols: ['created_at'] },
    { name: 'audit_log', cols: ['created_at'] },
    { name: 'refresh_tokens', cols: ['created_at'] },
    { name: 'goals', cols: ['created_at'] },
    { name: 'budgets', cols: ['created_at', 'updated_at'] },
    { name: 'recurring_transactions', cols: ['created_at'] },
    { name: 'user_settings', cols: ['last_report_sent'] },
  ];
  for (const { name, cols } of tables) {
    for (const col of cols) {
      try {
        db.run(`UPDATE ${name} SET ${col} = datetime(${col}, '${offset}') WHERE ${col} IS NOT NULL`);
      } catch(e) {}
    }
  }
  try { db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('tz_fixed', '1')"); } catch(e) {}
}

function rotateBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    for (let i = MAX_BACKUPS - 1; i >= 1; i--) {
      const src = path.join(BACKUP_DIR, `balance-backup-${i}.db`);
      const dst = path.join(BACKUP_DIR, `balance-backup-${i + 1}.db`);
      if (fs.existsSync(src)) fs.copyFileSync(src, dst);
    }
    fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, 'balance-backup-1.db'));
  } catch (e) {
    console.error('[backup error]', e.message);
  }
}

function save() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
    rotateBackups();
  }
}

export function localNow() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().replace('T', ' ').substring(0, 19);
}

export function all(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export function get(sql, params = []) {
  const rows = all(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sql, params = []) {
  db.run(sql, params);
  const result = db.exec("SELECT last_insert_rowid() as id");
  save();
  const lastId = result.length > 0 ? result[0].values[0][0] : null;
  return { lastInsertRowid: lastId };
}

function execInternal(sql) {
  db.run(sql);
  save();
}

export function close() {
  if (db) {
    save();
    db.close();
    db = null;
  }
}