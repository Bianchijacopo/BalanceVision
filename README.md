# BalanceVision

**App per la gestione delle finanze personali** — dashboard interattiva, transazioni, budget, obiettivi, analisi avanzata, consigli AI, multi-lingua IT/EN, tema scuro/chiaro, import CSV, report email, esportazione PDF, app desktop Electron.

<p align="center">
  <a href="#installazione-e-setup" style="display: inline-block; padding: 12px 32px; background: #00b45a; color: #fff; font-size: 18px; font-weight: 700; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 8px rgba(0,180,90,0.3);">
    ⬇️ Vai alla Guida all'Installazione
  </a>
</p>

---

## 📋 Funzionalità Complete

### Dashboard Principale
- **Saldo corrente** — mostra il totale delle tue finanze con animazione quando cambia
- **Orologio in tempo reale** — data e ora locale (IT = 24h, EN = 12h AM/PM)
- **Navigazione mensile** — frecce ← → per spostarti tra i mesi; se apri l'app e il mese corrente non ha transazioni, salta automaticamente all'ultimo mese con dati
- **4 insight rapidi**: spesa media giornaliera, categoria dominante, tasso di risparmio, previsione saldo a fine mese
- **Grafico andamento saldo** (linea + area) — cliccabile per ingrandire in un modal con statistiche (min, max, inizio, fine)
- **Grafico a torta** delle spese per categoria — cliccando una fetta vedi l'elenco delle transazioni di quella categoria
- **Grafico proiezione** — linea continua = saldo reale, linea tratteggiata = proiezione fino a fine mese
- **Riepilogo**: totali entrate/uscite, numero transazioni
- **Budget** — se ci sono budget impostati, mostra le prime 4 categorie con barra di progresso colorata
- **Obiettivi** — se ci sono obiettivi, mostra i primi 3 con avanzamento
- **Transazioni filtrate**: testo libero (cerca in titolo *e* nota), categoria, tipo, intervallo date, intervallo importo
- **Toggle filtri avanzati**: mostra/nasconde filtri extra
- **Gestione rapida categorie custom**: aggiungi/elimina direttamente dalla dashboard senza andare nella pagina dedicata
- **Pulsanti navigazione rapida**: Analisi, Budget, Obiettivi, Consigli AI
- **Modal focus**: nasconde elementi non essenziali per concentrarti
- **Esportazione PDF**: scarica un report del mese corrente con saldo, entrate/uscite, picchi, tabelle dettagliate e grafico

### Transazioni
- **Aggiunta**: data, titolo, importo, tipo (entrata/uscita), categoria, nota opzionale
- **Modifica**: clicca il pulsante modifica (✎) su qualsiasi transazione
- **Eliminazione** con **Undo**:
  - Cancelli una transazione → compare un toast verde per 5 secondi con pulsante "Annulla"
  - Cliccando "Annulla" la transazione viene ripristinata immediatamente
  - Se non clicchi, la cancellazione è definitiva
- **Ricerca full-text**: il campo di ricerca cerca sia nel titolo che nella nota
- **Filtri**: per categoria, tipo (entrata/spesa), date, importo min/max
- **Categorie**: predefinite (Cibo, Casa, Trasporti, Salute, Svago, Abbigliamento, Bolle, Stipendi, Extra) + personalizzate

### Transazioni Ricorrenti
- Crea transazioni che si ripetono automaticamente
- **Frequenze**: settimanale, mensile, annuale (anche personalizzabile)
- **Date**: data inizio, data fine opzionale
- **Stato**: attiva/disattiva singolarmente con un toggle
- **Generazione automatica**: ogni volta che apri la Dashboard, l'app controlla se ci sono ricorrenze da generare e crea le transazioni mancanti
- Elenco completo con tutte le ricorrenze, possibilità di modificarle o eliminarle

### Budget
- Imposta un **budget mensile** per ogni categoria di spesa
- **Barra di progresso**: verde (hai speso ≤60%), giallo (60-80%), rosso (>80% o superato)
- Percentuale spesa/rimanente visibile
- Cliccando sul nome della categoria nella dashboard puoi modificare il budget al volo
- I budget sono mensili (cambiano ogni mese)

