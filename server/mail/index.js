import nodemailer from 'nodemailer';
import { mailText } from './texts.js';

// E-Mail-Versand über SMTP (funktioniert mit jedem Anbieter: Infomaniak, Postmark, Resend, Brevo, …).
// Konfiguration über SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM und APP_URL.
// Ohne SMTP_HOST wird nichts verschickt; die App funktioniert sonst unverändert.

let transport = null;

export const hasMail = () => Boolean(process.env.SMTP_HOST);

function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transport;
}

// Öffentliche Adresse der App für Links in E-Mails
export function appUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return req ? `${req.protocol}://${req.get('host')}` : 'http://localhost:3000';
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Schlichtes, helles Layout, das in allen Mailprogrammen funktioniert
function layout({ title, lines, button, footer }) {
  const paragraphs = lines.map((l) => `<p style="margin:0 0 14px;line-height:1.55">${esc(l)}</p>`).join('');
  const cta = button
    ? `<p style="margin:22px 0"><a href="${esc(button.url)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#141a33;color:#ffffff;text-decoration:none;font-weight:500">${esc(button.label)}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f4f6fc;font-family:Inter,-apple-system,'Segoe UI',sans-serif;color:#121734">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<div style="font-size:20px;font-weight:600;letter-spacing:-0.02em;margin-bottom:22px">Mizax</div>
<div style="background:#ffffff;border-radius:22px;padding:26px 24px;border:1px solid rgba(20,26,51,0.07)">
<h1 style="margin:0 0 14px;font-size:20px;font-weight:500">${esc(title)}</h1>${paragraphs}${cta}
</div>
<p style="margin:18px 6px 0;font-size:12px;line-height:1.5;color:rgba(18,23,52,0.52)">${esc(footer)}</p>
</div></body></html>`;
}

/**
 * Verschickt eine E-Mail aus einer Vorlage (siehe texts.js) in der Sprache des Empfängers.
 * Fehler werden protokolliert, aber nie an den Aufrufer weitergegeben.
 */
export async function sendTemplate(user, key, vars = {}, url = null) {
  const m = mailText(user.locale, key, { name: user.name, ...vars });
  const text = [...m.lines, url ? `${m.button}: ${url}` : '', '', m.footer].filter((x) => x !== null).join('\n');
  if (!hasMail()) {
    console.log(`[mail] SMTP nicht konfiguriert – E-Mail "${key}" an Konto ${user.id} nicht verschickt`);
    return false;
  }
  try {
    await getTransport().sendMail({
      from: process.env.MAIL_FROM || 'Mizax <no-reply@mizax.ch>',
      to: user.email,
      subject: m.subject,
      text,
      html: layout({ title: m.title, lines: m.lines, button: url ? { url, label: m.button } : null, footer: m.footer }),
    });
    return true;
  } catch (err) {
    console.error(`[mail] Versand fehlgeschlagen (${key}): ${err.message}`);
    return false;
  }
}
