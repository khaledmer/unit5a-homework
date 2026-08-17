(function () {
  const token = sessionStorage.getItem('teacherToken');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  function showToast(message, type) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${type || ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 6000);
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, { ...opts, headers: { ...authHeaders, ...(opts.headers || {}) } });
    if (res.status === 401) {
      sessionStorage.removeItem('teacherToken');
      window.location.href = 'index.html';
      throw new Error('Session expired');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ---------- settings ----------

  // datetime-local wants "YYYY-MM-DDTHH:mm" in *local* browser time with no
  // timezone offset. Converting via toISOString() first would shift it to
  // UTC and show the wrong time back to the teacher, so build the local
  // string by hand instead.
  function toDatetimeLocalValue(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function updateDeadlineStatus(isoString) {
    const el = document.getElementById('deadlineStatus');
    if (!isoString) {
      el.textContent = 'No cutoff set — students can submit any time.';
      return;
    }
    const passed = new Date() > new Date(isoString);
    el.textContent = passed
      ? `Cutoff passed (${new Date(isoString).toLocaleString()}) — submissions are currently blocked.`
      : `Submissions will be blocked after ${new Date(isoString).toLocaleString()}.`;
  }

  async function loadSettings() {
    const s = await api('/api/teacher/settings');
    document.getElementById('timerToggle').checked = s.timer_enabled;
    document.getElementById('timerMinutes').value = String(s.timer_minutes);
    document.getElementById('deadlineTextInput').value = s.deadline_text;
    document.getElementById('deadlineAtInput').value = toDatetimeLocalValue(s.deadline_at);
    updateDeadlineStatus(s.deadline_at);
  }

  document.getElementById('clearDeadlineBtn').addEventListener('click', async () => {
    try {
      const s = await api('/api/teacher/settings', {
        method: 'POST',
        body: JSON.stringify({ clearDeadline: true }),
      });
      document.getElementById('deadlineAtInput').value = '';
      updateDeadlineStatus(s.deadline_at);
      showToast('Cutoff cleared — submissions reopened.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
    try {
      const deadlineAtLocal = document.getElementById('deadlineAtInput').value; // "" or "YYYY-MM-DDTHH:mm"
      const s = await api('/api/teacher/settings', {
        method: 'POST',
        body: JSON.stringify({
          timerEnabled: document.getElementById('timerToggle').checked,
          timerMinutes: parseInt(document.getElementById('timerMinutes').value, 10),
          deadlineText: document.getElementById('deadlineTextInput').value,
          // new Date() parses "YYYY-MM-DDTHH:mm" as local time, which is what we want.
          deadlineAt: deadlineAtLocal ? new Date(deadlineAtLocal).toISOString() : undefined,
        }),
      });
      updateDeadlineStatus(s.deadline_at);
      showToast('Settings saved.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // ---------- list ----------
  async function loadList() {
    const subs = await api('/api/teacher/submissions');
    const body = document.getElementById('subsBody');
    body.innerHTML = '';
    subs.forEach((s) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(s.student_name)}</td>
        <td>${new Date(s.submitted_at).toLocaleString()}</td>
        <td>${s.word_count}</td>
        <td>${s.ex1_score}/${s.ex1_max}</td>
        <td>${s.ex2_score}/${s.ex2_max}</td>
        <td>${s.written_score != null ? s.written_score + '/' + s.written_max : '—'}</td>
        <td><span class="badge ${s.graded ? 'graded' : 'pending'}">${s.graded ? 'Graded' : 'Pending'}</span></td>
      `;
      tr.addEventListener('click', () => openDetail(s.id));
      body.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- detail ----------
  async function openDetail(id) {
    const sub = await api(`/api/teacher/submissions/${id}`);
    document.getElementById('listView').style.display = 'none';
    const detail = document.getElementById('detailView');
    detail.style.display = 'block';

    const ex1Rows = (sub.ex1_breakdown || [])
      .map((r) => `<div class="item"><div class="prompt">${r.id}. Given: <strong>${escapeHtml(r.given || '(blank)')}</strong> ${r.correct ? '<span style="color:var(--good)">✓</span>' : `<span style="color:var(--bad)">✗ Correct: ${escapeHtml(r.expected)}</span>`}</div></div>`)
      .join('');

    const ex2Rows = (sub.ex2_breakdown || [])
      .map(
        (r) =>
          `<div class="item"><div class="prompt">${r.id}. ${r.blanks
            .map((b) => `[${b.label}] <strong>${escapeHtml(b.given || '(blank)')}</strong> ${b.correct ? '<span style="color:var(--good)">✓</span>' : `<span style="color:var(--bad)">✗ Correct: ${escapeHtml(b.expected)}</span>`}`)
            .join(' &nbsp;·&nbsp; ')}</div></div>`
      )
      .join('');

    detail.innerHTML = `
      <button class="btn btn-ghost" id="backBtn" style="margin-bottom:16px;">← Back to list</button>
      <div class="section">
        <div class="section-head"><h2>${escapeHtml(sub.student_name)}</h2></div>
        <div class="desc">Submitted ${new Date(sub.submitted_at).toLocaleString()}</div>
        <h3 style="font-size:14px;">Exercise 1 (${sub.ex1_score}/${sub.ex1_max})</h3>
        ${ex1Rows}
        <h3 style="font-size:14px; margin-top:18px;">Exercise 2 (${sub.ex2_score}/${sub.ex2_max})</h3>
        ${ex2Rows}
        <h3 style="font-size:14px; margin-top:18px;">Written Expression (${sub.word_count} words)</h3>
        <div class="item" style="white-space:pre-wrap; font-size:13.5px;">${escapeHtml(sub.written_expression || '(no submission)')}</div>

        <div style="margin-top:20px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <label style="font-size:13px; color:var(--muted);">Written score:</label>
          <input type="text" id="writtenScore" value="${sub.written_score ?? ''}" style="max-width:70px;" />
          <span style="color:var(--muted);">/ 10</span>
        </div>
        <textarea id="teacherComment" placeholder="Feedback comment for student…" style="margin-top:10px;">${escapeHtml(sub.teacher_comment || '')}</textarea>
        <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-primary" id="saveGradeBtn">Save Grade</button>
          <button class="btn" id="downloadPdfBtn">Download PDF</button>
          <input type="email" id="studentEmail" placeholder="student@email.com" style="max-width:200px;" />
          <button class="btn" id="sendResultsBtn">Send Corrected Results to Student</button>
        </div>
        <div id="sendStatus" style="margin-top:8px; font-size:12.5px; color:var(--muted);">
          ${sub.send_status ? 'Last attempt: ' + escapeHtml(sub.send_status) : ''}
        </div>
      </div>
    `;

    document.getElementById('backBtn').addEventListener('click', () => {
      detail.style.display = 'none';
      document.getElementById('listView').style.display = 'block';
      loadList();
    });

    document.getElementById('saveGradeBtn').addEventListener('click', async () => {
      try {
        const writtenScore = parseInt(document.getElementById('writtenScore').value, 10);
        await api(`/api/teacher/submissions/${id}/grade`, {
          method: 'POST',
          body: JSON.stringify({
            writtenScore: isNaN(writtenScore) ? null : writtenScore,
            teacherComment: document.getElementById('teacherComment').value,
          }),
        });
        showToast('Grade saved.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    document.getElementById('downloadPdfBtn').addEventListener('click', () => {
      // direct download needs the token as a query param since <a> can't send headers
      fetch(`/api/teacher/submissions/${id}/pdf`, { headers: authHeaders })
        .then((res) => res.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Unit5A_${sub.student_name.replace(/\s+/g, '_')}_Results.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        });
    });

    document.getElementById('sendResultsBtn').addEventListener('click', async () => {
      const toEmail = document.getElementById('studentEmail').value.trim();
      if (!toEmail) return showToast('Enter the student\u2019s email first.', 'error');
      try {
        await api(`/api/teacher/submissions/${id}/send`, { method: 'POST', body: JSON.stringify({ toEmail }) });
        showToast('Results emailed successfully.', 'success');
      } catch (err) {
        // Expected failure mode on Render free tier — SMTP blocked.
        showToast(err.message + ' (Use "Download PDF" instead.)', 'error');
      }
    });
  }

  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('teacherToken');
    window.location.href = 'index.html';
  });

  document.getElementById('answerKeyBtn').addEventListener('click', () => {
    fetch('/api/teacher/answer-key/pdf', { headers: authHeaders })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Unit5A_Answer_Key.pdf';
        a.click();
        URL.revokeObjectURL(url);
      });
  });

  loadSettings().catch((err) => showToast(err.message, 'error'));
  loadList().catch((err) => showToast(err.message, 'error'));
})();
