const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'server', 'data', 'balance.db');
const BACKUP_DIR = path.join(__dirname, 'db-backups');
const MAX_COPIES = 3;
const POLL_MS = 3000;

let lastHash = null;
let lastSize = null;

function getHash(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    return { hash: crypto.createHash('md5').update(buf).digest('hex'), size: buf.length };
  } catch {
    return null;
  }
}

function initBackups() {
  if (!fs.existsSync(DB_PATH)) return;
  const current = getHash(DB_PATH);
  if (!current) return;

  for (let i = 1; i <= MAX_COPIES; i++) {
    const dest = path.join(BACKUP_DIR, `balance-backup-${i}.db`);
    try { fs.copyFileSync(DB_PATH, dest); } catch {}
  }
  lastHash = current.hash;
  lastSize = current.size;
  console.log(`[backup] Inizializzate ${MAX_COPIES} copie`);
}

function rotateBackups() {
  if (!fs.existsSync(DB_PATH)) return;

  const current = getHash(DB_PATH);
  if (!current) return;
  if (current.hash === lastHash && current.size === lastSize) return;

  lastHash = current.hash;
  lastSize = current.size;

  // Shift copies: 2→3, 1→2
  for (let i = MAX_COPIES - 1; i >= 1; i--) {
    const src = path.join(BACKUP_DIR, `balance-backup-${i}.db`);
    const dst = path.join(BACKUP_DIR, `balance-backup-${i + 1}.db`);
    if (fs.existsSync(src)) {
      try { fs.copyFileSync(src, dst); } catch {}
    }
  }

  // Copy current db to backup-1
  const dest = path.join(BACKUP_DIR, 'balance-backup-1.db');
  try {
    fs.copyFileSync(DB_PATH, dest);
    const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
    console.log(`[backup] ${ts} → db-backups/balance-backup-1.db`);
  } catch (e) {
    console.error('[backup error]', e.message);
  }
}

function restoreBackup(n) {
  const src = path.join(BACKUP_DIR, `balance-backup-${n}.db`);
  if (!fs.existsSync(src)) {
    console.error(`[restore] backup #${n} non trovato`);
    return false;
  }
  try {
    fs.copyFileSync(src, DB_PATH);
    console.log(`[restore] balance-backup-${n}.db → balance.db`);
    return true;
  } catch (e) {
    console.error('[restore error]', e.message);
    return false;
  }
}

// --- CLI ---
const args = process.argv.slice(2);
if (args[0] === 'restore' && args[1]) {
  restoreBackup(parseInt(args[1], 10));
  process.exit(0);
}

if (args[0] === 'list') {
  for (let i = 1; i <= MAX_COPIES; i++) {
    const p = path.join(BACKUP_DIR, `balance-backup-${i}.db`);
    if (fs.existsSync(p)) {
      const st = fs.statSync(p);
      const mod = st.mtime.toISOString().slice(0, 19).replace('T', ' ');
      console.log(`  #${i}: ${(st.size / 1024).toFixed(0)}KB (${mod})`);
    } else {
      console.log(`  #${i}: (vuoto)`);
    }
  }
  process.exit(0);
}

// Polling loop
console.log(`[backup] Monitoring ${DB_PATH}`);
console.log(`[backup] Backups in ${BACKUP_DIR}/`);
console.log(`[backup] Polling every ${POLL_MS / 1000}s`);

// Initial: crea tutte 3 le copie
initBackups();

setInterval(rotateBackups, POLL_MS);
