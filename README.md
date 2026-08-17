# Unit 5A — Narrative Past Tenses in the Workplace
Homework portal for Business & Professional English (CEFR B1–B2)
Instructor: Khaled Merbouche — English Speakers Club

## What's in this build

- **Student page** (`/`): Exercise 1 (multiple choice), Exercise 2 (fill-in-the-blank),
  Written Expression (120–150 word narrative), autosave to `localStorage`, no
  instant grading, no visible answer key, no timer, basic copy/paste blocking
  on inputs and prompt text.
- **Teacher dashboard** (`/teacher.html`, password-gated via `TEACHER_PASSWORD`):
  submissions table, per-student breakdown, manual written-expression scoring
  + feedback, PDF export, "Send Corrected Results" email button, and a
  settings panel to configure the (currently disabled) student-facing timer
  and deadline text.
- **Auto-grader** lives entirely server-side (`src/data/exercises.js` +
  `src/utils/grader.js`). Answers are normalized for case, trailing
  punctuation, extra whitespace, and `-n't`/`not` contractions. The answer
  key is never sent to the browser.

## Content correction applied

Exercise 2, items 5 and 8 were revised from the original spec before this
build, because the original wording elicited grammar never taught in the
Unit 5A lesson (Session 6):

- **Item 5** originally elicited Past Perfect Continuous (`had been working`).
  Reworded to elicit plain Past Perfect (`had worked`) only — no alternate
  answer accepted.
- **Item 8** originally elicited a passive Past Perfect (`had been delayed`).
  Reworded to elicit active Past Perfect (`had suffered`).

See `src/data/exercises.js` for both corrected items with inline comments.
No other exercise content, wording, or scoring was altered.

## Known platform limitation: email dispatch

Gmail SMTP send from a **Render free-tier web service** is blocked at the
network level (outbound ports 25/465/587 are closed on that plan) — this was
already confirmed on your Unit 4A portal and holds true here too. The
"Send Corrected Results to Student" button is fully implemented and will
work on a paid Render plan, on most other hosts, or if you swap
`src/utils/mailer.js` for an HTTP-API provider (Resend/SendGrid/Postmark).
On free tier, it fails fast (8s timeout) with a clear on-screen message and
falls back to "Download PDF" as the reliable path — manual delivery is the
practical default until then.

## Local setup

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL, TEACHER_PASSWORD, JWT_SECRET
npm run initdb             # creates tables
npm start                  # http://localhost:3000
```

## Deploying to Render (matches your existing Unit 3A/4A pattern)

1. Push this folder to a GitHub repo.
2. Render → New → PostgreSQL → create a free instance → copy the
   **Internal Database URL**.
3. Render → New → Web Service → connect the repo.
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment variables: `DATABASE_URL` (from step 2), `TEACHER_PASSWORD`,
     `JWT_SECRET` (any long random string), `NODE_ENV=production`, and
     optionally `GMAIL_USER` / `GMAIL_APP_PASSWORD` (see limitation above).
4. After first deploy, open the Render **Shell** tab for the web service and
   run `npm run initdb` once to create the tables (or add it as a one-off
   pre-deploy command).
5. Visit the live URL — students use the root page, you use the
   "Teacher Portal" button in the header.

## File map

```
server.js                  Express entry point
src/db.js                  Postgres pool + schema
src/data/exercises.js      Exercise content + answer key (server-only)
src/utils/grader.js        Answer normalization + grading
src/utils/pdf.js           PDFKit: graded results + standalone answer key
src/utils/mailer.js        Nodemailer wrapper (see limitation above)
src/routes/exercises.js    GET student-safe exercise content
src/routes/submissions.js  POST student submissions (server-side grading)
src/routes/teacher.js      Password-gated dashboard API
public/index.html/.css/.js Student interface
public/teacher.html/.js    Teacher dashboard interface
```
