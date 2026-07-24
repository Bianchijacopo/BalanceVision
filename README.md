# BalanceVision

App per gestire le finanze personali con dashboard, grafici, budget, obiettivi, transazioni ricorrenti e **consigli AI**. Tema scuro/chiaro.

## Requisiti

- **Windows** (o Linux/macOS)
- **Node.js** v18+ ([nodejs.org](https://nodejs.org))
- **Git** ([git-scm.com](https://git-scm.com))

---

## Download del progetto

Apri un terminale e scrivi:

```bash
git clone https://github.com/Bianchijacopo/BalanceVision.git
cd BalanceVision
```

---

## Prima configurazione (una volta sola)

### 1. Installa le dipendenze del server

```bash
cd server
npm install
cd ..
```

### 2. Crea il file `server/.env`

Apri il Blocco Note, incolla questo e salvalo come `server/.env`:

```
JWT_SECRET=mia-chiave-segreta-cambiame-12345
GMAIL_USER=
GMAIL_APP_PASSWORD=
GROQ_API_KEY=
```

- `JWT_SECRET` = una stringa a caso (necessaria per i login)
- `GMAIL_USER` / `GMAIL_APP_PASSWORD` = lasciali vuoti (servono solo per email OTP)
- `GROQ_API_KEY` = chiave AI (opzionale, vedi sezione AI sotto)

### 3. Installa Electron (per l'app desktop)

```bash
npm install
```

Installa Electron e gli strumenti per il packaging.

### 4. Crea l'account admin

```bash
cd server
npm run seed
cd ..
```

Crea l'utente **admin@gmail.com** con password **admin**.

### 5. Installa il frontend

```bash
cd client
npm install
cd ..
```

**Fatto.** La configurazione è completa.

---

## Avvio rapido (modalità browser - sviluppo)

Doppio click su **`start.bat`** (si trova nella cartella del progetto).

Oppure da terminale:

```bash
start.bat
```

Questo apre il browser su `http://localhost:5173`.

---

## App desktop (Electron)

Per usare l'app come programma standalone (senza browser):

### 1. Build del frontend

```bash
cd client
npm run build
cd ..
```

### 2. Avvia l'app

```bash
npm run electron-start
```

Oppure direttamente:

```bash
.\node_modules\electron\dist\electron.exe .
```

Si apre la finestra di BalanceVision.

### 3. Crea il collegamento sul desktop (così clicchi e parte)

Apri **PowerShell** (cerca "PowerShell" nel menu Start) e incolla questo:

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

Questo crea:
- `launch.bat` dentro la cartella del progetto (ammazza la vecchia porta e avvia Electron)
- `BalanceVision.lnk` sul desktop con la tua icona personalizzata

**Dopo, basta doppio click su `BalanceVision.lnk` sul desktop.**

---

## Login

| Email | Password |
|-------|----------|
| admin@gmail.com | admin |

Puoi creare altri utenti dalla pagina di registrazione.

---

## Come usare l'app

### Dashboard
- **Saldo corrente** in alto con animazione quando cambia
- **Frecce ← →** per navigare tra i mesi
- **Grafico andamento saldo** cliccabile per ingrandire
- **Grafico a torta** delle spese per categoria
- **Budget** e **obiettivi** con barre di progresso
- **Insight**: spesa media/giorno, categoria dominante, risparmio, previsione fine mese
- **Transazioni** filtrabili per categoria, tipo e testo

### Transazioni
- Aggiungi, modifica, elimina transazioni
- Tipo: entrata (income) o spesa (expense)
- Categorie personalizzabili (si salvano automaticamente)
- Data, importo, nota

### Transazioni Ricorrenti
- Crea transazioni che si ripetono: **settimanale**, **mensile**, **annuale**
- Ogni volta che apri la Dashboard, l'app genera automaticamente quelle da fare
- Puoi attivarle/disattivarle singolarmente
- Data inizio e fine (opzionale)

### Budget
- Imposta un budget mensile per categoria
- Barra di progresso colorata: verde (ok), giallo (attenzione), rosso (superato)
- Vedi quanto hai speso vs budget

### Obiettivi di Risparmio
- Crea obiettivi con nome, importo target e scadenza
- La dashboard mostra l'avanzamento
- Si aggiorna automaticamente con le transazioni

### Analisi Avanzata
- Grafici mensili: entrate/uscite a barre
- Grafico giornaliero: saldo giorno per giorno
- Statistiche: saldo iniziale/finale, picco, minimo, numero transazioni
- Selettore periodo personalizzato

### Consigli AI e Chat
- **Consigli automatici**: l'AI analizza i tuoi dati e mostra suggerimenti personalizzati
- **Chat**: fai domande dirette sull'andamento delle tue finanze
  - *"Come posso risparmiare di più?"*
  - *"Analizza le mie spese"*
  - *"Dove spendo troppo?"*
  - *"Quanto mettere da parte ogni mese?"*
- Le risposte usano **grassetto** per gli importi, paragrafi separati e elenchi puntati

### AI Backend (Groq)

Per avere consigli intelligenti serve una chiave **Groq** (gratis):

1. Vai su **[console.groq.com](https://console.groq.com)** e clicca **Sign up**
2. Dopo il login clicca **Create API Key**
3. Copia la chiave (es. `gsk_xxxx...`)
4. Apri `server/.env` e aggiungi:
   ```
   GROQ_API_KEY=gsk_la_tua_chiave
   ```
5. Salva e riavvia l'app

Senza chiave Groq, l'app usa consigli basati su regole fisse (non AI).

### Esportazione PDF
- Dalla Dashboard clicca **Scarica PDF**
- Include: saldo iniziale, entrate/uscite, picchi, tabelle dettagliate e grafico
- Nome file: `BalanceVision_Report_YYYY-MM.pdf`

### Temi
- Scuro (default) o chiaro
- Si cambia dal menu in alto a destra
- Viene ricordato anche dopo aver chiuso l'app

---

## Script utili

| Dove | Comando | Cosa fa |
|------|---------|---------|
| radice | `.\node_modules\electron\dist\electron.exe .` | Avvia l'app desktop |
| radice | `start.bat` | Avvia in modalità browser (dev) |
| client/ | `npm run build` | Builda il frontend |
| server/ | `npm run seed` | Crea account admin |
| server/ | `npm run seed:test` | Crea 6 mesi di dati finti |
| server/ | `npm run dev` | Avvia solo il server |

---

## Struttura del progetto

```
BalanceVision/
├── client/                  # Frontend React + Vite
│   ├── dist/                # Build di produzione (si genera con npm run build)
│   └── src/pages/           # Dashboard, Analytics, Advice, Recurring, ...
├── server/                  # Backend Express
│   ├── data/                # Database (si crea da solo)
│   ├── src/routes/          # auth, transactions, advice, recurring, ...
│   └── .env                 # CHIAVI SEGRETE (non su GitHub!)
├── electron.js              # Avvio Electron
├── launch.bat               # Script per il collegamento desktop
├── icon.svg                 # Icona personalizzata
└── start.bat                # Avvio veloce browser
```

---

## Sicurezza

- `server/.env` contiene chiavi segrete → **MAI su GitHub** (già in `.gitignore`)
- Le password sono hashate con bcrypt
- I token JWT scadono dopo 15 minuti (refresh token dopo 7 giorni)
- I dati finanziari restano sul tuo computer

---

## Note tecniche

- Il database è SQLite (un file `server/data/balance.db`)
- Le categorie personalizzate sono salvate nel browser (localStorage)
- L'app Electron usa `fork()` per avviare il server Express
- La porta è 3001 (se occupata, il launcher la kill automaticamente)
