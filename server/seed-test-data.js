import { getDb, get, run, close } from './src/db/database.js';

const CATEGORIES = ['Cibo', 'Casa', 'Trasporti', 'Salute', 'Svago', 'Abbigliamento', 'Bolle', 'Stipendi', 'Extra'];

const MONTHLY_DATA = [
  { month: '2026-01', incomes: 3, expenses: 6 },
  { month: '2026-02', incomes: 2, expenses: 5 },
  { month: '2026-03', incomes: 4, expenses: 7 },
  { month: '2026-04', incomes: 3, expenses: 5 },
  { month: '2026-05', incomes: 2, expenses: 8 },
  { month: '2026-06', incomes: 3, expenses: 6 },
];

function rand(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(yearMonth) {
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  return yearMonth + '-' + day;
}

const INCOME_TITLES = ['Stipendio', 'Freelance', 'Vendita', 'Rimborso', 'Bonus', 'Interessi', 'Affitto ricevuto'];
const EXPENSE_TITLES_BY_CAT = {
  'Cibo': ['Supermercato', 'Pizza', 'Ristorante', 'Panetteria', 'Macelleria', 'Frutta'],
  'Casa': ['Affitto', 'Condominio', 'Manutenzione', 'Arredamento', 'Pulizie'],
  'Trasporti': ['Benzina', 'Autobus', 'Taxi', 'Pedaggio', 'Parcheggio'],
  'Salute': ['Farmacia', 'Visita medica', 'Palestra', 'Assicurazione'],
  'Svago': ['Cinema', 'Concerto', 'Videogiochi', 'Libri', 'Sport'],
  'Abbigliamento': ['Scarpe', 'Giacca', 'Jeans', 'Maglietta'],
  'Bolle': ['Luce', 'Gas', 'Acqua', 'Internet', 'Telefono'],
  'Extra': ['Regalo', 'Abbonamento', 'Carta regalo', 'Spese varie'],
};
const ALL_CATS = Object.keys(EXPENSE_TITLES_BY_CAT);

async function seedTestData() {
  await getDb();

  const user = get('SELECT id FROM users WHERE email = ?', ['admin@gmail.com']);
  if (!user) {
    console.log('Account admin non trovato. Esegui prima npm run seed.');
    close();
    process.exit(1);
  }

  const userId = user.id;
  const existing = get('SELECT COUNT(*) as c FROM transactions WHERE user_id = ?', [userId]);
  if (existing.c > 0) {
    console.log('Sono gia presenti %d transazioni. Le cancello prima di inserire i dati di test...', existing.c);
    run('DELETE FROM transactions WHERE user_id = ?', [userId]);
  }

  const initialBalance = get('SELECT amount FROM initial_balance WHERE user_id = ?', [userId]);
  if (!initialBalance) {
    run('INSERT INTO initial_balance (user_id, amount) VALUES (?, ?)', [userId, 5000]);
    console.log('Saldo iniziale impostato a €5.000,00');
  }

  let total = 0;

  for (const md of MONTHLY_DATA) {
    for (let i = 0; i < md.incomes; i++) {
      const date = randomDate(md.month);
      const title = pick(INCOME_TITLES);
      const amount = rand(800, 3500);
      run(
        'INSERT INTO transactions (user_id, type, title, amount, category, date) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, 'income', title, amount, 'Stipendi', date]
      );
      total++;
    }

    for (let i = 0; i < md.expenses; i++) {
      const date = randomDate(md.month);
      const cat = pick(ALL_CATS);
      const title = pick(EXPENSE_TITLES_BY_CAT[cat]);
      const amount = rand(10, 400);
      run(
        'INSERT INTO transactions (user_id, type, title, amount, category, date) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, 'expense', title, amount, cat, date]
      );
      total++;
    }
  }

  console.log('Inserite %d transazioni di test da gennaio a giugno 2026.', total);
  close();
}

seedTestData().catch(err => {
  console.error('Errore:', err);
  process.exit(1);
});