### Obiettivi di Risparmio
- Crea obiettivi con nome, importo target, scadenza
- **Tracking automatico**: aggiungi manualmente quanto hai risparmiato
- Barra di progresso che diventa verde quando raggiungi il 100%
- Gli obiettivi in corso appaiono nella Dashboard

### Analisi Avanzata
- **Due grafici**: entrate/uscite mensili a barre affiancate
- **Grafico giornaliero**: saldo giorno per giorno (linea)
- **Selettore periodo**: scegli un intervallo di date personalizzato
- **Statistiche complete**: saldo iniziale, saldo finale, picco massimo, minimo storico, numero transazioni
- **Categoria dominante** del periodo selezionato
- **Budget**: se presente per una categoria, mostra il confronto spesa vs budget

### Categorie Personalizzate
- **Aggiungi** nuove categorie con un nome
- **Elimina** categorie custom (quelle predefinite non si possono eliminare)
- **Colori**: ogni categoria ha un colore associato, modificabile con un color picker
- **Traduzione AI bilingue**:
  - Se crei una categoria in italiano (es. "Macchina") e passi all'inglese, viene tradotta in "Car"
  - Se crei una categoria in inglese (es. "Food") e passi all'italiano, **resta "Food"** perché è una parola internazionale
  - Funziona anche al contrario: parole italiane comuni a livello internazionale (Pizza, Hotel, Extra) restano invariate
  - Usa **Groq** (free) per le traduzioni
  - Le traduzioni vengono cachate in `localStorage` così non richiami l'API ogni volta che cambi lingua

### AI Finanziaria
- **Consigli automatici**: l'AI analizza i tuoi dati e mostra suggerimenti personalizzati su spese e risparmio
- **Chat interattiva**: fai domande dirette in linguaggio naturale, tipo:
  - *"Come posso risparmiare di più?"*
  - *"Analizza le mie spese"*
  - *"Dove spendo troppo?"*
  - *"Quanto mettere da parte ogni mese?"*
- Le risposte sono formattate con grassetto per importi, paragrafi separati, elenchi puntati
- **Bilingue**: se l'app è in italiano, tutto in italiano; se in inglese, tutto in inglese
- **Senza chiave Groq**: usa consigli basati su regole fisse (non AI, ma comunque funzionali)

