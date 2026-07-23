import { Router } from 'express';
import { all, get } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
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

  const tips = generateAdvice({ initialAmount, ...totals, balance, categoryBreakdown });

  res.json({ advice: tips, summary: { initial_balance: initialAmount, ...totals, current_balance: balance } });
});

function generateAdvice(data) {
  const { total_income, total_expenses, categoryBreakdown } = data;
  const savings = total_income - total_expenses;
  const savingsRate = total_income > 0 ? (savings / total_income) * 100 : 0;

  const tips = [];

  if (savingsRate < 20) {
    tips.push('Il tuo tasso di risparmio e inferiore al 20%. Cerca di ridurre le spese non essenziali.');
  }

  if (categoryBreakdown && categoryBreakdown.length > 0) {
    const topCategory = categoryBreakdown[0];
    tips.push('La tua spesa maggiore e in "' + topCategory.category + '" (' + topCategory.total.toFixed(2) + ' EUR). Valuta se puoi ridurla.');
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