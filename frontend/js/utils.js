// ─── Utility Functions ───────────────────────────────────────────────────────

function badge(status) {
  const map = {
    Pending:       'badge-pending',
    Fixed:         'badge-fixed',
    Unserviceable: 'badge-unserviceable',
    Released:      'badge-released',
    Returned:      'badge-returned',
  };
  return `<span class="badge ${map[status] || ''}">${status}</span>`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
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

// ─── Alert helpers ────────────────────────────────────────────────────────────
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

// ─── Modal helpers ────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

// Close on backdrop click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }
});

// ─── Dropdown helpers ─────────────────────────────────────────────────────────
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

// ─── Number counter animation ─────────────────────────────────────────────────
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

// ─── Bar chart animation ──────────────────────────────────────────────────────
function animateBars() {
  document.querySelectorAll('.bar-fill[data-width]').forEach(bar => {
    const w = bar.dataset.width;
    setTimeout(() => { bar.style.width = w; }, 100);
  });
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
// type: 'repair' | 'borrow'
// id:   record id
// label: human-readable name shown in the modal
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
  if (!password) {
    showAlert('deleteConfirmAlert', 'Please enter your admin password.');
    return;
  }

  const { type, id } = _deleteTarget;
  let res;
  if (type === 'repair') {
    res = await API.deleteRepair(id, password);
  } else {
    res = await API.deleteBorrow(id, password);
  }

  if (!res) return;

  if (res.ok) {
    closeModal('deleteConfirmModal');
    // Reload the appropriate history tab
    if (type === 'repair') loadRepairHistory();
    else loadReturnHistory();
  } else {
    showAlert('deleteConfirmAlert', res.data.message || 'Deletion failed.');
  }
}
