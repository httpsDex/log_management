// ─── Utility Functions ───────────────────────────────────────────────────────

// Single badge by status/condition name
function badge(status) {
  const map = {
    Pending:       'badge-pending',
    Fixed:         'badge-fixed',
    Unserviceable: 'badge-unserviceable',
    Released:      'badge-released',
    Returned:      'badge-returned',
    Active:        'badge-active',
    Overdue:       'badge-overdue',
  };
  return `<span class="badge ${map[status] || ''}">${status}</span>`;
}

// Two badges side by side: lifecycle status + repair condition (for repairs only)
// repairCondition is null when item is still pending evaluation
function repairBadges(status, repairCondition) {
  const statusBadge    = badge(status);
  const conditionBadge = repairCondition ? badge(repairCondition) : '';
  return `<div style="display:flex;flex-direction:column;gap:4px;">${statusBadge}${conditionBadge}</div>`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function emptyState(message, colspan) {
  return `<tr><td colspan="${colspan}">
    <div class="empty-state">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/>
      </svg>
      <p>${message}</p>
    </div>
  </td></tr>`;
}

function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.textContent = msg;
}
function clearAlert(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = '';
  el.textContent = '';
}

function openModal(id)  { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.add('hidden');
});

function toggleOtherInput(selectEl, otherInputId) {
  const input = document.getElementById(otherInputId);
  if (!input) return;
  input.style.display = selectEl.value === '__other__' ? 'block' : 'none';
  if (selectEl.value !== '__other__') input.value = '';
}

function toggleOjtInput(selectEl, ojtInputId) {
  const input = document.getElementById(ojtInputId);
  if (!input) return;
  input.style.display = selectEl.value === '__ojt__' ? 'block' : 'none';
  if (selectEl.value !== '__ojt__') input.value = '';
}

function resolveSelectValue(selectEl, otherInputId, otherPrefix, ojtInputId) {
  const val = selectEl.value;
  if (val === '__other__') {
    const t = document.getElementById(otherInputId)?.value.trim();
    return t ? `${otherPrefix}${t}` : '';
  }
  if (val === '__ojt__') {
    const t = document.getElementById(ojtInputId)?.value.trim();
    return t ? `OJT: ${t}` : '';
  }
  return val;
}

function animateCount(el, target, duration = 600) {
  const start = parseInt(el.textContent) || 0;
  if (start === target) return;
  const startTime = performance.now();
  const update = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * ease);
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function animateBars() {
  document.querySelectorAll('.bar-fill[data-width]').forEach(bar => {
    const w = bar.dataset.width;
    setTimeout(() => { bar.style.width = w; }, 100);
  });
}

// Delete confirmation
let _deleteTarget = { type: null, id: null };

function openDeleteConfirm(type, id, label) {
  _deleteTarget = { type, id };
  document.getElementById('deleteRecordLabel').textContent = label;
  document.getElementById('deleteAdminPassword').value = '';
  clearAlert('deleteConfirmAlert');
  openModal('deleteConfirmModal');
}

async function submitDelete() {
  const password = document.getElementById('deleteAdminPassword').value.trim();
  if (!password) { showAlert('deleteConfirmAlert', 'Please enter your admin password.'); return; }

  const { type, id } = _deleteTarget;
  let res;
  if (type === 'repair')      res = await API.deleteRepair(id, password);
  else if (type === 'borrow') res = await API.deleteBorrow(id, password);
  else                        res = await API.deleteReservation(id, password);

  if (!res) return;
  if (res.ok) {
    closeModal('deleteConfirmModal');
    if (type === 'repair')      loadRepairHistory();
    else if (type === 'borrow') loadReturnHistory();
    else                        loadReservationHistory();
  } else {
    showAlert('deleteConfirmAlert', res.data.message || 'Deletion failed.');
  }
}
