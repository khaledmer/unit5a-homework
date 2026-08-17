(function () {
  const STORAGE_KEY = 'unit5a_draft_v1';
  let exercises = null;
  const state = {
    studentName: '',
    ex1Answers: {}, // { id: "answer text" }
    ex2Answers: {}, // { id: [blank1, blank2, ...] }
    writtenExpression: '',
  };

  // ---------- draft persistence ----------
  function loadDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) Object.assign(state, JSON.parse(raw));
    } catch (e) { /* corrupted draft, ignore */ }
  }

  let saveTimer = null;
  function saveDraft() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      const note = document.getElementById('autosaveNote');
      note.textContent = 'Draft saved · ' + new Date().toLocaleTimeString();
    }, 400);
  }

  function clearDraft() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // ---------- anti-copy safeguard ----------
  function blockClipboard(el) {
    ['copy', 'cut', 'paste', 'contextmenu'].forEach((evt) => {
      el.addEventListener(evt, (e) => e.preventDefault());
    });
  }

  // ---------- render exercise 1 ----------
  function renderEx1() {
    const container = document.getElementById('ex1List');
    container.innerHTML = '';
    exercises.exercise1.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'item';
      const promptEl = document.createElement('div');
      promptEl.className = 'prompt';
      promptEl.innerHTML = `<span class="qnum">${item.id}.</span>${item.prompt}`;
      div.appendChild(promptEl);

      const opts = document.createElement('div');
      opts.className = 'options';
      item.options.forEach((optText) => {
        const btn = document.createElement('div');
        btn.className = 'opt';
        btn.textContent = optText;
        if (state.ex1Answers[item.id] === optText) btn.classList.add('selected');
        btn.addEventListener('click', () => {
          state.ex1Answers[item.id] = optText;
          opts.querySelectorAll('.opt').forEach((o) => o.classList.remove('selected'));
          btn.classList.add('selected');
          saveDraft();
        });
        opts.appendChild(btn);
      });
      div.appendChild(opts);
      container.appendChild(div);
    });
  }

  // ---------- render exercise 2 ----------
  function renderEx2() {
    const container = document.getElementById('ex2List');
    container.innerHTML = '';
    exercises.exercise2.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'item';

      const parts = item.template.split('______');
      const wrapper = document.createElement('div');
      wrapper.className = 'prompt';

      const qnum = document.createElement('span');
      qnum.className = 'qnum';
      qnum.textContent = item.id + '.';
      wrapper.appendChild(qnum);

      if (!state.ex2Answers[item.id]) state.ex2Answers[item.id] = new Array(item.blankCount).fill('');

      parts.forEach((textChunk, idx) => {
        wrapper.appendChild(document.createTextNode(textChunk));
        blockClipboard(wrapper); // covers the text node's parent; inputs get their own listener below
        if (idx < parts.length - 1) {
          const input = document.createElement('input');
          input.type = 'text';
          input.autocomplete = 'off';
          input.spellcheck = false;
          input.value = state.ex2Answers[item.id][idx] || '';
          input.addEventListener('input', () => {
            state.ex2Answers[item.id][idx] = input.value;
            saveDraft();
          });
          blockClipboard(input);
          wrapper.appendChild(input);
        }
      });

      div.appendChild(wrapper);
      container.appendChild(div);
    });
  }

  // ---------- written expression ----------
  function renderWritten() {
    document.getElementById('weInstructions').textContent = exercises.writtenExpression.instructions;
    const reqsEl = document.getElementById('weReqs');
    reqsEl.innerHTML = '';
    exercises.writtenExpression.requirements.forEach((r) => {
      const li = document.createElement('li');
      li.textContent = r;
      reqsEl.appendChild(li);
    });

    const textarea = document.getElementById('writtenExpression');
    textarea.value = state.writtenExpression || '';
    blockClipboard(textarea);
    updateWordCount();

    textarea.addEventListener('input', () => {
      state.writtenExpression = textarea.value;
      updateWordCount();
      saveDraft();
    });
  }

  function updateWordCount() {
    const text = document.getElementById('writtenExpression').value.trim();
    const count = text ? text.split(/\s+/).length : 0;
    const el = document.getElementById('wordCount');
    const { minWords, maxWords } = exercises.writtenExpression;
    el.textContent = `${count} words`;
    el.className = 'word-count';
    if (count >= minWords && count <= maxWords) el.classList.add('ok');
    else if (count > 0) el.classList.add('warn');
  }

  // ---------- toast ----------
  function showToast(message, type) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${type || ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 6000);
  }

  // ---------- deadline ----------
  // Client-side only: disables the button and shows a clear message. The
  // actual block that can't be bypassed lives server-side in
  // POST /api/submissions, since a student could otherwise just re-enable
  // the button via devtools.
  function isPastDeadline() {
    const deadlineAt = exercises && exercises.settings && exercises.settings.deadlineAt;
    return !!deadlineAt && new Date() > new Date(deadlineAt);
  }

  function applyDeadlineState() {
    const btn = document.getElementById('submitBtn');
    const chip = document.querySelector('.deadline-chip');
    if (isPastDeadline()) {
      btn.disabled = true;
      btn.textContent = 'Deadline Passed';
      if (chip) chip.classList.add('deadline-closed');
    }
  }

  // ---------- submit ----------
  async function submitHomework() {
    if (isPastDeadline()) {
      showToast('The deadline has passed. Submissions are no longer accepted.', 'error');
      applyDeadlineState();
      return;
    }

    const nameInput = document.getElementById('studentName');
    state.studentName = nameInput.value.trim();
    if (!state.studentName) {
      showToast('Please enter your name before submitting.', 'error');
      nameInput.focus();
      return;
    }

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: state.studentName,
          ex1Answers: state.ex1Answers,
          ex2Answers: state.ex2Answers,
          writtenExpression: state.writtenExpression,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Deadline could have passed between page load and click — the
        // server is the source of truth, so reflect that back to the UI too.
        if (data.deadlinePassed) applyDeadlineState();
        throw new Error(data.error || 'Submission failed');
      }

      clearDraft();
      showToast('Homework submitted successfully. Your teacher will send graded results separately.', 'success');
      btn.textContent = 'Submitted ✓';
    } catch (err) {
      showToast(err.message, 'error');
      if (!isPastDeadline()) {
        btn.disabled = false;
        btn.textContent = 'Submit Homework';
      }
    }
  }

  // ---------- teacher modal ----------
  function wireTeacherModal() {
    const modal = document.getElementById('teacherModal');
    document.getElementById('teacherPortalBtn').addEventListener('click', () => {
      modal.style.display = 'flex';
      document.getElementById('teacherPassword').focus();
    });
    document.getElementById('closeModal').addEventListener('click', () => (modal.style.display = 'none'));

    async function attemptLogin() {
      const password = document.getElementById('teacherPassword').value;
      try {
        const res = await fetch('/api/teacher/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        sessionStorage.setItem('teacherToken', data.token);
        window.location.href = 'teacher.html';
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
    document.getElementById('loginBtn').addEventListener('click', attemptLogin);
    document.getElementById('teacherPassword').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') attemptLogin();
    });
  }

  // ---------- init ----------
  async function init() {
    loadDraft();
    wireTeacherModal();
    document.getElementById('submitBtn').addEventListener('click', submitHomework);
    document.getElementById('studentName').value = state.studentName || '';
    document.getElementById('studentName').addEventListener('input', (e) => {
      state.studentName = e.target.value;
      saveDraft();
    });

    try {
      const res = await fetch('/api/exercises');
      exercises = await res.json();
      document.getElementById('deadlineText').textContent = `Deadline: ${exercises.settings.deadlineText}`;
      renderEx1();
      renderEx2();
      renderWritten();
      applyDeadlineState();
    } catch (err) {
      showToast('Could not load the assignment. Please refresh the page.', 'error');
    }
  }

  init();
})();
