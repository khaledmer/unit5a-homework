require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const { initSchema } = require('./src/db');

const exercisesRoute = require('./src/routes/exercises');
const submissionsRoute = require('./src/routes/submissions');
const teacherRoute = require('./src/routes/teacher');

const app = express();
const PORT = process.env.PORT || 10000;

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

  // Bind explicitly to 0.0.0.0 — Render's reverse proxy routes to the
  // container by address, and binding to localhost/127.0.0.1 only accepts
  // connections from inside the container itself, which looks like the
  // service is "up" in logs but never receives traffic.
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Unit 5A portal listening on 0.0.0.0:${PORT}`);
  });

  // Render's own load balancer keeps connections alive for ~120s and will
  // reset ones the app closes first. Node's default keepAliveTimeout (5s)
  // is shorter than that, so under intermittent traffic the app can hang up
  // right as the proxy tries to reuse the connection — surfaces as random
  // ECONNRESET / 502s. Matching (and slightly exceeding, for headersTimeout)
  // the proxy's own timeout avoids that race.
  server.keepAliveTimeout = 120000; // 120s
  server.headersTimeout = 120500; // must be > keepAliveTimeout
}

start();