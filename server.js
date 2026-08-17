require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const { initSchema } = require('./src/db');

const exercisesRoute = require('./src/routes/exercises');
const submissionsRoute = require('./src/routes/submissions');
const teacherRoute = require('./src/routes/teacher');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  helmet({
    contentSecurityPolicy: false, // relaxed for a small static-served SPA; tighten if adding external scripts
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.use('/api/exercises', exercisesRoute);
app.use('/api/submissions', submissionsRoute);
app.use('/api/teacher', teacherRoute);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    await initSchema();
  } catch (err) {
    console.error('[startup] DB schema init failed — check DATABASE_URL:', err.message);
  }
  app.listen(PORT, () => console.log(`Unit 5A portal listening on port ${PORT}`));
}

start();
