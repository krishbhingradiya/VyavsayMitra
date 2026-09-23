/**
 * VYAVSAYMITRA — Email Service
 *
 * Sends OTP emails using nodemailer.
 * Configured via environment variables (SMTP_HOST, SMTP_PORT, etc.)
 */

const nodemailer = require('nodemailer');

/**
 * Creates and returns the nodemailer transport.
 * Falls back to a console-logged "preview" mode if SMTP is not configured.
 */
function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    console.warn(
      '[EMAIL] SMTP not configured. OTP codes will be logged to console instead of emailed.\n' +
      '        Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in backend/.env to enable email delivery.'
    );
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

let transporter = null;

/**
 * Send an OTP email to the specified address.
 *
 * @param {string} toEmail — recipient
 * @param {string} otp — the 6-digit OTP (plaintext, for the email body only)
 * @returns {Promise<boolean>} — true if sent (or logged), false on failure
 */
async function sendOtpEmail(toEmail, otp) {
  const from = process.env.SMTP_FROM || 'VYAVSAYMITRA <noreply@vyavsaymitra.com>';

  const subject = 'VYAVSAYMITRA Login OTP';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#0B2545 0%,#16834A 100%);padding:28px 32px;text-align:center;">
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td style="width:40px;height:40px;background:linear-gradient(135deg,#F28C28,#16834A);border-radius:12px;text-align:center;vertical-align:middle;color:#fff;font-weight:800;font-size:20px;">V</td>
            <td style="padding-left:12px;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">VYAVSAYMITRA</td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:36px 32px 24px;">
        <p style="margin:0 0 8px;font-size:15px;color:#475569;">Your OTP for secure login is:</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="display:inline-block;font-size:36px;font-weight:800;letter-spacing:8px;color:#0B2545;background:#f1f5f9;padding:16px 32px;border-radius:12px;border:2px dashed #16834A;">${otp}</span>
        </div>
        <p style="margin:0 0 6px;font-size:14px;color:#64748b;">⏱ This OTP is valid for <strong>5 minutes</strong>.</p>
        <p style="margin:0 0 6px;font-size:14px;color:#64748b;">🔒 Do not share this OTP with anyone.</p>
        <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;">If you did not request this OTP, you can safely ignore this email.</p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} VYAVSAYMITRA — Sapne Se Safal Vyavsay Tak</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `VYAVSAYMITRA Login OTP\n\nYour OTP for secure login is: ${otp}\n\nThis OTP is valid for 5 minutes.\nDo not share this OTP with anyone.\n\nIf you did not request this OTP, you can safely ignore this email.\n\n© ${new Date().getFullYear()} VYAVSAYMITRA`;

  // If SMTP not configured, log OTP to console (development mode)
  if (!transporter) {
    transporter = createTransport();
  }

  if (!transporter) {
    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║  [DEV MODE] OTP for ${toEmail}`);
    console.log(`║  OTP Code: ${otp}`);
    console.log(`║  (Configure SMTP to send real emails)   `);
    console.log(`╚══════════════════════════════════════════╝\n`);
    return true;
  }

  try {
    await transporter.sendMail({ from, to: toEmail, subject, html, text });
    console.log(`[EMAIL] OTP sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL] Failed to send OTP to ${toEmail}:`, err.message);
    return false;
  }
}

module.exports = { sendOtpEmail };
