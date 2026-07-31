import pg from 'pg';

const { Pool } = pg;

// Parse NUMERIC (OID 1700) as JS number instead of string
pg.types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

let pool = null;

export async function getDb() {
  if (pool) return pool;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 10,
  });
  await initSchema();
  return pool;
}

function convertParams(sql, params) {
  let idx = 0;
  const parsed = sql.replace(/\?/g, () => `$${++idx}`);
  return { sql: parsed, params };
}

export async function all(sql, params = []) {
  const client = await pool.connect();
  try {
    const { sql: parsed, params: args } = convertParams(sql, params);
    const res = await client.query(parsed, args);
    return res.rows;
  } finally {
    client.release();
  }
}

export async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function run(sql, params = []) {
  const client = await pool.connect();
  try {
    let finalSql = sql;
    if (/^INSERT\s/i.test(sql) && !/RETURNING/i.test(sql)) {
      finalSql = sql + ' RETURNING id';
    }
    if (/^INSERT OR REPLACE\s/i.test(sql)) {
      finalSql = sql.replace(/^INSERT OR REPLACE INTO (\w+)\s/i, (_, table) => {
        return `INSERT INTO ${table} `;
      });
    }
    const { sql: parsed, params: args } = convertParams(finalSql, params);
    const res = await client.query(parsed, args);
    const lastId = res.rows.length > 0 ? res.rows[0].id : null;
    return { lastInsertRowid: lastId };
  } finally {
    client.release();
  }
}

export function localNow() {
  const d = new Date();
  return d.toISOString();
}

async function initSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        surname TEXT DEFAULT '',
        email_verified BOOLEAN DEFAULT true,
        otp TEXT DEFAULT NULL,
        otp_expiry TIMESTAMPTZ DEFAULT NULL,
        avatar TEXT DEFAULT NULL,
        last_login_ip TEXT DEFAULT NULL,
        last_login_at TIMESTAMPTZ DEFAULT NULL,
        login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        title TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL CHECK(amount > 0),
        category TEXT NOT NULL,
        date DATE NOT NULL,
        note TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS initial_balance (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        ip TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        target_amount NUMERIC(12,2) NOT NULL CHECK(target_amount > 0),
        current_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        deadline TEXT DEFAULT '',
        category TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        month TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL CHECK(amount > 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, category, month)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        title TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL CHECK(amount > 0),
        category TEXT NOT NULL,
        note TEXT DEFAULT '',
        frequency TEXT NOT NULL DEFAULT 'monthly',
        start_date DATE NOT NULL,
        end_date DATE DEFAULT NULL,
        last_generated TIMESTAMPTZ DEFAULT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        report_enabled BOOLEAN NOT NULL DEFAULT false,
        report_day INTEGER NOT NULL DEFAULT 1,
        last_report_sent TIMESTAMPTZ DEFAULT NULL,
        currency TEXT NOT NULL DEFAULT 'EUR'
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS exchange_rates (
        base_currency TEXT NOT NULL DEFAULT 'EUR',
        target_currency TEXT NOT NULL,
        rate NUMERIC(12,6) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (base_currency, target_currency)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
    // Migrate existing users — auto-verify all
    await client.query(`UPDATE users SET email_verified = true WHERE email_verified IS NULL OR email_verified = false`);
  } finally {
    client.release();
  }
}

export async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
