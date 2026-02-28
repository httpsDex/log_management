// ── Utility functions shared across all modules ───────────────────────────────

// Global pagination registry — maps containerId → callback function
// This avoids serializing functions as strings in onclick attributes
const _paginationCallbacks = {};

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

function repairBadges(status, repairCondition) {
  return `<div style="display:flex;flex-direction:column;gap:4px;">${badge(status)}${repairCondition ? badge(repairCondition) : ''}</div>`;
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

// Close modal on backdrop click
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
  if (!el) return;
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
    setTimeout(() => { bar.style.width = bar.dataset.width; }, 100);
  });
}

// ── Pagination ────────────────────────────────────────────────────────────────
// Registers a callback in the global registry, then renders page buttons.
// Buttons call _paginate(containerId, page) which looks up the callback.
function _paginate(containerId, page) {
  const cb = _paginationCallbacks[containerId];
  if (cb) cb(page);
}

function renderPagination(containerId, { page, totalPages, total, limit = 15 }, onPageChange) {
  const el = document.getElementById(containerId);
  if (!el) return;

  // Register the callback so _paginate() can call it
  _paginationCallbacks[containerId] = onPageChange;

  if (totalPages <= 1) { el.innerHTML = ''; return; }

  const startRecord = (page - 1) * limit + 1;
  const endRecord   = Math.min(page * limit, total);

  let html = `<div class="pagination">`;

  // Previous button
  html += `<button class="page-btn ${page === 1 ? 'disabled' : ''}"
    onclick="_paginate('${containerId}', ${page - 1})"
    ${page === 1 ? 'disabled' : ''}>
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="13" height="13">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
    </svg>
  </button>`;

  // Page number buttons — window of 5 around current page
  const pages = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.push(i);

  if (pages[0] > 1) {
    html += `<button class="page-btn" onclick="_paginate('${containerId}', 1)">1</button>`;
    if (pages[0] > 2) html += `<span class="page-dots">…</span>`;
  }

  pages.forEach(p => {
    html += `<button class="page-btn ${p === page ? 'active' : ''}"
      onclick="_paginate('${containerId}', ${p})">${p}</button>`;
  });

  if (pages[pages.length - 1] < totalPages) {
    if (pages[pages.length - 1] < totalPages - 1) html += `<span class="page-dots">…</span>`;
    html += `<button class="page-btn" onclick="_paginate('${containerId}', ${totalPages})">${totalPages}</button>`;
  }

  // Next button
  html += `<button class="page-btn ${page === totalPages ? 'disabled' : ''}"
    onclick="_paginate('${containerId}', ${page + 1})"
    ${page === totalPages ? 'disabled' : ''}>
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="13" height="13">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
    </svg>
  </button>`;

  // Record count info
  html += `<span class="page-info">${startRecord}–${endRecord} of ${total}</span></div>`;

  el.innerHTML = html;
}

// ── Delete confirmation (shared across all modules) ───────────────────────────
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
    if (type === 'repair')      loadRepairHistory(repairPages.history);
    else if (type === 'borrow') loadReturnHistory(borrowPages.history);
    else                        loadReservationHistory(resPages.history);
  } else {
    showAlert('deleteConfirmAlert', res.data.message || 'Deletion failed.');
  }
}
