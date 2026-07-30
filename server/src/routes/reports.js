import { Router } from 'express';
import { get, run, all } from '../db/database.js';
import { authMiddleware, verifiedMiddleware } from '../middleware/auth.js';
import { validate, schemas } from '../utils/validate.js';
import { sendEmail } from '../email.js';

const router = Router();
router.use(authMiddleware);
router.use(verifiedMiddleware);

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_IT = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

function getMonthName(m, lang) {
  const idx = parseInt(m.split('-')[1], 10) - 1;
  return lang === 'en' ? MONTHS_EN[idx] : MONTHS_IT[idx];
}

async function buildReportEmail(userId, lang) {
  const user = await get('SELECT email, name FROM users WHERE id = ?', [userId]);
  if (!user) return null;

  const settings = await get('SELECT currency FROM user_settings WHERE user_id = ?', [userId]);
  const currency = settings?.currency || 'EUR';

  const fmt = (v) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v);

  const now = new Date();
  const curMonth = now.toISOString().slice(0, 7);
  const monthStart = curMonth + '-01';
  const nextMonth = now.getMonth() === 11
    ? (now.getFullYear() + 1) + '-01-01'
    : curMonth.slice(0, 5) + String(now.getMonth() + 2).padStart(2, '0') + '-01';

  const initial = await get('SELECT amount FROM initial_balance WHERE user_id = ?', [userId]);
  const initialAmount = initial ? initial.amount : 0;

  const totals = await get(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses
    FROM transactions WHERE user_id = ? AND date >= ? AND date < ?
  `, [userId, monthStart, nextMonth]);

  const balance = initialAmount + totals.income - totals.expenses;
  const savings = totals.income - totals.expenses;

  const topCats = await all(`
    SELECT category, SUM(amount) as total
    FROM transactions WHERE user_id = ? AND type = 'expense' AND date >= ? AND date < ?
    GROUP BY category ORDER BY total DESC LIMIT 5
  `, [userId, monthStart, nextMonth]);

  const monthDisplay = getMonthName(curMonth, lang);
  const name = user.name || user.email;

  const isEn = lang === 'en';

  const subject = isEn
    ? `BalanceVision - ${monthDisplay} Financial Report`
    : `BalanceVision - Report finanziario ${monthDisplay}`;

  const escapeHtml = (s) => String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const catRows = (topCats || []).map(c =>
    `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#4D4D4D">${escapeHtml(c.category)}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${fmt(c.total)}</td></tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<style>
  body{margin:0;padding:0;background:#F5F5F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif}
  .container{max-width:520px;margin:0 auto;padding:40px 24px}
  .card{background:#fff;border-radius:12px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
  .logo{font-size:20px;font-weight:700;letter-spacing:.5px;color:#000;text-align:center;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #e5e5e5}
  .greeting{font-size:14px;color:#4D4D4D;margin:0 0 24px 0;line-height:1.6}
  .summary{background:#FAFAFA;border-radius:10px;padding:20px;margin-bottom:24px}
  .summary-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}
  .summary-label{color:#808080}
  .summary-value{font-weight:600;color:#1A1A1A}
  .summary-value.positive{color:#00B365}
  .summary-value.negative{color:#E53E3E}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  th{padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#808080;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #e5e5e5}
  .footer{font-size:12px;color:#808080;text-align:center;margin-top:24px;padding-top:20px;border-top:1px solid #e5e5e5}
</style></head>
<body>
<div class="container">
  <div class="card">
    <div class="logo">BalanceVision</div>
    <p class="greeting">${isEn ? 'Hello' : 'Ciao'} ${name},</p>
    <p class="greeting">${isEn
      ? `Here is your financial summary for <strong>${monthDisplay}</strong>:`
      : `Ecco il riepilogo finanziario di <strong>${monthDisplay}</strong>:`}</p>
    <div class="summary">
      <div class="summary-row">
        <span class="summary-label">${isEn ? 'Balance' : 'Saldo'}</span>
        <span class="summary-value">${fmt(balance)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">${isEn ? 'Income' : 'Entrate'}</span>
        <span class="summary-value positive">+${fmt(totals.income)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">${isEn ? 'Expenses' : 'Spese'}</span>
        <span class="summary-value negative">-${fmt(totals.expenses)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">${isEn ? 'Savings' : 'Risparmio'}</span>
        <span class="summary-value ${savings >= 0 ? 'positive' : 'negative'}">${savings >= 0 ? '+' : ''}${fmt(savings)}</span>
      </div>
    </div>
    ${(topCats || []).length > 0 ? `
    <h3 style="font-size:13px;font-weight:600;color:#1A1A1A;margin:0 0 12px 0">${isEn ? 'Top expense categories' : 'Categorie spesa principali'}</h3>
    <table>
      <thead><tr><th>${isEn ? 'Category' : 'Categoria'}</th><th style="text-align:right">${isEn ? 'Amount' : 'Importo'}</th></tr></thead>
      <tbody>${catRows}</tbody>
    </table>` : ''}
    <p class="greeting" style="margin-bottom:0;text-align:center;color:#808080;font-size:12px">
      ${isEn ? 'This report is generated automatically by BalanceVision.' : 'Questo report e generato automaticamente da BalanceVision.'}
    </p>
  </div>
</div>
</body>
</html>`;

  const text = isEn
    ? `BalanceVision - ${monthDisplay} Report\n\nBalance: ${fmt(balance)}\nIncome: ${fmt(totals.income)}\nExpenses: ${fmt(totals.expenses)}\nSavings: ${fmt(savings)}`
    : `BalanceVision - Report ${monthDisplay}\n\nSaldo: ${fmt(balance)}\nEntrate: ${fmt(totals.income)}\nSpese: ${fmt(totals.expenses)}\nRisparmio: ${fmt(savings)}`;

  return { to: user.email, subject, text, html };
}

router.post('/send', async (req, res) => {
  try {
    const lang = req.query.lang || 'it';
    const email = await buildReportEmail(req.userId, lang);
    if (!email) {
      return res.status(400).json({ error: lang === 'en' ? 'User not found' : 'Utente non trovato' });
    }
    await sendEmail(email.to, email.subject, email.text, email.html);
    const now = new Date().toISOString().slice(0, 10);
    const existing = await get('SELECT id FROM user_settings WHERE user_id = ?', [req.userId]);
    if (existing) {
      await run('UPDATE user_settings SET last_report_sent = ? WHERE user_id = ?', [now, req.userId]);
    }
    res.json({ success: true, message: lang === 'en' ? 'Report sent' : 'Report inviato' });
  } catch (e) {
    console.error('[report send error]', e);
    res.status(500).json({ error: lang === 'en' ? 'Error sending report' : 'Errore nell\'invio del report' });
  }
});

router.get('/settings', async (req, res) => {
  let settings = await get('SELECT * FROM user_settings WHERE user_id = ?', [req.userId]);
  if (!settings) {
    await run('INSERT INTO user_settings (user_id) VALUES (?)', [req.userId]);
    settings = await get('SELECT * FROM user_settings WHERE user_id = ?', [req.userId]);
  }
  res.json({
    report_enabled: !!settings.report_enabled,
    report_day: settings.report_day,
    last_report_sent: settings.last_report_sent,
  });
});

router.put('/settings', validate(schemas.reportSettings), async (req, res) => {
  const { report_enabled, report_day } = req.body;
  const existing = await get('SELECT id FROM user_settings WHERE user_id = ?', [req.userId]);
  if (existing) {
    await run('UPDATE user_settings SET report_enabled = ?, report_day = ? WHERE user_id = ?',
      [report_enabled, report_day || 1, req.userId]);
  } else {
    await run('INSERT INTO user_settings (user_id, report_enabled, report_day) VALUES (?, ?, ?)',
      [req.userId, report_enabled, report_day || 1]);
  }
  res.json({ success: true });
});

async function checkAutoReports() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const day = new Date().getDate();
    const users = await all(`SELECT u.id, u.email, u.name, s.report_day, s.last_report_sent
      FROM user_settings s JOIN users u ON u.id = s.user_id
      WHERE s.report_enabled = true AND s.report_day = ?`, [day]);
    for (const user of users) {
      if (user.last_report_sent) {
        const sentDate = typeof user.last_report_sent === 'string'
          ? user.last_report_sent.slice(0, 10)
          : new Date(user.last_report_sent).toISOString().slice(0, 10);
        if (sentDate === today) continue;
      }
      const lang = 'it';
      const email = await buildReportEmail(user.id, lang);
      if (email) {
        sendEmail(email.to, email.subject, email.text, email.html).catch(() => {});
        await run('UPDATE user_settings SET last_report_sent = ? WHERE user_id = ?', [today, user.id]);
      }
    }
  } catch (e) {
    console.error('[auto report check error]', e);
  }
}

let intervalStarted = false;
export function startAutoReports() {
  if (intervalStarted) return;
  intervalStarted = true;
  checkAutoReports();
  setInterval(checkAutoReports, 3600000);
}

export default router;
