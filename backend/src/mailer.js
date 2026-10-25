const nodemailer = require('nodemailer');

const transport = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true }); // sem SMTP: apenas registra no log

// Somente texto puro (sem HTML) => sem risco de injeção de conteúdo nos e-mails.
async function notify(to, subject, text) {
  try {
    const info = await transport.sendMail({ from: process.env.MAIL_FROM || 'no-reply@assinatura.local', to, subject, text });
    if (!process.env.SMTP_HOST) console.log('[e-mail simulado]', subject, '->', to);
    return info;
  } catch (e) {
    console.error('Falha ao enviar e-mail:', e.message);
  }
}
module.exports = { notify };
