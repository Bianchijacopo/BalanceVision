import { Router } from 'express';
import { authMiddleware, verifiedMiddleware } from '../middleware/auth.js';
import { DEFAULT_CATEGORIES } from '../shared/categories.js';

const router = Router();
router.use(authMiddleware);
router.use(verifiedMiddleware);

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const cache = new Map();

function keywordMatch(title) {
  const lower = title.toLowerCase();

  const rules = [
    { keywords: ['ristorante', 'pizza', 'cena', 'pranzo', 'colazione', 'past', 'cibo', 'spesa', 'aliment', 'panino', 'sushi', 'caffè', 'bar'], cat: 'Cibo' },
    { keywords: ['affitto', 'mutuo', 'casa', 'condominio', 'arred', 'mobil'], cat: 'Casa' },
    { keywords: ['benzina', 'treno', 'bus', 'metro', 'taxi', 'trasport', 'parcheggio', 'pedaggio', 'biglietto', 'carburante'], cat: 'Trasporti' },
    { keywords: ['farmaci', 'medico', 'dottore', 'ospedale', 'dentista', 'salute', 'sanità', 'psicologo', 'visita'], cat: 'Salute' },
    { keywords: ['cinema', 'teatro', 'concerto', 'viaggio', 'vaca', 'svago', 'gioco', 'hobby', 'sport', 'palestra', 'netflix', 'spotify'], cat: 'Svago' },
    { keywords: ['vestit', 'scarpe', 'abbigliamento', 'moda', 'giacca', 'pantaloni'], cat: 'Abbigliamento' },
    { keywords: ['luce', 'gas', 'acqua', 'bolletta', 'telefono', 'internet', 'enel', 'energia'], cat: 'Bolle' },
    { keywords: ['stipendio', 'bonus', 'pagamento', 'salario', 'paga', 'mensile'], cat: 'Stipendi' },
    { keywords: ['bonifico', 'regalo', 'extra', 'altro', 'varie'], cat: 'Extra' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some(k => lower.includes(k))) {
      return rule.cat;
    }
  }
  return null;
}

async function groqSuggest(title, lang) {
  const isEn = lang === 'en';
  const cats = DEFAULT_CATEGORIES.join(', ');

  const prompt = isEn
    ? `Given the transaction title "${title}", suggest the most appropriate category from this list: ${cats}. Reply ONLY with the category name, nothing else.`
    : `Dato il titolo transazione "${title}", suggerisci la categoria più appropriata da questa lista: ${cats}. Rispondi SOLO con il nome della categoria, nient'altro.`;

  const resp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + GROQ_API_KEY,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 50,
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!resp.ok) throw new Error('Groq ' + resp.status);
  const json = await resp.json();
  const text = (json.choices?.[0]?.message?.content || '').trim();

  if (DEFAULT_CATEGORIES.includes(text)) {
    return text;
  }
  return null;
}

router.post('/', async (req, res) => {
  try {
    const { title, lang } = req.body;
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const cached = cache.get(title);
    if (cached) {
      return res.json({ category: cached, source: 'cache' });
    }

    let category = null;
    let source = 'keyword';

    if (GROQ_API_KEY) {
      try {
        category = await groqSuggest(title, lang);
        source = 'ai';
      } catch (e) {
        console.error('[Groq suggest error]', e.message);
      }
    }

    if (!category) {
      category = keywordMatch(title);
    }

    if (!category) {
      category = DEFAULT_CATEGORIES[0];
    }

    cache.set(title, category);
    res.json({ category, source });
  } catch (e) {
    console.error('[suggest-category error]', e);
    res.status(500).json({ error: 'Error suggesting category' });
  }
});

export default router;
