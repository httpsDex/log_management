// ─── Tech4Ed Module ───────────────────────────────────────────────────────────

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
    return d.toDateString() === new Date().toDateString();
  }).length);

  // Entries sub-tab = all records shown as simple log (no timer)
  renderEntriesLog(_tech4edCache);

  // Time-In sub-tab = active sessions with timer + completed today
  renderTech4EdActive(active);
  renderTech4EdHistory(finished);

  _tech4edPollTimer = setInterval(updateElapsedTimes, 30000);
}

function renderEntriesLog(all) {
  document.getElementById('entriesLogBody').innerHTML = all.length === 0
    ? emptyState('No entries yet', 6)
    : all.map(e => `<tr>
        <td class="td-mono">#${e.id}</td>
        <td class="td-name">${e.name}</td>
        <td><span class="badge" style="background:rgba(${genderColor(e.gender)},0.1);color:${genderHex(e.gender)};">${e.gender}</span></td>
        <td>${e.purpose}</td>
        <td class="td-mono">${fmtDatetime(e.time_in)}</td>
        <td class="td-mono">${e.time_out ? fmtDatetime(e.time_out) : '<span style="color:var(--success);">Active</span>'}</td>
      </tr>`).join('');
}

function renderTech4EdActive(active) {
  document.getElementById('activeTech4EdBody').innerHTML = active.length === 0
    ? emptyState('No active sessions', 7)
    : active.map(e => `<tr id="t4e-row-${e.id}">
        <td class="td-mono">#${e.id}</td>
        <td class="td-name">${e.name}</td>
        <td><span class="badge" style="background:rgba(${genderColor(e.gender)},0.1);color:${genderHex(e.gender)};">${e.gender}</span></td>
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
          <td><span class="badge" style="background:rgba(${genderColor(e.gender)},0.1);color:${genderHex(e.gender)};">${e.gender}</span></td>
          <td>${e.purpose}</td>
          <td class="td-mono">${fmtTime(e.time_in)}</td>
          <td class="td-mono">${fmtTime(e.time_out)}</td>
          <td class="td-mono" style="color:var(--success);">${duration}</td>
        </tr>`;
      }).join('');
}

function genderColor(g) { return g === 'Male' ? '59,130,246' : g === 'Female' ? '168,85,247' : '245,158,11'; }
function genderHex(g)   { return g === 'Male' ? '#60a5fa'  : g === 'Female' ? '#c084fc'    : '#fbbf24'; }

function updateElapsedTimes() {
  document.querySelectorAll('.elapsed-cell[data-timein]').forEach(cell => {
    cell.textContent = calcElapsed(cell.dataset.timein);
  });
}

function fmtTime(dtStr) {
  if (!dtStr) return '—';
  return new Date(dtStr).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

function fmtDatetime(dtStr) {
  if (!dtStr) return '—';
  return new Date(dtStr).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

function calcElapsed(timeInStr) {
  const diff = Date.now() - new Date(timeInStr).getTime();
  const s = Math.floor(diff / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function calcDuration(timeInStr, timeOutStr) {
  if (!timeInStr || !timeOutStr) return '—';
  const diff = new Date(timeOutStr).getTime() - new Date(timeInStr).getTime();
  const s = Math.floor(diff / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

// ── Sub-tab switcher ──────────────────────────────────────────────────────────
function switchTech4EdSubTab(name) {
  document.querySelectorAll('#tab-tech4ed .subtab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subtab === name);
  });
  document.querySelectorAll('#tab-tech4ed .subtab-content').forEach(el => {
    el.classList.toggle('active', el.id === `t4e-subtab-${name}`);
  });
}

// ── Shared entry form (same modal for both tabs) ──────────────────────────────
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

async function submitTimeout(id) {
  if (!confirm('Confirm time out for this session?')) return;
  const res = await API.timeoutTech4Ed(id);
  if (!res) return;
  if (res.ok) loadTech4Ed();
  else alert(res.data.message || 'Failed to time out.');
}
