// ─── Tech4Ed Module ───────────────────────────────────────────────────────────

let _tech4edPollTimer = null;
let _entriesCache  = [];   // type = 'entry'
let _sessionsCache = [];   // type = 'session'

async function loadTech4Ed() {
  clearInterval(_tech4edPollTimer);
  const res = await API.getTech4Ed();
  if (!res?.ok) return;

  _entriesCache  = res.data.filter(e => e.type === 'entry');
  _sessionsCache = res.data.filter(e => e.type === 'session');

  const activeSessions   = _sessionsCache.filter(e => !e.time_out);
  const finishedSessions = _sessionsCache.filter(e =>  e.time_out);

  animateCount(document.getElementById('stat-t4e-active'),  activeSessions.length);
  animateCount(document.getElementById('stat-t4e-entries'), _entriesCache.length);
  animateCount(document.getElementById('stat-t4e-total'),   res.data.length);

  renderEntriesLog(_entriesCache);
  renderTech4EdActive(activeSessions);
  renderTech4EdHistory(finishedSessions);

  _tech4edPollTimer = setInterval(updateElapsedTimes, 30000);
}

// ── Entries Log (type = 'entry') ──────────────────────────────────────────────
function renderEntriesLog(entries) {
  document.getElementById('entriesLogBody').innerHTML = entries.length === 0
    ? emptyState('No entries yet', 4)
    : entries.map(e => `<tr>
        <td class="td-mono">#${e.id}</td>
        <td class="td-name">${e.name}</td>
        <td><span class="badge" style="background:rgba(${genderColor(e.gender)},0.1);color:${genderHex(e.gender)};">${e.gender}</span></td>
        <td>${e.purpose}</td>
      </tr>`).join('');
}

// ── Time-In Sessions (type = 'session') ───────────────────────────────────────
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

// ── ENTRIES LOG FORM (type = 'entry') ─────────────────────────────────────────
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
    loadTech4Ed();
  } else showAlert('newEntryLogAlert', res.data.message || 'Failed to create entry.');
});

// ── TIME-IN SESSION FORM (type = 'session') ───────────────────────────────────
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
    loadTech4Ed();
  } else showAlert('newTimeInAlert', res.data.message || 'Failed to start session.');
});

async function submitTimeout(id) {
  if (!confirm('Confirm time out for this session?')) return;
  const res = await API.timeoutTech4Ed(id);
  if (!res) return;
  if (res.ok) loadTech4Ed();
  else alert(res.data.message || 'Failed to time out.');
}