### Backend AI — Groq (gratuito)
Il backend AI usa **Groq** (cloud, gratuito, senza bisogno di carta di credito):
1. Vai su **[console.groq.com](https://console.groq.com)** → **Sign up**
2. Dopo il login → **Create API Key**
3. Copia la chiave (es. `gsk_xxxx...`)
4. Aggiungila a `server/.env`:
   ```
   GROQ_API_KEY=gsk_la_tua_chiave
   ```
5. Riavvia l'app

**Senza chiave Groq**: consigli finanziari basati su regole (non AI), traduzione categorie disabilitata.

### Multi-lingua (IT/EN)
- **Italiano** (default) e **Inglese**
- Cambio lingua immediato dal menu in alto a destra
- Persiste in `localStorage` (riaprendo l'app resta l'ultima lingua scelta)
- Traduce:
  - Tutta l'interfaccia (bottoni, etichette, titoli, messaggi)
  - Categorie predefinite (Cibo → Food, Casa → Home, Trasporti → Transport...)
  - Consigli AI e chat (risposte nella lingua selezionata)
  - Date e orari (formato IT 24h / EN 12h AM/PM)
  - Testi delle email (report mensili)
- Categorie custom: traduzione automatica via AI al cambio lingua (vedi sezione Categorie)

### Import CSV
- Carica un file CSV con le tue transazioni (esportato dalla banca o da un altro gestionale)
- **Rilevamento automatico colonne**:
  - Supporta sia header in italiano che in inglese
  - Data, descrizione/titolo, importo, categoria, tipo, nota
- **Formati data supportati**: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
- **Riconoscimento entrata/spesa**: se l'importo è positivo → entrata, negativo → spesa (o con colonna separata)
- **Delimitatore**: riconosce sia virgola che punto e virgola
- **Anteprima**: prima di importare vedi quante transazioni verranno create
- **Riepilogo finale**: quante importate, eventuali errori

### Report Mensili via Email
- Ricevi un riepilogo mensile delle tue finanze via email
- **Il report include**:
  - Saldo corrente
  - Entrate totali del mese
  - Uscite totali del mese
  - Top 5 categorie di spesa con importi
- **Attivazione**: vai su Profilo → attiva "Report mensile"
- **Giorno del mese**: scegli il giorno in cui ricevere il report (default: 1)
- **Invia ora**: pulsante "Invia ora" per testare subito
- **Invio automatico**: l'app controlla ogni ora se è il giorno giusto e spedisce la mail

### Recupero Password
- **Password dimenticata?** clicca "Password dimenticata?" nella pagina di login
- **Step 1**: inserisci email → ricevi un OTP (codice monouso) via email
- **Step 2**: inserisci l'OTP ricevuto
- **Step 3**: imposta la nuova password
- L'OTP scade dopo 10 minuti

### Esportazione PDF
- Dalla Dashboard clicca il pulsante **Scarica** (↓)
- Il PDF include:
  - Intestazione con nome app e mese
  - Riepilogo: saldo iniziale, entrate mensili, uscite mensili, saldo finale
  - Picco e minimo del mese
  - Tabella dettagliata spese (data, descrizione, categoria, importo)
  - Tabella dettagliata entrate
  - Grafico andamento saldo
  - Generato con jsPDF + html2canvas
- Nome file: `BalanceVision_Report_YYYY-MM.pdf`

### Temi
- **Scuro** (default) — piacevole per uso serale/prolungato
- **Chiaro** — per ambienti molto illuminati
- Si cambia dal menu in alto a destra (icona ☀️/🌙)
- La scelta viene ricordata anche dopo aver chiuso l'app

### App Desktop (Electron)
- Funziona come programa standalone (non serve tener aperto il browser)
- Usa **Electron** per creare una finestra nativa
- Il server Express viene avviato in background con `fork()`
- Porta: `http://localhost:3001`
- **Collegamento sul desktop**: crea un file `.lnk` che clicchi e parte subito
- Lo script `launch.bat` kill automaticamente la vecchia porta 3001 prima di avviarsi (evita `EADDRINUSE`)

### Email Transazionali
- **OTP**: per recupero password (codice monouso via email)
- **Report mensili**: riepilogo automatico delle finanze (se attivato)
- Usa **Gmail SMTP** con app password
- Configurazione in `server/.env` (GMAIL_USER, GMAIL_APP_PASSWORD)

### Sicurezza
- Le password sono **hashate con bcrypt**
- **JWT token**: token di accesso scade dopo 15 minuti, refresh token dopo 7 giorni
- Le email OTP scadono dopo 10 minuti
- Le chiavi segrete (JWT, Gmail, Groq) stanno in `server/.env` che **non** è su GitHub
- I dati finanziari restano sul tuo computer (database SQLite locale)
- Il file `.env`, il database `.db`, `launch.bat`, `icon.ico` sono tutti esclusi da git

### Database
- **SQLite** (tramite `sql.js` in Node.js)
- Unico file: `server/data/balance.db` (si crea automaticamente alla prima apertura)
- Tabelle:
  - `users` — email, password hash, email verificata
  - `transactions` — data, tipo, categoria, importo, titolo, nota, user_id
  - `recurring_transactions` — titolo, importo, tipo, categoria, frequenza, date, attiva
  - `budgets` — categoria, importo, mese, user_id
  - `goals` — nome, importo target, importo corrente, scadenza, user_id
  - `otp_codes` — email, codice, scadenza
  - `user_settings` — report attivo, giorno report, data ultimo invio

### localStorage (Browser)
- `bv-lang` — lingua scelta
- `bv_custom_categories` — categorie personalizzate
- `bv_cat_colors` — colori assegnati a ogni categoria
- `bv_cat_trans_cache` — cache traduzioni AI con indicizzazione per lingua

---

<a name="installazione-e-setup"></a>

## Installazione e Setup

Guida passo-passo per scaricare e far partire BalanceVision sul tuo computer.

### Requisiti

- **Windows** (funziona anche su Linux/macOS con piccoli adattamenti)
- **Node.js v18+** — scarica da [nodejs.org](https://nodejs.org)
- **Git** — scarica da [git-scm.com](https://git-scm.com)
- **Connessione internet** (solo per il primo setup e per le funzionalità AI)

---

### Passo 1 — Scarica il progetto

Apri un **terminale** (PowerShell, cmd, o il terminale del tuo sistema operativo) e scrivi:

```bash
git clone https://github.com/Bianchijacopo/BalanceVision.git
cd BalanceVision
```

Questo scarica tutto il codice nella cartella `BalanceVision` e ci entra dentro.

---

### Passo 2 — Installa le dipendenze del server

Il server backend usa Express. Installa i pacchetti necessari:

```bash
cd server
npm install
cd ..
```

Il comando `npm install` legge il file `server/package.json` e scarica tutte le librerie necessarie dentro `server/node_modules/`.

---

### Passo 3 — Crea il file delle chiavi segrete (`server/.env`)

Il file `.env` contiene le chiavi sensibili (JWT, email, AI). **Non viene salvato su GitHub** (è già nel `.gitignore`).

1. Apri il **Blocco Note** (o qualsiasi editor di testo)
2. Incolla questo contenuto:

```
JWT_SECRET=mia-chiave-segreta-cambiame-12345
GMAIL_USER=
GMAIL_APP_PASSWORD=
GROQ_API_KEY=
```

3. Salva il file con nome **`.env`** dentro la cartella `server/`
   - **Importante**: il file si chiama `.env` (senza nome prima del punto). Su Windows potresti dover scrivere `.env.` e premere Invio — il sistema toglie l'ultimo punto automaticamente.

**Spiegazione di ogni campo:**

| Variabile | Obbligatoria? | Cosa serve |
|-----------|:---:|---|
| `JWT_SECRET` | ✅ **Sì** | Stringa casuale per firmare i token di login. Metti una frase a caso, tipo `la-mia-super-chiave-2024-x9k2`. |
| `GMAIL_USER` | ❌ No | Il tuo indirizzo Gmail per inviare email (OTP e report mensili). Lascia vuoto se non ti servono email. |
| `GMAIL_APP_PASSWORD` | ❌ No | Password per app di Gmail (non la tua password normale!). Vedi sotto per come crearne una. Lascia vuoto se non ti servono email. |
| `GROQ_API_KEY` | ❌ No | Chiave per l'AI Groq (gratis). Se vuota, l'app funziona senza AI (consigli fissi, niente traduzione categorie). |

**Come ottenere la GMAIL_APP_PASSWORD:**
1. Vai su [myaccount.google.com/security](https://myaccount.google.com/security)
2. Attiva la **Verifica in due passaggi** (se non è già attiva)
3. Cerca "Password per le app" (o vai su [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords))
4. Seleziona "Gmail" e genera
5. Copia la password di 16 lettere (es. `abcd efgh ijkl mnop`) e mettila in `GMAIL_APP_PASSWORD`
6. `GMAIL_USER` deve essere il tuo indirizzo Gmail completo (es. `tuaemail@gmail.com`)

**Come ottenere la GROQ_API_KEY:**
1. Vai su **[console.groq.com](https://console.groq.com)** e registrati (gratis, no carta di credito)
2. Clicca **Create API Key**
3. Copia la chiave (es. `gsk_xxxx...`) e mettila in `GROQ_API_KEY`

---

### Passo 4 — Installa le dipendenze del frontend e globali

Torna nella cartella principale del progetto e installa:

```bash
npm install
cd client
npm install
cd ..
```

- Il primo `npm install` (nella radice) installa Electron e gli strumenti di packaging
- Il secondo (in `client/`) installa React, Vite, Recharts e tutte le librerie frontend

---

### Passo 5 — Avvia l'app (prima volta)

Puoi avviare BalanceVision in due modi:

#### Opzione A — Modalità browser (sviluppo)
Doppio click su `start.bat` nella cartella del progetto, oppure da terminale:

```bash
start.bat
```

Si aprirà il browser su `http://localhost:5173`.

#### Opzione B — App desktop (Electron)
Prima costruisci il frontend, poi avvia Electron:

```bash
cd client
npm run build
cd ..
npm run electron-start
```

Si aprirà una finestra nativa di BalanceVision.

**Nota**: il `build` va rifatto ogni volta che modifichi il codice del frontend. Per lo sviluppo quotidiano usa la modalità browser (Opzione A), così le modifiche si vedono in tempo reale.

---

### Passo 6 — Registrati

1. Apri l'app
2. Clicca **Registrati**
3. Inserisci email e password
4. Fatto — sei dentro!

---

### Passo 7 (opzionale) — Crea il collegamento sul desktop

Se usi l'app desktop Electron e vuoi un'icona sul desktop per aprirla con un click:

1. Apri **PowerShell** (cerca "PowerShell" nel menu Start, clicca con destro → Esegui come amministratore)
2. Incolla questo comando e premi Invio:

```powershell
$ws = New-Object -ComObject WScript.Shell
$projectDir = "C:\Users\$env:USERNAME\Desktop\BalanceVision"
$bat = "$projectDir\launch.bat"
@"
@echo off
cd /d "C:\Users\$env:USERNAME\Desktop\BalanceVision"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do taskkill /F /PID %%a >nul 2>&1
start /B "" "node_modules\electron\dist\electron.exe" .
"@ | Out-File -FilePath $bat -Encoding ASCII -Force

$lnk = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\BalanceVision.lnk')
$lnk.TargetPath = 'C:\Windows\System32\cmd.exe'
$lnk.Arguments = '/c "' + $bat + '"'
$lnk.WorkingDirectory = $projectDir
$lnk.WindowStyle = 7
$lnk.Description = 'BalanceVision - Personal Finance'
$lnk.IconLocation = "$projectDir\icon.ico, 0"
$lnk.Save()
Write-Host 'Fatto! Clicca sul collegamento sul desktop per aprire.'
```

Questo crea due file:
- **`launch.bat`** dentro la cartella BalanceVision — kill la porta 3001 se occupata e avvia Electron
- **`BalanceVision.lnk`** sul desktop — lo shortcut che userai

**Dopo**, basta doppio click su `BalanceVision.lnk` sul desktop e l'app parte.

---

### Dati di Test (opzionale)

Se vuoi vedere l'app con dati pre-caricati per fare prove:

```bash
cd server
npm run seed:test
cd ..
```

Questo crea un account con email `test@example.com` e password `test123`, con 6 mesi di transazioni fittizie, budget e obiettivi.

---

## Comandi Rapidi

| Dove | Comando | Cosa fa |
|------|---------|---------|
| radice | `npm run electron-start` | Avvia l'app desktop (Electron) |
| radice | `start.bat` | Avvia in modalità browser (sviluppo) |
| radice | `npm run build` | Builda il frontend per produzione |
| client/ | `npm run build` | Builda il frontend |
| client/ | `npm run dev` | Avvia il server di sviluppo frontend su :5173 |
| server/ | `npm run dev` | Avvia solo il server backend su :3001 |
| server/ | `npm run seed` | Crea un account admin di test |
| server/ | `npm run seed:test` | Crea 6 mesi di dati finti per test |

---

## Struttura del Progetto

```
BalanceVision/
│
├── client/                          # Frontend React + Vite
│   ├── dist/                        # Build di produzione (si genera con npm run build)
│   ├── src/
│   │   ├── components/              # Componenti riutilizzabili (Topbar, ecc.)
│   │   ├── context/                 # Provider React (Auth, Language, Theme, Api, Toast)
│   │   ├── i18n/                    # Traduzioni (it.js, en.js)
│   │   ├── pages/                   # Tutte le pagine dell'app
│   │   │   ├── Dashboard.jsx        # Pagina principale
│   │   │   ├── TransactionForm.jsx  # Aggiungi/modifica transazione
│   │   │   ├── Recurring.jsx        # Transazioni ricorrenti
│   │   │   ├── Budget.jsx           # Gestione budget
│   │   │   ├── Goals.jsx            # Obiettivi di risparmio
│   │   │   ├── AnalisiAvanzata.jsx  # Analisi dettagliata
│   │   │   ├── Advice.jsx           # AI consigli e chat
│   │   │   ├── Categories.jsx       # Gestione categorie personalizzate
│   │   │   ├── ImportCsv.jsx        # Importazione CSV
│   │   │   ├── Profile.jsx          # Profilo e impostazioni report
│   │   │   ├── Login.jsx            # Pagina di login
│   │   │   ├── Register.jsx         # Registrazione
│   │   │   ├── ForgotPassword.jsx   # Recupero password
│   │   │   └── ...                  # Altre pagine (VerifyEmail, EditProfile, ChangePassword)
│   │   ├── utils/                   # Utility (categorie, colori, ecc.)
│   │   ├── index.css                # Stili globali
│   │   ├── App.jsx                  # Router principale
│   │   └── main.jsx                 # Entry point
│   ├── public/                      # File statici
│   └── index.html                   # HTML base
│
├── server/                          # Backend Express
│   ├── data/                        # Database SQLite (si crea da solo)
│   ├── src/
│   │   ├── routes/                  # API routes
│   │   │   ├── auth.js              # Login, registrazione, OTP, reset password
│   │   │   ├── transactions.js      # CRUD transazioni
│   │   │   ├── balance.js           # Calcolo saldo
│   │   │   ├── advice.js            # Consigli AI e chat
│   │   │   ├── budgets.js           # CRUD budget
│   │   │   ├── goals.js             # CRUD obiettivi
│   │   │   ├── recurring.js         # CRUD transazioni ricorrenti
│   │   │   ├── import.js            # Import CSV
│   │   │   ├── reports.js           # Report email mensili
│   │   │   └── translate.js         # Traduzione AI categorie
│   │   ├── db/
│   │   │   └── database.js          # Inizializzazione SQLite, schema, query
│   │   ├── middleware/
│   │   │   └── auth.js              # Middleware JWT
│   │   ├── email.js                 # Invio email (Gmail SMTP)
│   │   └── index.js                 # Entry point server
│   └── .env                         # CHIAVI SEGRETE (NON su GitHub!)
│
├── electron.js                      # Avvio Electron (fork del server + finestra)
├── launch.bat                       # Script per il collegamento desktop
├── icon.svg                         # Icona dell'app
├── icon.ico                         # Icona Windows (.ico, non su GitHub)
├── start.bat                        # Avvio veloce in modalità browser
├── package.json                     # Dipendenze globali (Electron, ecc.)
└── README.md                        # Questo file
```

---

## Note Tecniche

- **Database**: SQLite locale tramite `sql.js` (un file `server/data/balance.db`)
- **Categorie personalizzate**: salvate nel browser (`localStorage`), non nel database
- **Traduzioni UI**: file JSON in `client/src/i18n/` (it.js / en.js)
- **Traduzioni AI categorie**: chiamata a Groq quando cambi lingua, risultato cachato in `localStorage`
- **Server**: Express su porta 3001
- **Frontend (dev)**: Vite su porta 5173 (con proxy verso :3001)
- **Electron**: usa `fork()` per avviare il server Express, poi carica `http://localhost:3001`
- **AI**: modello `llama-3.3-70b-versatile` su Groq cloud
- **PDF**: generato con jsPDF + autoTable + html2canvas
- **Grafici**: Recharts (basato su React)
- **Tema**: CSS custom properties, alternanza scuro/chiaro via class su `<body>`
- **JWT**: token breve (15 min) + refresh token (7 giorni), gestito in ApiContext.jsx
