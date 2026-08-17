const express = require('express');
const { pool } = require('../db');
const { studentView } = require('../data/exercises');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT timer_enabled, timer_minutes, deadline_text FROM settings WHERE id = 1');
    const settings = rows[0] || { timer_enabled: false, timer_minutes: 30, deadline_text: 'Thursday at Midnight' };
    res.json({
      ...studentView(),
      settings: {
        // Spec: NO timer on student page regardless of teacher setting.
        // We deliberately do not expose timer_enabled/timer_minutes to the
        // student client at all — this endpoint only returns the deadline text.
        deadlineText: settings.deadline_text,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load exercise content' });
  }
});

module.exports = router;
