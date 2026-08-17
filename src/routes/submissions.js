const express = require('express');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { gradeExercise1, gradeExercise2, wordCount } = require('../utils/grader');

const router = express.Router();

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many submissions from this device. Please wait and try again.' },
});

router.post('/', submitLimiter, async (req, res) => {
  try {
    const { studentName, ex1Answers, ex2Answers, writtenExpression } = req.body || {};

    if (!studentName || typeof studentName !== 'string' || !studentName.trim()) {
      return res.status(400).json({ error: 'Student name is required.' });
    }

    const ex1 = gradeExercise1(ex1Answers || {});
    const ex2 = gradeExercise2(ex2Answers || {});
    const wc = wordCount(writtenExpression || '');

    const { rows } = await pool.query(
      `INSERT INTO submissions
        (student_name, ex1_answers, ex2_answers, written_expression, word_count,
         ex1_score, ex1_max, ex1_breakdown, ex2_score, ex2_max, ex2_breakdown)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, submitted_at`,
      [
        studentName.trim(),
        JSON.stringify(ex1Answers || {}),
        JSON.stringify(ex2Answers || {}),
        writtenExpression || '',
        wc,
        ex1.score,
        ex1.max,
        JSON.stringify(ex1.breakdown),
        ex2.score,
        ex2.max,
        JSON.stringify(ex2.breakdown),
      ]
    );

    // Deliberately do NOT return scores/breakdown to the student — spec says
    // no instant grading, no visible answer key. Just confirm receipt.
    res.status(201).json({
      ok: true,
      id: rows[0].id,
      submittedAt: rows[0].submitted_at,
      message: 'Your homework has been submitted. Your teacher will send graded results separately.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Submission failed. Please try again.' });
  }
});

module.exports = router;
