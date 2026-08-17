const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { generateSubmissionPdf, generateAnswerKeyPdf } = require('../utils/pdf');
const { sendGradedResults } = require('../utils/mailer');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

// ---------- AUTH ----------
router.post('/login', loginLimiter, (req, res) => {
  const { password } = req.body || {};
  if (!process.env.TEACHER_PASSWORD) {
    return res.status(500).json({ error: 'Server misconfigured: TEACHER_PASSWORD not set' });
  }
  if (password !== process.env.TEACHER_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  const token = jwt.sign({ role: 'teacher' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// ---------- SUBMISSIONS LIST ----------
router.get('/submissions', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, student_name, submitted_at, word_count,
            ex1_score, ex1_max, ex2_score, ex2_max, written_score, written_max,
            graded, sent_at, send_status
     FROM submissions ORDER BY submitted_at DESC`
  );
  res.json(rows);
});

// ---------- SUBMISSION DETAIL ----------
router.get('/submissions/:id', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM submissions WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// ---------- GRADE WRITTEN EXPRESSION + COMMENT ----------
router.post('/submissions/:id/grade', requireAuth, async (req, res) => {
  const { writtenScore, writtenMax, teacherComment } = req.body || {};
  const { rows } = await pool.query(
    `UPDATE submissions
     SET written_score = $1, written_max = COALESCE($2, written_max), teacher_comment = $3,
         graded = true, graded_at = now()
     WHERE id = $4 RETURNING *`,
    [writtenScore ?? null, writtenMax ?? null, teacherComment ?? null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// ---------- DOWNLOAD GRADED PDF ----------
router.get('/submissions/:id/pdf', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM submissions WHERE id = $1', [req.params.id]);
  const sub = rows[0];
  if (!sub) return res.status(404).json({ error: 'Not found' });
  sub.ex1_breakdown = sub.ex1_breakdown || [];
  sub.ex2_breakdown = sub.ex2_breakdown || [];

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Unit5A_${sub.student_name.replace(/\s+/g, '_')}_Results.pdf"`);
  const doc = generateSubmissionPdf(sub);
  doc.pipe(res);
  doc.end();
});

// ---------- ANSWER KEY PDF (teacher-only, standalone) ----------
router.get('/answer-key/pdf', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="Unit5A_Answer_Key.pdf"');
  const doc = generateAnswerKeyPdf();
  doc.pipe(res);
  doc.end();
});

// ---------- SEND CORRECTED RESULTS TO STUDENT (best-effort, see mailer.js) ----------
router.post('/submissions/:id/send', requireAuth, async (req, res) => {
  const { toEmail } = req.body || {};
  const { rows } = await pool.query('SELECT * FROM submissions WHERE id = $1', [req.params.id]);
  const sub = rows[0];
  if (!sub) return res.status(404).json({ error: 'Not found' });
  if (!toEmail) return res.status(400).json({ error: 'Student email address required' });

  sub.ex1_breakdown = sub.ex1_breakdown || [];
  sub.ex2_breakdown = sub.ex2_breakdown || [];

  const chunks = [];
  const doc = generateSubmissionPdf(sub);
  doc.on('data', (c) => chunks.push(c));
  const pdfBuffer = await new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });

  try {
    await sendGradedResults({ toEmail, studentName: sub.student_name, pdfBuffer });
    await pool.query(`UPDATE submissions SET sent_at = now(), send_status = 'sent' WHERE id = $1`, [sub.id]);
    res.json({ ok: true, delivered: true });
  } catch (err) {
    // Expected on Render free tier — SMTP ports blocked. Return the PDF info
    // so the UI can prompt "download instead" rather than a silent failure.
    console.error('[mail] send failed (expected on Render free tier):', err.message);
    await pool.query(`UPDATE submissions SET send_status = $1 WHERE id = $2`, [`failed: ${err.message}`, sub.id]);
    res.status(502).json({
      ok: false,
      delivered: false,
      error: 'Email dispatch failed — likely blocked by hosting provider. Use "Download PDF" and send manually.',
      detail: err.message,
    });
  }
});

// ---------- TIMER / DEADLINE SETTINGS ----------
router.get('/settings', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM settings WHERE id = 1');
  res.json(rows[0]);
});

router.post('/settings', requireAuth, async (req, res) => {
  const { timerEnabled, timerMinutes, deadlineText, deadlineAt, clearDeadline } = req.body || {};

  // deadlineAt: ISO string to set an enforced cutoff. clearDeadline: true to
  // remove it (reopens submissions with no cutoff). Without either, the
  // existing deadline_at is left untouched.
  let newDeadlineAt = null;
  if (deadlineAt) {
    const parsed = new Date(deadlineAt);
    if (isNaN(parsed.getTime())) {
      return res.status(400).json({ error: 'Invalid deadlineAt value.' });
    }
    newDeadlineAt = parsed.toISOString();
  }

  const { rows } = await pool.query(
    `UPDATE settings SET
       timer_enabled = COALESCE($1, timer_enabled),
       timer_minutes = COALESCE($2, timer_minutes),
       deadline_text = COALESCE($3, deadline_text),
       deadline_at = CASE
         WHEN $4::boolean THEN NULL
         WHEN $5::timestamptz IS NOT NULL THEN $5::timestamptz
         ELSE deadline_at
       END
     WHERE id = 1 RETURNING *`,
    [timerEnabled ?? null, timerMinutes ?? null, deadlineText ?? null, !!clearDeadline, newDeadlineAt]
  );
  res.json(rows[0]);
});

module.exports = router;
