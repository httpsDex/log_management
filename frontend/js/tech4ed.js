// ── Tech4Ed module — subtabs: Entries | Active Sessions | Session History ─────

const t4ePages = { entries: 1, history: 1 };
const T4E_LIMIT = 15;

let _tech4edPollTimer = null;

// ── Load functions ────────────────────────────────────────────────────────────

async function loadT4eEntries(page = 1) {
  t4ePages.entries = page;
  const res = await API.getTech4Ed({ type: 'entry', page, limit: T4E_LIMIT });
  if (!res?.ok) return;
  const { data, total, totalPages } = res.data;

  document.getElementById('entriesLogBody').innerHTML = data.length === 0
    ? emptyState('No entries yet', 4)
    : data.map(e => `<tr>
        <td class="td-mono">#${e.id}</td>
        <td class="td-name">${esc(e.name)}</td>
        <td><span class="badge" style="background:rgba(${genderColor(e.gender)},0.1);color:${genderHex(e.gender)};">${e.gender}</span></td>
        <td>${esc(e.purpose)}</td>
      </tr>`).join('');

  renderPagination('t4eEntriesPagination', { page, totalPages, total, limit: T4E_LIMIT }, loadT4eEntries);
}

async function loadT4eActiveSessions() {
  const rows = await API.getActiveSessions();
  if (!rows?.ok) return;
  const active = rows.data;

  animateCount(document.getElementById('stat-t4e-active'), active.length);

  document.getElementById('activeTech4EdBody').innerHTML = active.length === 0
    ? emptyState('No active sessions', 7)
    : active.map(e => `<tr id="t4e-row-${e.id}">
        <td class="td-mono">#${e.id}</td>
        <td class="td-name">${esc(e.name)}</td>
        <td><span class="badge" style="background:rgba(${genderColor(e.gender)},0.1);color:${genderHex(e.gender)};">${e.gender}</span></td>
        <td>${esc(e.purpose)}</td>
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

async function loadT4eHistory(page = 1) {
  t4ePages.history = page;
  // Fetch session-type records paginated from backend
  const res = await API.getTech4Ed({ type: 'session', page, limit: T4E_LIMIT });
  if (!res?.ok) return;
  const { data, total, totalPages } = res.data;

  // Filter only completed sessions (time_out set)
  const finished = data.filter(e => e.time_out);

  document.getElementById('tech4EdHistoryBody').innerHTML = finished.length === 0
    ? emptyState('No completed sessions yet', 7)
    : finished.map(e => `<tr>
        <td class="td-mono">#${e.id}</td>
        <td class="td-name">${esc(e.name)}</td>
        <td><span class="badge" style="background:rgba(${genderColor(e.gender)},0.1);color:${genderHex(e.gender)};">${e.gender}</span></td>
        <td>${esc(e.purpose)}</td>
        <td class="td-mono">${fmtTime(e.time_in)}</td>
        <td class="td-mono">${fmtTime(e.time_out)}</td>
        <td class="td-mono" style="color:var(--success);">${calcDuration(e.time_in, e.time_out)}</td>
      </tr>`).join('');

  renderPagination('t4eHistoryPagination', { page, totalPages, total, limit: T4E_LIMIT }, loadT4eHistory);
}

async function loadT4eStats() {
  const res = await API.getStats();
  if (!res?.ok) return;
  const t = res.data.tech4ed;
  animateCount(document.getElementById('stat-t4e-entries'), t.entries);
  animateCount(document.getElementById('stat-t4e-total'),   t.total);
}

function loadTech4Ed() {
  clearInterval(_tech4edPollTimer);
  loadT4eStats();
  switchTech4EdSubTab('entries');
  // Refresh elapsed timers every 30s while on this tab
  _tech4edPollTimer = setInterval(updateElapsedTimes, 30000);
}

// ── Subtab switcher ───────────────────────────────────────────────────────────
function switchTech4EdSubTab(name) {
  document.querySelectorAll('#tab-tech4ed .subtab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subtab === name);
  });
  document.querySelectorAll('#tab-tech4ed .subtab-content').forEach(el => {
    el.classList.toggle('active', el.id === `t4e-subtab-${name}`);
  });

  if (name === 'entries') loadT4eEntries(t4ePages.entries);
  if (name === 'active')  loadT4eActiveSessions();
  if (name === 'history') loadT4eHistory(t4ePages.history);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function genderColor(g) { return g === 'Male' ? '59,130,246' : g === 'Female' ? '168,85,247' : '245,158,11'; }
function genderHex(g)   { return g === 'Male' ? '#60a5fa'    : g === 'Female' ? '#c084fc'    : '#fbbf24'; }

function updateElapsedTimes() {
  document.querySelectorAll('.elapsed-cell[data-timein]').forEach(cell => {
    cell.textContent = calcElapsed(cell.dataset.timein);
  });
}

function fmtTime(dtStr) {
  if (!dtStr) return '—';
  return new Date(dtStr).toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
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

// ── Entry log form ────────────────────────────────────────────────────────────
document.getElementById('newEntryLogForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert('newEntryLogAlert');
  const f = e.target;
  const name    = f.elements['el_name'].value.trim();
  const gender  = f.elements['el_gender'].value;
  const purpose = f.elements['el_purpose'].value.trim();

  if (!name)    { showAlert('newEntryLogAlert', 'Name is required.'); return; }
  if (!gender)  { showAlert('newEntryLogAlert', 'Please select gender.'); return; }
  if (!purpose) { showAlert('newEntryLogAlert', 'Purpose is required.'); return; }

  const res = await API.createTech4EdEntry({ name, gender, purpose });
  if (!res) return;
  if (res.ok) {
    e.target.reset();
    closeModal('newEntryLogModal');
    loadT4eEntries(1);
    loadT4eStats();
  } else showAlert('newEntryLogAlert', res.data.message || 'Failed to create entry.');
});

// ── Time-in session form ──────────────────────────────────────────────────────
document.getElementById('newTimeInForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert('newTimeInAlert');
  const f = e.target;
  const name    = f.elements['ti_name'].value.trim();
  const gender  = f.elements['ti_gender'].value;
  const purpose = f.elements['ti_purpose'].value.trim();

  if (!name)    { showAlert('newTimeInAlert', 'Name is required.'); return; }
  if (!gender)  { showAlert('newTimeInAlert', 'Please select gender.'); return; }
  if (!purpose) { showAlert('newTimeInAlert', 'Purpose is required.'); return; }

  const res = await API.createTech4Ed({ name, gender, purpose });
  if (!res) return;
  if (res.ok) {
    e.target.reset();
    closeModal('newTimeInModal');
    loadT4eActiveSessions();
    loadT4eStats();
  } else showAlert('newTimeInAlert', res.data.message || 'Failed to start session.');
});

// Time out button handler
async function submitTimeout(id) {
  if (!confirm('Confirm time out for this session?')) return;
  const res = await API.timeoutTech4Ed(id);
  if (!res) return;
  if (res.ok) { loadT4eActiveSessions(); loadT4eStats(); }
  else alert(res.data.message || 'Failed to time out.');
}
