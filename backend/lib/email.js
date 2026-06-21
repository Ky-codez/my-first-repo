// ─── Email sending ─────────────────────────────────────────────────────────────
// Provider-agnostic SMTP via nodemailer. Works with any SMTP provider —
// Resend, SendGrid, Mailgun, AWS SES, Postmark, even Gmail.
//
// CONFIGURE via backend/.env (or Fly secrets):
//   SMTP_HOST=smtp.resend.com
//   SMTP_PORT=465
//   SMTP_USER=resend
//   SMTP_PASS=re_xxxxxxxx          ← your provider's API key / SMTP password
//   EMAIL_FROM="Sipiary <no-reply@yourdomain.com>"
//
// GRACEFUL DEGRADATION: if SMTP isn't configured, emails are logged to the
// server console instead of sent — so local dev and pre-launch work fine, and
// nothing crashes. The reset link is printed so you can still test the flow.

const nodemailer = require('nodemailer');

let transporter = null;
const isConfigured = () =>
  !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);

function getTransporter() {
  if (transporter) return transporter;
  if (!isConfigured()) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

const FROM = () => process.env.EMAIL_FROM || 'Sipiary <no-reply@sipiary.app>';

// Send an email. Returns { sent: true } when actually delivered, or
// { sent: false, logged: true } when SMTP isn't configured (dev fallback).
async function sendEmail({ to, subject, text, html }) {
  const tx = getTransporter();
  if (!tx) {
    console.log('─────────────────────────────────────────────');
    console.log('📧 EMAIL (SMTP not configured — logging instead)');
    console.log(`   To:      ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body:\n${text}`);
    console.log('─────────────────────────────────────────────');
    return { sent: false, logged: true };
  }
  await tx.sendMail({ from: FROM(), to, subject, text, html });
  return { sent: true };
}

// Password-reset email — both plain text and a simple branded HTML version.
async function sendPasswordResetEmail(to, resetUrl) {
  const subject = 'Reset your Sipiary password';
  const text =
    `You (or someone) requested a password reset for your Sipiary account.\n\n` +
    `Reset your password here (link expires in 1 hour):\n${resetUrl}\n\n` +
    `If you didn't request this, you can safely ignore this email — your password won't change.\n\n` +
    `🍷 Sipiary`;
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#2a1418">
      <div style="font-size:32px;text-align:center">🍷</div>
      <h1 style="font-size:20px;text-align:center;color:#c0392b">Reset your password</h1>
      <p>You (or someone) requested a password reset for your Sipiary account.</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${resetUrl}" style="background:#c0392b;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block">
          Reset password
        </a>
      </p>
      <p style="font-size:13px;color:#888">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.</p>
      <p style="font-size:13px;color:#888">Or paste this link into your browser:<br><span style="word-break:break-all">${resetUrl}</span></p>
    </div>`;
  return sendEmail({ to, subject, text, html });
}

module.exports = { sendEmail, sendPasswordResetEmail, isConfigured };
