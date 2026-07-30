import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000
  });
  return transporter;
}

export async function sendEmail(to, subject, text, html) {
  const t = getTransporter();
  if (!t) {
    console.log('\n=== EMAIL (mock) ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Body:', text);
    console.log('====================\n');
    return;
  }
  await t.sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject,
    text,
    html: html || text
  });
}

const PURPOSE_TEXT = {
  verifica: 'Per completare la verifica del tuo account BalanceVision, e necessario confermare il tuo indirizzo email.',
  recupero: 'Per reimpostare la password del tuo account BalanceVision, utilizza il codice qui sotto.',
  eliminazione: 'Per eliminare il tuo account BalanceVision, conferma utilizzando il codice qui sotto.',
};
const PURPOSE_SUBJECT = {
  verifica: 'Codice di verifica BalanceVision',
  recupero: 'Recupero password BalanceVision',
  eliminazione: 'Eliminazione account BalanceVision',
};
const PURPOSE_FOOTER = {
  verifica: 'BalanceVision \u2013 Servizio di Verifica Account',
  recupero: 'BalanceVision \u2013 Recupero Password',
  eliminazione: 'BalanceVision \u2013 Eliminazione Account',
};

export function buildOtpEmail(name, otp, purpose) {
  purpose = purpose || 'verifica';
  const intro = PURPOSE_TEXT[purpose] || PURPOSE_TEXT.verifica;
  const footer = PURPOSE_FOOTER[purpose] || PURPOSE_FOOTER.verifica;

  const text = [
    PURPOSE_SUBJECT[purpose] || PURPOSE_SUBJECT.verifica,
    '',
    'Ciao ' + name + ',',
    '',
    intro,
    '',
    'Il tuo codice di verifica e: ' + otp,
    '',
    'Questo codice e valido per 10 minuti.',
    'Se non hai richiesto questa operazione, puoi ignorare questo messaggio.',
    '',
    'Cordiali saluti,',
    footer
  ].join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background: #F5F5F5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
    .container { max-width: 520px; margin: 0 auto; padding: 40px 24px; }
    .card { background: #FFFFFF; border-radius: 12px; padding: 40px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02); }
    .logo { font-size: 20px; font-weight: 700; letter-spacing: 0.5px; color: #000000; text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #E5E5E5; }
    .title { font-size: 16px; font-weight: 600; color: #1A1A1A; margin: 0 0 16px 0; text-align: center; }
    .intro { font-size: 14px; line-height: 1.6; color: #4D4D4D; margin: 0 0 28px 0; text-align: center; }
    .code-box { background: #FAFAFA; border: 1px solid #E5E5E5; border-radius: 10px; padding: 24px; text-align: center; margin-bottom: 28px; }
    .code-label { font-size: 11px; font-weight: 600; color: #808080; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; }
    .code { font-family: 'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', 'Consolas', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #D4AF37; }
    .note { font-size: 12px; line-height: 1.5; color: #808080; text-align: center; margin: 0; }
    .note + .note { margin-top: 4px; }
    .footer { font-size: 12px; color: #808080; text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E5E5; }
    .footer p { margin: 0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">BalanceVision</div>
      <h1 class="title">Codice di verifica</h1>
      <p class="intro">${intro}</p>
      <div class="code-box">
        <div class="code-label">Codice di verifica</div>
        <div class="code">${otp}</div>
      </div>
      <p class="note">Questo codice e valido per 10 minuti.</p>
      <p class="note">Se non hai richiesto questa operazione, puoi ignorare questo messaggio.</p>
      <div class="footer">
        <p>Cordiali saluti,</p>
        <p>${footer}</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { text, html };
}

export function buildSubject(purpose) {
  return PURPOSE_SUBJECT[purpose] || PURPOSE_SUBJECT.verifica;
}

export function isEmailConfigured() {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}
