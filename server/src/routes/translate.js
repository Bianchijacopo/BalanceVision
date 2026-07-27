import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

router.post('/', async (req, res) => {
  const { text, from, to } = req.body;
  if (!text || !from || !to) {
    return res.status(400).json({ error: 'Missing text, from, or to' });
  }

  if (!GROQ_API_KEY) {
    return res.json({ translation: text });
  }

  try {
    const resp = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_API_KEY,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: `Translate the following word from ${from} to ${to}. Reply with ONLY the translated word, nothing else. No punctuation, no quotes, no explanation.` },
          { role: 'user', content: text },
        ],
        temperature: 0.1,
        max_tokens: 50,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) throw new Error('Groq ' + resp.status);
    const json = await resp.json();
    const translation = json.choices?.[0]?.message?.content?.trim() || text;
    res.json({ translation });
  } catch (e) {
    console.error('[translate error]', e.message);
    res.json({ translation: text });
  }
});

export default router;
