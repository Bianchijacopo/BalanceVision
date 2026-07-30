import { Router } from 'express';
import { all, get } from '../db/database.js';
import { authMiddleware, verifiedMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);
router.use(verifiedMiddleware);

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const OLLAMA_URL = 'http://localhost:11434/api/generate';

router.get('/', async (req, res) => {
  try {
    const lang = req.query.lang || 'it';
    const initial = await get('SELECT amount FROM initial_balance WHERE user_id = ?', [req.userId]);
    const initialAmount = initial ? initial.amount : 0;

    const totals = await get(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses
      FROM transactions WHERE user_id = ?
    `, [req.userId]);

    const balance = initialAmount + totals.total_income - totals.total_expenses;

    const categoryBreakdown = await all(`
      SELECT category, SUM(amount) as total
      FROM transactions WHERE user_id = ? AND type = 'expense'
      GROUP BY category ORDER BY total DESC
    `, [req.userId]);

    const monthlySpending = await all(`
      SELECT TO_CHAR(date, 'YYYY-MM') as month, SUM(amount) as total
      FROM transactions WHERE user_id = ? AND type = 'expense'
      GROUP BY month ORDER BY month DESC LIMIT 3
    `, [req.userId]);

    const data = { initialAmount, ...totals, balance, categoryBreakdown, monthlySpending };

    let tips, aiUsed = false;

    if (GROQ_API_KEY) {
      try {
        tips = await generateGroqAdvice(data, lang);
        aiUsed = true;
      } catch (e) {
        console.error('[Groq error]', e.message);
      }
    }

    if (!tips) {
      const ollamaOk = await checkOllama();
      if (ollamaOk) {
        try {
          tips = await generateOllamaAdvice(data, lang);
          aiUsed = true;
        } catch (e) {
          console.error('[Ollama error]', e.message);
        }
      }
    }

    if (!tips) {
      tips = generateRuleAdvice(data, lang);
    }

    res.json({
      advice: tips,
      _ai: aiUsed,
      summary: { initial_balance: initialAmount, ...totals, current_balance: balance }
    });
  } catch (e) {
    console.error('[advice error]', e);
    res.status(500).json({ error: lang === 'en' ? 'Error generating advice' : 'Errore nel generare i consigli' });
  }
});

async function checkOllama() {
  try {
    const resp = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) });
    return resp.ok;
  } catch {
    return false;
  }
}

function buildPrompt(data, lang) {
  const isEn = lang === 'en';
  const { total_income, total_expenses, balance, categoryBreakdown, monthlySpending } = data;
  const savings = total_income - total_expenses;
  const savingsRate = total_income > 0 ? ((savings / total_income) * 100).toFixed(1) : 0;
  const topCats = (categoryBreakdown || []).slice(0, 5).map(c => c.category + ' (' + c.total.toFixed(0) + '€)').join(', ');
  const monthlyTrend = (monthlySpending || []).map(m => m.month + ': ' + m.total.toFixed(0) + '€').join(', ');

  if (isEn) {
    return `You are a financial advisor. Give 3-4 specific tips in English based on this data:

- Balance: ${balance.toFixed(0)}€
- Income: ${total_income.toFixed(0)}€
- Expenses: ${total_expenses.toFixed(0)}€
- Savings: ${savings.toFixed(0)}€ (${savingsRate}%)
- Top categories: ${topCats || 'none'}
- Spending trend: ${monthlyTrend || 'no data'}

Reply ONLY with 3-4 lines, one tip per line, no numbers or formatting.`;
  }

  return `Sei un consulente finanziario. Fornisci 3-4 consigli specifici in italiano basati su questi dati:

- Saldo: ${balance.toFixed(0)}€
- Entrate: ${total_income.toFixed(0)}€
- Spese: ${total_expenses.toFixed(0)}€
- Risparmio: ${savings.toFixed(0)}€ (${savingsRate}%)
- Top categorie: ${topCats || 'nessuna'}
- Trend spese: ${monthlyTrend || 'nessun dato'}

Rispondi SOLO con 3-4 righe, una per consiglio, senza numeri ne formattazione.`;
}

async function generateGroqAdvice(data, lang) {
  const prompt = buildPrompt(data, lang);
  const resp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + GROQ_API_KEY,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) throw new Error('Groq ' + resp.status);
  const json = await resp.json();
  const text = json.choices?.[0]?.message?.content || '';
  return text.split('\n').map(l => l.replace(/^[-*\d]+[.)\s]*/, '').trim()).filter(l => l.length > 10);
}

async function generateOllamaAdvice(data, lang) {
  const prompt = buildPrompt(data, lang);
  const resp = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama3.2', prompt, stream: false, options: { temperature: 0.7 } }),
    signal: AbortSignal.timeout(30000),
  });

  if (!resp.ok) throw new Error('Ollama ' + resp.status);
  const json = await resp.json();
  const text = json.response || '';
  return text.split('\n').map(l => l.replace(/^[-*\d]+[.)\s]*/, '').trim()).filter(l => l.length > 10);
}

router.post('/chat', async (req, res) => {
  const { message, lang } = req.body;
  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: lang === 'en' ? 'Enter a message' : 'Inserisci un messaggio' });
  }

  try {
    const initial = await get('SELECT amount FROM initial_balance WHERE user_id = ?', [req.userId]);
    const initialAmount = initial ? initial.amount : 0;

    const totals = await get(`
      SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
             COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses
      FROM transactions WHERE user_id = ?
    `, [req.userId]);

    const balance = initialAmount + totals.total_income - totals.total_expenses;

    const categoryBreakdown = await all(`
      SELECT category, SUM(amount) as total
      FROM transactions WHERE user_id = ? AND type = 'expense'
      GROUP BY category ORDER BY total DESC LIMIT 10
    `, [req.userId]);

    const recentTx = await all(`
      SELECT date, type, title, amount, category FROM transactions
      WHERE user_id = ? ORDER BY date DESC LIMIT 15
    `, [req.userId]);

    const isEn = lang === 'en';
    const systemPrompt = isEn
      ? `You are a personal financial advisor. Reply in English.

FORMATTING RULES (mandatory):
- Use **bold** for numbers, amounts, and key concepts
- Use bullet lists with "-" for lists
- Separate paragraphs with blank lines
- Start with a brief 1-2 line summary
- At the end, if appropriate, give 1-2 practical tips

USER DATA:
- Balance: ${balance.toFixed(0)}€
- Total income: ${totals.total_income.toFixed(0)}€
- Total expenses: ${totals.total_expenses.toFixed(0)}€
- Savings: ${(totals.total_income - totals.total_expenses).toFixed(0)}€

EXPENSE CATEGORIES: ${(categoryBreakdown || []).map(c => c.category + ' ' + c.total.toFixed(0) + '€').join(', ')}

RECENT TRANSACTIONS: ${(recentTx || []).map(t => t.date + ' ' + t.title + ' ' + t.amount.toFixed(0) + '€').join(', ')}

Always use **bold** to highlight numbers and amounts. Do not use markdown beyond bold and bullet lists.`
      : `Sei un consulente finanziario personale. Rispondi in italiano.

REGOLE DI FORMATTAZIONE (obbligatorie):
- Usa **grassetto** per numeri, importi, e concetti chiave
- Usa elenchi puntati con "-" per liste
- Dividi in paragrafi staccati con righe vuote
- Inizia con un breve riassunto di 1-2 righe
- Alla fine, se appropriato, dai 1-2 consigli pratici

DATI DELL'UTENTE:
- Saldo: ${balance.toFixed(0)}€
- Entrate totali: ${totals.total_income.toFixed(0)}€
- Spese totali: ${totals.total_expenses.toFixed(0)}€
- Risparmio: ${(totals.total_income - totals.total_expenses).toFixed(0)}€

CATEGORIE SPESE: ${(categoryBreakdown || []).map(c => c.category + ' ' + c.total.toFixed(0) + '€').join(', ')}

TRANSAZIONI RECENTI: ${(recentTx || []).map(t => t.date + ' ' + t.title + ' ' + t.amount.toFixed(0) + '€').join(', ')}

Usa sempre **grassetto** per evidenziare numeri e importi. Non usare markdown oltre al grassetto e agli elenchi puntati.`;

    const reply = await groqChat(systemPrompt, message);
    res.json({ reply });
  } catch (e) {
    console.error('[advice chat error]', e);
    res.status(500).json({ error: lang === 'en' ? 'Error in response' : 'Errore nella risposta' });
  }
});

async function groqChat(systemPrompt, userMessage) {
  const resp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + GROQ_API_KEY,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 800,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!resp.ok) throw new Error('Groq ' + resp.status);
  const json = await resp.json();
  return json.choices?.[0]?.message?.content || 'Non ho capito, riprova.';
}

function generateRuleAdvice(data, lang) {
  const { total_income, total_expenses, categoryBreakdown } = data;
  const savings = total_income - total_expenses;
  const savingsRate = total_income > 0 ? (savings / total_income) * 100 : 0;
  const tips = [];

  if (lang === 'en') {
    if (savingsRate < 20) {
      tips.push('Your savings rate is below 20%. Try to reduce non-essential expenses.');
    }
    if (categoryBreakdown && categoryBreakdown.length > 0) {
      tips.push('Your biggest expense is "' + categoryBreakdown[0].category + '" (' + categoryBreakdown[0].total.toFixed(2) + ' EUR). Consider if you can reduce it.');
    }
    if (total_expenses > total_income * 0.8) {
      tips.push('Your expenses exceed 80% of your income. Be careful not to go into the red!');
    }
    if (tips.length === 0) {
      tips.push('Great job! Your finances are in order. Keep it up.');
    }
  } else {
    if (savingsRate < 20) {
      tips.push('Il tuo tasso di risparmio e inferiore al 20%. Cerca di ridurre le spese non essenziali.');
    }
    if (categoryBreakdown && categoryBreakdown.length > 0) {
      tips.push('La tua spesa maggiore e in "' + categoryBreakdown[0].category + '" (' + categoryBreakdown[0].total.toFixed(2) + ' EUR). Valuta se puoi ridurla.');
    }
    if (total_expenses > total_income * 0.8) {
      tips.push('Le tue spese superano l\'80% delle entrate. Attento a non andare in rosso!');
    }
    if (tips.length === 0) {
      tips.push('Ottimo lavoro! Le tue finanze sono in ordine. Continua cosi.');
    }
  }
  return tips;
}

export default router;
