# BalanceVision

Premium personal finance tracker con tema scuro "Wall Street Dark" e chiaro "Luxury Banking Light". Transazioni, grafici, budget, obiettivi di risparmio, analisi avanzate, consigli finanziari con AI, chat AI, transazioni ricorrenti, export PDF e app desktop Electron.

## Stack

- **Frontend**: React 19 + Vite 8 + Recharts 3
- **Backend**: Express 4
- **Database**: sql.js (SQLite puro JS, nessun modulo nativo)
- **Auth**: JWT + refresh token + OTP
- **AI**: Groq API (Llama 3.3 70B) o Ollama (locale)
- **Desktop**: Electron 41
- **PDF**: jsPDF + jspdf-autotable

## Requisiti

- Node.js >= 18 (testato con v24.16.0)
- Windows, Linux o macOS
- Git (per clonare)

## Download

```bash
git clone https://github.com/Bianchijacopo/BalanceVision.git
cd BalanceVision
```

## Avvio rapido (Windows)

Doppio click su `start.bat`. Lo script installa dipendenze, crea l'account admin e avvia tutto.

## Avvio manuale (tutti i sistemi)

### 1. Configurare il server

```bash
cd server
npm install
```

Crea il file `server/.env`:

```
JWT_SECRET=una-stringa-casuale-lunga-almeno-32-caratteri
GMAIL_USER=lasciare-vuoto-se-non-usato
GMAIL_APP_PASSWORD=lasciare-vuoto-se-non-usato
GROQ_API_KEY=lasciare-vuoto-se-non-usato
```

> Le email (OTP, reset password) funzionano solo con credenziali Gmail reali.
> L'app funziona comunque senza -- le OTP vengono stampate nella console del server.

Crea account admin e (opzionale) dati di test:

```bash
npm run seed            # crea admin@gmail.com / admin
npm run seed:test       # (opzionale) 6 mesi di transazioni fake
```

Avvia il server:

```bash
npm run dev
```

Il server resta in esecuzione su `http://localhost:3001`.

### 2. Avviare il client (in un altro terminale)

```bash
cd client
npm install
npm run dev
```

Il client si apre su `http://localhost:5173`.

### 3. Log in

| Email | Password |
|-------|----------|
| admin@gmail.com | admin |

## Utilizzo

### Dashboard

- Saldo corrente, entrate/uscite del mese, grafico andamento saldo
- Grafico a torta spese per categoria
- Transazioni filtrate per mese (usa le frecce `←` `→` per navigare)
- Budget e obiettivi con barre di progresso
- Insight: spesa media/giorno, categoria dominante, risparmio, previsione fine mese

### Transazioni Ricorrenti

Crea transazioni che si ripetono automaticamente (settimanale, mensile, annuale).
Ogni volta che carichi la Dashboard, l'app controlla se generarne di nuove.

### Consigli AI

- **Consigli automatici**: Nella pagina Consigli, l'AI analizza i tuoi dati e mostra suggerimenti personalizzati
- **Chat AI**: Puoi fare domande dirette come:
  - *"Come posso risparmiare di più?"*
  - *"Analizza le mie spese di questo mese"*
  - *"Dove sto spendendo troppo?"*
  - *"Quanto posso mettere da parte ogni mese?"*
- Le risposte includono **grassetto** per importi, elenchi puntati e paragrafi chiari

### AI Backend

L'app supporta due provider AI:

1. **Groq** (consigliato) — API cloud veloce e gratis
2. **Ollama** — AI locale (fallback se Groq non configurato)

Per attivare Groq:

