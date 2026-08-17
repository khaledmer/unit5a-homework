const PDFDocument = require('pdfkit');
const { exercise1, exercise2, meta } = require('../data/exercises');

const INK = '#1B1F27';
const MUTED = '#5B6472';
const GOOD = '#2E7D4F';
const BAD = '#B23A3A';
const ACCENT = '#8A6D3B';

function header(doc, subtitle) {
  doc.fillColor(INK).fontSize(18).font('Helvetica-Bold').text('UNIT 5A — NARRATIVE PAST TENSES', { align: 'left' });
  doc.fontSize(11).font('Helvetica').fillColor(MUTED).text(subtitle);
  doc.moveDown(0.3);
  doc.fillColor(MUTED).fontSize(9).text(`${meta.course}  •  Instructor: ${meta.instructor}`, { align: 'left' });
  doc.moveTo(doc.x, doc.y + 8).lineTo(546, doc.y + 8).strokeColor('#D8DCE3').lineWidth(1).stroke();
  doc.moveDown(1.2);
}

/**
 * Generates a graded results PDF for a single student submission.
 * @param {object} sub - row from `submissions` table, plus breakdown JSON already parsed
 * @returns {PDFDocument} - caller pipes this to a response or file
 */
function generateSubmissionPdf(sub) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  header(doc, 'Graded Results');

  doc.fillColor(INK).fontSize(13).font('Helvetica-Bold').text(`Student: ${sub.student_name}`);
  doc.fontSize(9).font('Helvetica').fillColor(MUTED).text(`Submitted: ${new Date(sub.submitted_at).toLocaleString()}`);
  doc.moveDown(1);

  const totalScore = (sub.ex1_score || 0) + (sub.ex2_score || 0) + (sub.written_score || 0);
  const totalMax = (sub.ex1_max || 0) + (sub.ex2_max || 0) + (sub.written_max || 10);
  doc.fontSize(12).font('Helvetica-Bold').fillColor(INK).text(`Overall: ${totalScore} / ${totalMax}`);
  doc.moveDown(1);

  // Exercise 1
  doc.fontSize(12).font('Helvetica-Bold').fillColor(INK).text(`Exercise 1 — Choose the Correct Form  (${sub.ex1_score}/${sub.ex1_max})`);
  doc.moveDown(0.4);
  (sub.ex1_breakdown || []).forEach((r) => {
    const item = exercise1.find((e) => e.id === r.id);
    doc.fontSize(9.5).font('Helvetica').fillColor(INK).text(`${r.id}. ${item.prompt}`);
    doc
      .fontSize(9)
      .fillColor(r.correct ? GOOD : BAD)
      .text(`  Your answer: ${r.given || '(blank)'}  ${r.correct ? '✓' : '✗  Correct answer: ' + r.expected}`);
    doc.moveDown(0.3);
  });

  doc.moveDown(0.6);
  doc.fontSize(12).font('Helvetica-Bold').fillColor(INK).text(`Exercise 2 — Workplace Context  (${sub.ex2_score}/${sub.ex2_max})`);
  doc.moveDown(0.4);
  (sub.ex2_breakdown || []).forEach((r) => {
    const item = exercise2.find((e) => e.id === r.id);
    doc.fontSize(9.5).font('Helvetica').fillColor(INK).text(`${r.id}. ${item.template}`);
    r.blanks.forEach((b) => {
      doc
        .fontSize(9)
        .fillColor(b.correct ? GOOD : BAD)
        .text(`  [${b.label}] Your answer: ${b.given || '(blank)'}  ${b.correct ? '✓' : '✗  Correct: ' + b.expected}`);
    });
    doc.moveDown(0.3);
  });

  doc.addPage();
  header(doc, 'Written Expression & Feedback');
  doc.fontSize(11).font('Helvetica-Bold').fillColor(INK).text(`Word count: ${sub.word_count}`);
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').fillColor(INK).text(sub.written_expression || '(no submission)', {
    align: 'left',
  });
  doc.moveDown(1);
  if (sub.written_score != null) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor(ACCENT).text(`Written Expression score: ${sub.written_score} / ${sub.written_max}`);
  }
  if (sub.teacher_comment) {
    doc.moveDown(0.6);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(INK).text('Teacher feedback:');
    doc.fontSize(10).font('Helvetica').fillColor(INK).text(sub.teacher_comment);
  }

  return doc;
}

/** Standalone teacher-only answer key PDF (not for student distribution). */
function generateAnswerKeyPdf() {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  header(doc, 'TEACHER ANSWER KEY — Internal Use Only');

  doc.fontSize(12).font('Helvetica-Bold').fillColor(INK).text('Exercise 1');
  doc.moveDown(0.3);
  exercise1.forEach((item) => {
    doc.fontSize(9.5).font('Helvetica').fillColor(INK).text(`${item.id}. ${item.prompt}`);
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(ACCENT).text(`   Answer: ${item.answer}${item.altAnswers ? '  (also: ' + item.altAnswers.join(', ') + ')' : ''}`);
    doc.moveDown(0.25);
  });

  doc.moveDown(0.6);
  doc.fontSize(12).font('Helvetica-Bold').fillColor(INK).text('Exercise 2');
  doc.moveDown(0.3);
  exercise2.forEach((item) => {
    doc.fontSize(9.5).font('Helvetica').fillColor(INK).text(`${item.id}. ${item.template}`);
    item.blanks.forEach((b) => {
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor(ACCENT).text(`   [${b.label}] ${b.answers.join(' / ')}`);
    });
    doc.moveDown(0.25);
  });

  return doc;
}

module.exports = { generateSubmissionPdf, generateAnswerKeyPdf };
