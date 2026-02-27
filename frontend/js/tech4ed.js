// ─── Tech4Ed Module ───────────────────────────────────────────────────────────

// Poll for active sessions every 30s to update elapsed time
let _tech4edPollTimer = null;
let _tech4edCache = [];

async function loadTech4Ed() {
  clearInterval(_tech4edPollTimer);
  const res = await API.getTech4Ed();
  if (!res?.ok) return;
  _tech4edCache = res.data;

  const active   = _tech4edCache.filter(e => !e.time_out);
  const finished = _tech4edCache.filter(e => e.time_out);

  animateCount(document.getElementById('stat-t4e-active'),  active.length);
  animateCount(document.getElementById('stat-t4e-total'),   _tech4edCache.length);
  animateCount(document.getElementById('stat-t4e-today'),   _tech4edCache.filter(e => {
    const d = new Date(e.time_in);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length);

  renderTech4EdActive(active);
  renderTech4EdHistory(finished);

  // Start polling to update elapsed times
  _tech4edPollTimer = setInterval(() => updateElapsedTimes(), 30000);
}

function renderTech4EdActive(active) {
  document.getElementById('activeTech4EdBody').innerHTML = active.length === 0
    ? emptyState('No active sessions', 7)
    : active.map(e => `<tr id="t4e-row-${e.id}">
        <td class="td-mono">#${e.id}</td>
        <td class="td-name">${e.name}</td>
        <td><span class="badge" style="background:rgba(${e.gender === 'Male' ? '59,130,246' : '168,85,247'},0.1);color:${e.gender === 'Male' ? '#60a5fa' : '#c084fc'};">${e.gender}</span></td>
        <td>${e.purpose}</td>
        <td class="td-mono">${fmtTime(e.time_in)}</td>
        <td class="td-mono elapsed-cell" data-timein="${e.time_in}">${calcElapsed(e.time_in)}</td>
        <td>
          <button class="btn btn-warn btn-sm" onclick="submitTimeout(${e.id})">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/></svg>
            Time Out
          </button>
        </td>
      </tr>`).join('');
}

function renderTech4EdHistory(finished) {
  document.getElementById('tech4EdHistoryBody').innerHTML = finished.length === 0
    ? emptyState('No completed sessions yet', 7)
    : finished.map(e => {
        const duration = calcDuration(e.time_in, e.time_out);
        return `<tr>
          <td class="td-mono">#${e.id}</td>
          <td class="td-name">${e.name}</td>
          <td><span class="badge" style="background:rgba(${e.gender === 'Male' ? '59,130,246' : '168,85,247'},0.1);color:${e.gender === 'Male' ? '#60a5fa' : '#c084fc'};">${e.gender}</span></td>
          <td>${e.purpose}</td>
          <td class="td-mono">${fmtTime(e.time_in)}</td>
          <td class="td-mono">${fmtTime(e.time_out)}</td>
          <td class="td-mono" style="color:var(--success);">${duration}</td>
        </tr>`;
      }).join('');
}

function updateElapsedTimes() {
  document.querySelectorAll('.elapsed-cell[data-timein]').forEach(cell => {
    cell.textContent = calcElapsed(cell.dataset.timein);
  });
}

function fmtTime(dtStr) {
  if (!dtStr) return '—';
  return new Date(dtStr).toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });
}

function calcElapsed(timeInStr) {
  const diff = Date.now() - new Date(timeInStr).getTime();
  const totalSecs = Math.floor(diff / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function calcDuration(timeInStr, timeOutStr) {
  if (!timeInStr || !timeOutStr) return '—';
  const diff = new Date(timeOutStr).getTime() - new Date(timeInStr).getTime();
  const totalSecs = Math.floor(diff / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ─── New Entry Modal ──────────────────────────────────────────────────────────
document.getElementById('newTech4EdForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert('newTech4EdAlert');
  const f = e.target;

  const body = {
    name:    f.elements['t4e_name'].value.trim(),
    gender:  f.elements['t4e_gender'].value,
    purpose: f.elements['t4e_purpose'].value.trim(),
  };

  if (!body.name)    { showAlert('newTech4EdAlert', 'Name is required.'); return; }
  if (!body.gender)  { showAlert('newTech4EdAlert', 'Please select gender.'); return; }
  if (!body.purpose) { showAlert('newTech4EdAlert', 'Purpose is required.'); return; }

  const res = await API.createTech4Ed(body);
  if (!res) return;
  if (res.ok) {
    e.target.reset();
    closeModal('newTech4EdModal');
    loadTech4Ed();
  } else showAlert('newTech4EdAlert', res.data.message || 'Failed to create entry.');
});

// ─── Time Out ─────────────────────────────────────────────────────────────────
async function submitTimeout(id) {
  if (!confirm('Confirm time out for this session?')) return;
  const res = await API.timeoutTech4Ed(id);
  if (!res) return;
  if (res.ok) loadTech4Ed();
  else alert(res.data.message || 'Failed to time out.');
}
