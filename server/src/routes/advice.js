import { Router } from 'express';
import { all, get } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const OLLAMA_URL = 'http://localhost:11434/api/generate';

router.get('/', async (req, res) => {
  try {
    const initial = get('SELECT amount FROM initial_balance WHERE user_id = ?', [req.userId]);
    const initialAmount = initial ? initial.amount : 0;

    const totals = get(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses
      FROM transactions WHERE user_id = ?
    `, [req.userId]);

    const balance = initialAmount + totals.total_income - totals.total_expenses;

    const categoryBreakdown = all(`
      SELECT category, SUM(amount) as total
      FROM transactions WHERE user_id = ? AND type = 'expense'
      GROUP BY category ORDER BY total DESC
    `, [req.userId]);

    const monthlySpending = all(`
      SELECT substr(date, 1, 7) as month, SUM(amount) as total
      FROM transactions WHERE user_id = ? AND type = 'expense'
      GROUP BY month ORDER BY month DESC LIMIT 3
    `, [req.userId]);

    const data = { initialAmount, ...totals, balance, categoryBreakdown, monthlySpending };

    let tips, aiUsed = false;

    if (GROQ_API_KEY) {
      try {
        tips = await generateGroqAdvice(data);
        aiUsed = true;
      } catch (e) {
        console.error('[Groq error]', e.message);
      }
    }

    if (!tips) {
      const ollamaOk = await checkOllama();
      if (ollamaOk) {
        try {
          tips = await generateOllamaAdvice(data);
          aiUsed = true;
        } catch (e) {
          console.error('[Ollama error]', e.message);
        }
      }
    }

    if (!tips) {
      tips = generateRuleAdvice(data);
    }

    res.json({
      advice: tips,
      _ai: aiUsed,
      summary: { initial_balance: initialAmount, ...totals, current_balance: balance }
    });
  } catch (e) {
    console.error('[advice error]', e);
    res.status(500).json({ error: 'Errore nel generare i consigli' });
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

function buildPrompt(data) {
  const { total_income, total_expenses, balance, categoryBreakdown, monthlySpending } = data;
  const savings = total_income - total_expenses;
  const savingsRate = total_income > 0 ? ((savings / total_income) * 100).toFixed(1) : 0;
  const topCats = (categoryBreakdown || []).slice(0, 5).map(c => c.category + ' (' + c.total.toFixed(0) + '€)').join(', ');
  const monthlyTrend = (monthlySpending || []).map(m => m.month + ': ' + m.total.toFixed(0) + '€').join(', ');

  return `Sei un consulente finanziario. Fornisci 3-4 consigli specifici in italiano basati su questi dati:

- Saldo: ${balance.toFixed(0)}€
- Entrate: ${total_income.toFixed(0)}€
- Spese: ${total_expenses.toFixed(0)}€
- Risparmio: ${savings.toFixed(0)}€ (${savingsRate}%)
- Top categorie: ${topCats || 'nessuna'}
- Trend spese: ${monthlyTrend || 'nessun dato'}

Rispondi SOLO con 3-4 righe, una per consiglio, senza numeri ne formattazione.`;
}

async function generateGroqAdvice(data) {
  const prompt = buildPrompt(data);
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

async function generateOllamaAdvice(data) {
  const prompt = buildPrompt(data);
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

function generateRuleAdvice(data) {
  const { total_income, total_expenses, categoryBreakdown } = data;
  const savings = total_income - total_expenses;
  const savingsRate = total_income > 0 ? (savings / total_income) * 100 : 0;
  const tips = [];

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
  return tips;
}

export default router;
