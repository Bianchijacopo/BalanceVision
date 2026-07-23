import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
  });
  return transporter;
}

export async function sendEmail(to, subject, text) {
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
    text
  });
}
