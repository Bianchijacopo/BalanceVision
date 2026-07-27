import { Router } from 'express';
import { run } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

function parseCSV(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if ((ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) && !inQuotes) {
      if (ch === '\r') i++;
      if (current.trim()) lines.push(current);
      current = '';
    } else if (ch === '\r' && !inQuotes) {
      if (current.trim()) lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);

  const delim = lines[0].includes(';') ? ';' : ',';

  function splitRow(row) {
    const cols = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        q = !q;
      } else if (ch === delim && !q) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    return cols;
  }

  const headers = splitRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const rows = lines.slice(1).filter(r => r.trim()).map(splitRow);

  return { headers, rows };
}

function guessColumn(aliases, headers) {
  for (const a of aliases) {
    const idx = headers.findIndex(h => h.includes(a));
    if (idx !== -1) return idx;
  }
  return -1;
}

router.post('/csv', (req, res) => {
  try {
    const { csv } = req.body;
    if (!csv || csv.trim().length === 0) {
      return res.status(400).json({ error: 'Nessun file CSV fornito' });
    }

    const { headers, rows } = parseCSV(csv);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Nessuna riga valida nel CSV' });
    }

    const dateIdx = guessColumn(['data', 'date', 'giorno', 'day'], headers);
    const descIdx = guessColumn(['descrizione', 'description', 'titolo', 'title', 'nome', 'name', 'causale'], headers);
    const amountIdx = guessColumn(['importo', 'amount', 'euro', 'valore', 'value', 'totale', 'total'], headers);
    const catIdx = guessColumn(['categoria', 'category', 'categorie', 'categories'], headers);
    const typeIdx = guessColumn(['tipo', 'type', 'tipologia'], headers);
    const noteIdx = guessColumn(['note', 'nota', 'notes', 'note'], headers);

    let created = 0;
    const errors = [];

    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];

      if (dateIdx === -1 || amountIdx === -1) {
        errors.push({ row: ri + 2, error: 'Colonne data e importo obbligatorie' });
        continue;
      }

      const rawDate = row[dateIdx] || '';
      const rawAmount = (row[amountIdx] || '').replace(/[€\s]/g, '').replace(',', '.');
      const title = (descIdx !== -1 ? row[descIdx] : 'Import ' + (ri + 1)) || 'Import ' + (ri + 1);
      const category = (catIdx !== -1 && row[catIdx]) ? row[catIdx] : 'Extra';
      const note = (noteIdx !== -1 && row[noteIdx]) ? row[noteIdx] : '';

      let date;
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        date = rawDate;
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
        const [d, m, y] = rawDate.split('/');
        date = `${y}-${m}-${d}`;
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(rawDate)) {
        const [d, m, y] = rawDate.split('-');
        date = `${y}-${m}-${d}`;
      } else {
        errors.push({ row: ri + 2, error: 'Formato data non valido: ' + rawDate });
        continue;
      }

      const amount = parseFloat(rawAmount);
      if (isNaN(amount) || amount <= 0) {
        errors.push({ row: ri + 2, error: 'Importo non valido: ' + rawAmount });
        continue;
      }

      let type;
      if (typeIdx !== -1) {
        const rawType = row[typeIdx].toLowerCase().trim();
        if (rawType === 'income' || rawType === 'entrata' || rawType === 'credito') {
          type = 'income';
        } else if (rawType === 'expense' || rawType === 'uscita' || rawType === 'debito' || rawType === 'spesa') {
          type = 'expense';
        } else {
          type = rawAmount.startsWith('-') ? 'expense' : 'income';
        }
      } else {
        type = rawAmount.startsWith('-') ? 'expense' : 'income';
      }

      try {
        run(`INSERT INTO transactions (user_id, type, title, amount, category, note, date)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [req.userId, type, title, Math.abs(amount), category, note, date]);
        created++;
      } catch (e) {
        errors.push({ row: ri + 2, error: e.message });
      }
    }

    res.json({ created, total: rows.length, errors: errors.length > 0 ? errors : undefined });
  } catch (e) {
    console.error('[import error]', e);
    res.status(500).json({ error: 'Errore durante l\'importazione' });
  }
});

export default router;
