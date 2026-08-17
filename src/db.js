require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS submissions (
  id                SERIAL PRIMARY KEY,
  student_name      TEXT NOT NULL,
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ex1_answers       JSONB NOT NULL DEFAULT '{}'::jsonb,
  ex2_answers       JSONB NOT NULL DEFAULT '{}'::jsonb,
  written_expression TEXT NOT NULL DEFAULT '',
  word_count        INTEGER NOT NULL DEFAULT 0,
  ex1_score         INTEGER,
  ex1_max           INTEGER,
  ex2_score         INTEGER,
  ex2_max           INTEGER,
  ex1_breakdown     JSONB,
  ex2_breakdown     JSONB,
  written_score     INTEGER,
  written_max       INTEGER DEFAULT 10,
  teacher_comment   TEXT,
  graded            BOOLEAN NOT NULL DEFAULT false,
  graded_at         TIMESTAMPTZ,
  sent_at           TIMESTAMPTZ,
  send_status       TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  id             INTEGER PRIMARY KEY DEFAULT 1,
  timer_enabled  BOOLEAN NOT NULL DEFAULT false,
  timer_minutes  INTEGER NOT NULL DEFAULT 30,
  deadline_text  TEXT NOT NULL DEFAULT 'Thursday at Midnight',
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO settings (id, timer_enabled, timer_minutes, deadline_text)
VALUES (1, false, 30, 'Thursday at Midnight')
ON CONFLICT (id) DO NOTHING;
`;

async function initSchema() {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA);
    console.log('[db] schema ready');
  } finally {
    client.release();
  }
}

if (require.main === module && process.argv.includes('--init')) {
  initSchema()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[db] init failed', err);
      process.exit(1);
    });
}

module.exports = { pool, initSchema };
