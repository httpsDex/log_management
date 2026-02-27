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
    const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
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

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
// Shared across repairs and borrows history.
// Called with type='repair'|'borrow', the record id, and a label for the subtitle.
let _deleteTarget = null; // { type, id, reload }

function openDeleteConfirm(type, id, label) {
  _deleteTarget = { type, id };
  document.getElementById('deleteConfirmSubtitle').textContent = `Deleting: ${label}`;
  document.getElementById('deleteConfirmPassword').value = '';
  clearAlert('deleteConfirmAlert');
  // Reset button state
  const btn = document.getElementById('deleteConfirmBtn');
  btn.disabled = false;
  btn.textContent = '';
  btn.innerHTML = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:13px;height:13px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg> Delete Record`;
  openModal('deleteConfirmModal');
  // Focus password field after animation
  setTimeout(() => document.getElementById('deleteConfirmPassword').focus(), 120);
}

async function executeDelete() {
  if (!_deleteTarget) return;
  const password = document.getElementById('deleteConfirmPassword').value.trim();
  if (!password) {
    showAlert('deleteConfirmAlert', 'Please enter your password.');
    return;
  }

  const btn = document.getElementById('deleteConfirmBtn');
  btn.disabled = true;
  btn.innerHTML = 'Deleting...';

  const { type, id } = _deleteTarget;
  const res = type === 'repair'
    ? await API.deleteRepair(id, password)
    : await API.deleteBorrow(id, password);

  if (!res) { btn.disabled = false; btn.innerHTML = 'Delete Record'; return; }

  if (res.ok) {
    closeModal('deleteConfirmModal');
    _deleteTarget = null;
    // Reload the appropriate history
    if (type === 'repair') loadRepairHistory();
    else                   loadReturnHistory();
  } else {
    showAlert('deleteConfirmAlert', res.data.message || 'Failed to delete.');
    btn.disabled = false;
    btn.innerHTML = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:13px;height:13px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg> Delete Record`;
  }
}

// Allow pressing Enter in the password field to submit
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('deleteConfirmPassword')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') executeDelete();
  });
});
