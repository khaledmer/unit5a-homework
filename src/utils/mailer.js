const nodemailer = require('nodemailer');

// NOTE: On Render's free web-service tier, outbound SMTP (ports 25/465/587) is
// blocked at the network level — this is a platform restriction, not a bug in
// this code. This mirrors what was already confirmed on the Unit 4A portal.
// The function below will work correctly on: a paid Render plan, any other
// host without the SMTP block, or if swapped for an HTTP-API provider
// (Resend, SendGrid, Postmark). It always throws a clear, catchable error
// on failure so the caller can fall back to "download PDF manually".

function getTransport() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Email not configured: set GMAIL_USER and GMAIL_APP_PASSWORD');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    connectionTimeout: 8000, // fail fast instead of hanging on blocked ports
  });
}

async function sendGradedResults({ toEmail, studentName, pdfBuffer }) {
  const transport = getTransport();
  await transport.sendMail({
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: `Unit 5A — Graded Results for ${studentName}`,
    text: `Hi ${studentName},\n\nYour graded results for Unit 5A (Narrative Past Tenses in the Workplace) are attached.\n\n— Khaled Merbouche`,
    attachments: [{ filename: `Unit5A_${studentName.replace(/\s+/g, '_')}_Results.pdf`, content: pdfBuffer }],
  });
}

module.exports = { sendGradedResults };
