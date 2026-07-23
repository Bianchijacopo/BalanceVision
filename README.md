# BalanceVision

Premium personal finance tracker con tema scuro "Wall Street Dark" e chiaro "Luxury Banking Light". Tenuta registri transazioni, grafici, proiezioni a 30 giorni e consigli finanziari basati su regole.

## Stack

- **Frontend**: React 19 + Vite 8 + Recharts 3
- **Backend**: Express 4
- **Database**: sql.js (SQLite puro JS, nessun modulo nativo)
- **Auth**: JWT + bcryptjs

## Requisiti

- Node.js >= 18 (testato con v24.16.0)
- Windows (per `start.bat`), ma funziona anche su Linux/Mac via terminale

## Avvio rapido (Windows)

Doppio click su `start.bat`. Lo script:

1. Installa le dipendenze del server (`server/`)
2. Installa le dipendenze del client (`client/`)
3. Crea l'account admin (`admin@gmail.com` / `admin`)
4. Avvia il server su `http://localhost:3001`
5. Avvia il client su `http://localhost:5173`
6. Apre il browser

## Avvio manuale

```bash
# 1. Dipendenze server
cd server
npm install
npm run seed    # crea admin@gmail.com / admin

# 2. Dipendenze client
cd ../client
npm install

# 3. Avvia server (in un terminale)
cd ../server
npm run dev     # http://localhost:3001

# 4. Avvia client (in un altro terminale)
cd ../client
npm run dev     # http://localhost:5173
```

## Account di default

| Email | Password |
|-------|----------|
| admin@gmail.com | admin |

## Struttura progetto

```
BalanceVision/
├── client/                  # Frontend React + Vite
│   └── src/
│       ├── components/      # UI components (Topbar)
│       ├── context/         # AuthContext, ThemeContext, ApiContext
│       ├── pages/           # Login, Register, Dashboard, TransactionForm, Advice
│       └── utils/           # categoryColors.js
├── server/                  # Backend Express
│   └── src/
│       ├── db/              # database.js (sql.js wrapper)
│       ├── middleware/      # auth.js (JWT)
│       └── routes/          # auth, transactions, balance, advice
├── data/                    # Database SQLite (auto-creato)
└── start.bat                # Avvio con un click (Windows)
```

## API

Tutte le route tranne `/api/auth/*` richiedono header `Authorization: Bearer <token>`.

| Metodo | Path | Descrizione |
|--------|------|-------------|
| POST | `/api/auth/register` | Registrazione |
| POST | `/api/auth/login` | Login (restituisce JWT) |
| GET | `/api/balance` | Saldo corrente, totali entrate/uscite |
| GET | `/api/transactions` | Lista transazioni |
| POST | `/api/transactions` | Nuova transazione |
| DELETE | `/api/transactions/:id` | Elimina transazione |
| GET | `/api/advice` | Consigli finanziari + sommario |

## Tema

- **Wall Street Dark**: sfondo `#000000`, verde `#00FF5A`, rosso `#FF0033`, oro `#D4AF37`
- **Luxury Banking Light**: sfondo bianco, oro `#D4AF37`
- Il tema si alterna con il pulsante in Topbar e viene salvato in localStorage

## Consigli finanziari

I consigli sono generati lato server con regole logiche basate sulle transazioni:

- Tasso di risparmio < 20% → suggerimento riduzione spese
- Categoria con spesa maggiore → segnalazione
- Spese > 80% entrate → avviso
- Situazione sana → messaggio positivo

Non viene usata alcuna API esterna o AI.
