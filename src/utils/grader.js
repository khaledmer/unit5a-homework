const { exercise1, exercise2 } = require('../data/exercises');

function normalize(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:"']+$/g, '') // trailing punctuation
    .replace(/\s+/g, ' ') // collapse whitespace
    .replace(/’/g, "'"); // curly apostrophe -> straight, so contractions compare cleanly
}

// treats "hadn't" and "had not" (etc.) as equivalent after normalize()
function expandContraction(str) {
  return str
    .replace(/\bhadn't\b/g, 'had not')
    .replace(/\bdidn't\b/g, 'did not')
    .replace(/\bwasn't\b/g, 'was not')
    .replace(/\bweren't\b/g, 'were not');
}

function answersMatch(given, acceptedList) {
  const g = expandContraction(normalize(given));
  return acceptedList.some((a) => expandContraction(normalize(a)) === g);
}

function gradeExercise1(studentAnswers = {}) {
  const breakdown = [];
  let score = 0;
  for (const item of exercise1) {
    const accepted = [item.answer, ...(item.altAnswers || [])];
    const given = studentAnswers[item.id] ?? '';
    const correct = answersMatch(given, accepted);
    if (correct) score += 1;
    breakdown.push({ id: item.id, given, correct, expected: item.answer });
  }
  return { score, max: exercise1.length, breakdown };
}

function gradeExercise2(studentAnswers = {}) {
  // studentAnswers[itemId] = [blank1text, blank2text, ...]
  const breakdown = [];
  let score = 0;
  let max = 0;
  for (const item of exercise2) {
    const givenArr = studentAnswers[item.id] || [];
    const blankResults = item.blanks.map((blank, idx) => {
      max += 1;
      const given = givenArr[idx] ?? '';
      const correct = answersMatch(given, blank.answers);
      if (correct) score += 1;
      return { label: blank.label, given, correct, expected: blank.answers[0] };
    });
    breakdown.push({ id: item.id, blanks: blankResults });
  }
  return { score, max, breakdown };
}

function wordCount(text = '') {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

module.exports = { gradeExercise1, gradeExercise2, wordCount, normalize, answersMatch };
