const { Resend } = require('resend');

let _resend = null;
function getResend() {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[emailService] RESEND_API_KEY not set — emails will not be sent');
      return null;
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@propertyhack.com';

const brandColor = '#d4b038';
const darkBg = '#2b2b2b';

function baseTemplate(content) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:560px">
        <tr>
          <td style="background:${darkBg};padding:24px 32px">
            <span style="color:${brandColor};font-size:22px;font-weight:700;letter-spacing:-0.5px">PropertyHack</span>
          </td>
        </tr>
        <tr><td style="padding:32px">${content}</td></tr>
        <tr>
          <td style="background:#f0f0f0;padding:16px 32px;text-align:center">
            <span style="color:#888;font-size:12px">&copy; PropertyHack. Australian property news.</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendWelcomeEmail(to, displayName) {
  const name = displayName || 'there';
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#2b2b2b;font-size:24px">Welcome to PropertyHack, ${name}!</h2>
    <p style="margin:0 0 16px;color:#444;line-height:1.6">
      You're now part of Australia's go-to property news platform. Stay across the latest market updates,
      investment insights, and property news &mdash; tailored to what matters to you.
    </p>
    <p style="margin:0 0 24px;color:#444;line-height:1.6">
      Check your inbox for a verification code to activate your account.
    </p>
    <a href="https://propertyhack.com.au" style="display:inline-block;background:${brandColor};color:#2b2b2b;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:6px">
      Visit PropertyHack
    </a>
  `);

  const resend = getResend();
  if (!resend) return;
  try {
    await resend.emails.send({ from: FROM, to, subject: 'Welcome to PropertyHack', html });
  } catch (err) {
    console.error('[emailService] sendWelcomeEmail failed:', err.message);
  }
}

async function sendVerificationOtp(to, otpCode) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#2b2b2b;font-size:24px">Verify your email</h2>
    <p style="margin:0 0 24px;color:#444;line-height:1.6">
      Enter the code below to verify your email address. This code expires in 10 minutes.
    </p>
    <div style="background:#f0f0f0;border-radius:8px;padding:24px;text-align:center;margin:0 0 24px">
      <span style="font-size:40px;font-weight:700;letter-spacing:10px;color:#2b2b2b">${otpCode}</span>
    </div>
    <p style="margin:0;color:#888;font-size:13px">
      If you didn't create a PropertyHack account, you can safely ignore this email.
    </p>
  `);

  const resend = getResend();
  if (!resend) return;
  try {
    await resend.emails.send({ from: FROM, to, subject: 'Your PropertyHack verification code', html });
  } catch (err) {
    console.error('[emailService] sendVerificationOtp failed:', err.message);
  }
}

async function sendPasswordResetOtp(to, otpCode) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#2b2b2b;font-size:24px">Reset your password</h2>
    <p style="margin:0 0 24px;color:#444;line-height:1.6">
      Use the code below to reset your password. This code expires in 10 minutes.
    </p>
    <div style="background:#f0f0f0;border-radius:8px;padding:24px;text-align:center;margin:0 0 24px">
      <span style="font-size:40px;font-weight:700;letter-spacing:10px;color:#2b2b2b">${otpCode}</span>
    </div>
    <p style="margin:0;color:#888;font-size:13px">
      If you didn't request a password reset, you can safely ignore this email.
      Your password will not change unless you enter this code.
    </p>
  `);

  const resend = getResend();
  if (!resend) return;
  try {
    await resend.emails.send({ from: FROM, to, subject: 'Your PropertyHack password reset code', html });
  } catch (err) {
    console.error('[emailService] sendPasswordResetOtp failed:', err.message);
  }
}

module.exports = { sendWelcomeEmail, sendVerificationOtp, sendPasswordResetOtp };