1. Vai su [console.groq.com](https://console.groq.com) e registrati
2. Genera una chiave API
3. Aggiungila a `server/.env`:
   ```
   GROQ_API_KEY=gsk_la_tua_chiave
   ```
4. Riavvia l'app

Senza chiave Groq, l'app usa regole base (consigli non-AI).

## App desktop (Electron)

### Esecuzione diretta (senza packaging)

Assicurati di avere Electron installato e il frontend buildato:

```bash
cd client && npm install && npm run build && cd ..
npm install
.\node_modules\electron\dist\electron.exe .
```

### Collegamento sul desktop

Dopo aver eseguito almeno una volta l'app, trovi `BalanceVision.lnk` sul desktop.
Doppio click → l'app si apre direttamente senza console.

> Nota: il collegamento esegue `launch.bat` (dentro la cartella del progetto) che
> kill il vecchio processo sulla porta 3001 e avvia Electron.

### Packaging per .exe autonomo

```bash
cd client && npm install && npm run build && cd ..
npm install
npm run release-win    # produce l'exe in release/
```

L'eseguibile si trova in `release/BalanceVision-win32-x64/BalanceVision.exe`.

### Requisiti per il packaging

- Windows, npm, Node.js
- Aver eseguito `npm install` nella cartella `client/` e nella radice

### Pulire il database prima del packaging

```bash
del server\data\balance.db    # Windows
rm server/data/balance.db     # Linux/Mac
npm run build && npm run release-win
```

## Funzionalita

- Dashboard con saldo, grafici interattivi, transazioni, budget, obiettivi
- Transazioni con categorie personalizzabili (salvate in localStorage)
- Budget mensili per categoria con barre di progresso colorate
- Obiettivi di risparmio con sincronizzazione saldo
- Analisi Avanzata con grafici mensili/giornalieri e statistiche
- Transazioni Ricorrenti (settimanale, mensile, annuale)
- **Consigli AI** con Groq o Ollama + chat interattiva
- Export PDF (saldo iniziale, entrate/uscite, picchi, tabelle)
- Temi scuro/chiaro salvati in localStorage
- Modalita Focus (nasconde saldi per presentazioni)
- Autenticazione JWT con refresh token e OTP via email/console
- Profilo utente con avatar (base64)

## Struttura progetto

```
BalanceVision/
├── client/                  # Frontend React + Vite
│   ├── dist/                # Build di produzione (generato)
│   ├── src/
│   │   ├── components/      # Topbar, UI components
│   │   ├── context/         # AuthContext, ThemeContext, ToastContext
│   │   ├── pages/           # Login, Dashboard, Analytics, Budgets, Goals, Advice, Recurring
│   │   └── utils/           # categoryColors.js, categoryManager.js
│   ├── package.json
│   └── vite.config.js
├── server/                  # Backend Express
│   ├── data/                # Database SQLite (auto-creato, gitignorato)
│   ├── src/
│   │   ├── db/              # database.js (sql.js wrapper)
│   │   ├── middleware/      # auth.js (JWT verification)
│   │   ├── routes/          # auth, transactions, balance, advice, budgets, goals, recurring
│   │   └── index.js         # Entry point Express
│   └── package.json
├── electron.js              # Entry point Electron (main process)
├── launch.bat               # Script avvio (non tracciato da git)
├── icon.svg                 # Icona personalizzata per il collegamento
├── start.bat                # Avvio one-click (Windows)
└── package.json             # Root: script Electron + packaging
```

## Scripts disponibili

### Root
| Comando | Descrizione |
|---------|-------------|
| `npm run build` | Build del frontend |
| `npm run electron-start` | Avvia Electron con build gia pronta |
| `npm run electron-build` | Build + Electron |
| `npm run release-win` | Packaging Electron per Windows (.exe) |

### server/
| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Avvia server in watch mode su :3001 |
| `npm run seed` | Crea account admin |
| `npm run seed:test` | Crea dati di test (6 mesi) |

### client/
| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Avvia Vite dev server su :5173 |
| `npm run build` | Build di produzione in client/dist/ |

## API

Tutte le route tranne `/api/auth/*` richiedono header:
```
Authorization: Bearer <token>
```

### Auth
| Metodo | Path | Descrizione |
|--------|------|-------------|
| POST | `/api/auth/register` | Registrazione |
| POST | `/api/auth/login` | Login (JWT + refresh token) |
| POST | `/api/auth/refresh` | Rinnovo access token |
| POST | `/api/auth/send-otp` | Invia OTP via email/console |
| POST | `/api/auth/verify-otp` | Verifica OTP |
| POST | `/api/auth/reset-password` | Reset password con OTP |
| GET | `/api/auth/profile` | Profilo utente |
| PUT | `/api/auth/profile` | Aggiorna profilo/avatar |

### Transazioni
| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/transactions` | Lista transazioni (filtri: month, year, category, type, search) |
| GET | `/api/transactions/:id` | Singola transazione |
| POST | `/api/transactions` | Nuova transazione |
| PUT | `/api/transactions/:id` | Modifica transazione |
| DELETE | `/api/transactions/:id` | Elimina transazione |

### Bilancio
| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/balance` | Saldo, totali entrate/uscite, stats |
| GET | `/api/balance/history` | Storico saldo giorno per giorno |
| GET | `/api/balance/monthly` | Totali mensili entrate/uscite |

### Budget
| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/budgets` | Lista budget con spesa corrente |
| POST | `/api/budgets` | Nuovo budget |
| PUT | `/api/budgets/:id` | Modifica budget |
| DELETE | `/api/budgets/:id` | Elimina budget |

### Obiettivi
| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/goals` | Lista obiettivi |
| POST | `/api/goals` | Nuovo obiettivo |
| PUT | `/api/goals/:id` | Modifica obiettivo |
| DELETE | `/api/goals/:id` | Elimina obiettivo |

### Transazioni Ricorrenti
| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/recurring` | Lista ricorrenti |
| POST | `/api/recurring` | Nuova ricorrente |
| PUT | `/api/recurring/:id` | Modifica ricorrente |
| DELETE | `/api/recurring/:id` | Elimina ricorrente |
| POST | `/api/recurring/process` | Genera transazioni ora |

### Consigli
| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/advice` | Consigli finanziari + sommario |
| POST | `/api/advice/chat` | Chat AI (body: `{ message: "..." }`) |

## Dettagli tecnici

- Il database e' un file SQLite (`server/data/balance.db`) gestito da sql.js
- Le categorie personalizzate sono salvate in localStorage (non nel DB)
- I grafici usano Recharts (ComposedChart, Area, BarChart, PieChart)
- Il PDF e' generato lato client con jsPDF + jspdf-autotable
- L'app Electron fork il server Express in un processo figlio
- CORS accetta qualsiasi origine (necessario per `file://` in Electron)
- `client/vite.config.js` usa `base: './'` per path relativi (Electron)
- L'AI usa Groq API (Llama 3.3 70B) o in alternativa Ollama (locale)
- Le transazioni ricorrenti generano automaticamente nuove transazioni al caricamento della Dashboard
