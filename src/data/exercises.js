// UNIT 5A — NARRATIVE PAST TENSES IN THE WORKPLACE
// Content matches Session 6 (Khaled Merbouche, ESC) 100%.
// Exercise 2 items 5 & 8 use the corrected versions (avoid untaught
// Past Perfect Continuous / passive Past Perfect constructions —
// see conversation fix request, applied in full).

const MEta = {
  title: 'Homework Assignment: Narrative Past Tenses in the Workplace',
  instructor: 'Khaled Merbouche',
  course: 'Business & Professional English (CEFR B1–B2)',
  deadlineText: 'Thursday at Midnight',
};

// ---------- EXERCISE 1 : multiple choice ----------
// Student sees `prompt` + `options`. Grading is exact match against `answer`.
const exercise1 = [
  {
    id: 1,
    prompt: "They didn't play well in the match although they ______ every evening.",
    options: ['were training', 'had trained'],
    answer: 'had trained',
  },
  {
    id: 2,
    prompt: 'Mike had an accident as he ______ to work.',
    options: ['cycled', 'was cycling'],
    answer: 'was cycling',
  },
  {
    id: 3,
    prompt: 'I left work early because I ______ to watch the match.',
    options: ['wanted', 'was wanting'],
    answer: 'wanted',
  },
  {
    id: 4,
    prompt: 'There was a lot of traffic, and when we arrived, the match ______.',
    options: ['already started', 'had already started'],
    answer: 'had already started',
  },
  {
    id: 5,
    prompt: 'The captain ______ any goals when the referee sent him off.',
    options: ["didn't score", "hadn't scored"],
    answer: "hadn't scored",
    altAnswers: ['had not scored'],
  },
  {
    id: 6,
    prompt: 'My son got injured while he ______ basketball last Saturday.',
    options: ['played', 'was playing'],
    answer: 'was playing',
  },
  {
    id: 7,
    prompt: 'When the snowstorm started, we ______ skiing and went back to the hotel.',
    options: ['stopped', 'had stopped'],
    answer: 'stopped',
  },
  {
    id: 8,
    prompt: 'England ______ any of their previous games when they played in the quarter-finals.',
    options: ["didn't lose", "hadn't lost"],
    answer: "hadn't lost",
    altAnswers: ['had not lost'],
  },
  {
    id: 9,
    prompt: 'The referee suspended the match because it ______ so hard.',
    options: ['was raining', 'rained'],
    answer: 'was raining',
  },
];

// ---------- EXERCISE 2 : fill in the blank (workplace context) ----------
// Each item has 1 or 2 blanks. `blanks[i].answers` = accepted normalized forms.
const exercise2 = [
  {
    id: 1,
    template: 'While the administrative officer ______ (review) the contract, the printer suddenly ______ (stop) working.',
    blanks: [
      { label: 'review', answers: ['was reviewing'] },
      { label: 'stop', answers: ['stopped'] },
    ],
  },
  {
    id: 2,
    template: 'By the time the IT department resolved the glitch, the staff ______ (log) already fifty manual entries.',
    blanks: [
      { label: 'log', answers: ['had already logged', 'had logged already'] },
    ],
  },
  {
    id: 3,
    template: 'The team lead ______ (call) an emergency briefing after the power failure ______ (cause) a major bottleneck.',
    blanks: [
      { label: 'call', answers: ['called'] },
      { label: 'cause', answers: ['had caused'] },
    ],
  },
  {
    id: 4,
    template: 'While the clerk ______ (process) the backlog of registration forms, she ______ (notice) a severe oversight in the client file.',
    blanks: [
      { label: 'process', answers: ['was processing'] },
      { label: 'notice', answers: ['noticed'] },
    ],
  },
  {
    id: 5,
    // CORRECTED — was "(work) continuously for five hours" (elicited untaught
    // Past Perfect Continuous). Reworded to elicit plain Past Perfect only.
    template:
      'Management ______ (decide) to delegate the remaining tasks because the junior team ______ (work) on the backlog since early morning.',
    blanks: [
      { label: 'decide', answers: ['decided'] },
      { label: 'work', answers: ['had worked'] }, // sole accepted answer — no continuous variant
    ],
  },
  {
    id: 6,
    template: 'The department head ______ (implement) a temporary workaround only after the central server ______ (crash).',
    blanks: [
      { label: 'implement', answers: ['implemented'] },
      { label: 'crash', answers: ['had crashed'] },
    ],
  },
  {
    id: 7,
    template: 'As the system operators ______ (perform) a routine overhaul, an unexpected technical glitch ______ (interrupt) the entire workflow.',
    blanks: [
      { label: 'perform', answers: ['were performing'] },
      { label: 'interrupt', answers: ['interrupted'] },
    ],
  },
  {
    id: 8,
    // CORRECTED — was "(delayed / be) for three weeks" (passive Past Perfect,
    // never modeled in the lesson). Reworded to plain active Past Perfect.
    template:
      'By the time leadership eliminated the institutional red tape, the project authorization ______ (suffer) three weeks of delay.',
    blanks: [
      { label: 'suffer', answers: ['had suffered'] },
    ],
  },
];

const writtenExpression = {
  instructions:
    'Write a paragraph or short workplace narrative (120–150 words) describing a major technical disruption or operational crisis that occurred at work or school, and how it was resolved.',
  requirements: [
    'At least two uses of Past Continuous',
    'At least three uses of Past Simple',
    'At least two uses of Past Perfect',
    'At least three target vocabulary terms (glitch, backlog, workaround, bottleneck, delegate, overhaul, red tape, oversight)',
  ],
  minWords: 120,
  maxWords: 150,
  targetVocab: ['glitch', 'backlog', 'workaround', 'bottleneck', 'delegate', 'overhaul', 'red tape', 'oversight'],
};

// Client-safe view: strips answers before sending to the student.
function studentView() {
  return {
    meta: MEta,
    exercise1: exercise1.map(({ id, prompt, options }) => ({ id, prompt, options })),
    exercise2: exercise2.map(({ id, template, blanks }) => ({
      id,
      template,
      blankCount: blanks.length,
    })),
    writtenExpression,
  };
}

module.exports = { meta: MEta, exercise1, exercise2, writtenExpression, studentView };
