import { Router } from 'express';
import { authMiddleware, verifiedMiddleware } from '../middleware/auth.js';
import { validate, schemas } from '../utils/validate.js';

const router = Router();
router.use(authMiddleware);
router.use(verifiedMiddleware);

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

router.post('/', validate(schemas.translate), async (req, res) => {
  const { text, from, to } = req.body;

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
          { role: 'system', content: `Translate the following word from ${from} to ${to}.

RULES:
- If the word is already in ${to} or is a word commonly used internationally in both languages (like "Food", "Hotel", "Taxi", "Pizza", "Internet", etc.), return it UNCHANGED.
- If the word would sound unnatural in ${to} without translation, translate it.
- Reply with ONLY the word, nothing else. No punctuation, no quotes.` },
          { role: 'user', content: text },
        ],
        temperature: 0.1,
        max_tokens: 50,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) throw new Error('Groq ' + resp.status);
    const json = await resp.json();
    let translation = json.choices?.[0]?.message?.content?.trim() || text;
    // if Groq returned the same word, keep original
    if (translation.toLowerCase() === text.toLowerCase()) {
      translation = text;
    }
    res.json({ translation });
  } catch (e) {
    console.error('[translate error]', e.message);
    res.json({ translation: text });
  }
});

export default router;
