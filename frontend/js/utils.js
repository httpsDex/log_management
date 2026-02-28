// ── Utility functions shared across all modules ───────────────────────────────

// Single status badge
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

// Two stacked badges for repair rows: lifecycle status + repair condition
function repairBadges(status, repairCondition) {
  return `<div style="display:flex;flex-direction:column;gap:4px;">${badge(status)}${repairCondition ? badge(repairCondition) : ''}</div>`;
}

// Format a date string to readable short date
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Today's date as YYYY-MM-DD for date inputs
function today() {
  return new Date().toISOString().split('T')[0];
}

// Human-readable relative time
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

// Empty table state row
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

// Close modal when clicking backdrop
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.add('hidden');
});

// Show/hide "Other" text input when select has __other__ option chosen
function toggleOtherInput(selectEl, otherInputId) {
  const input = document.getElementById(otherInputId);
  if (!input) return;
  input.style.display = selectEl.value === '__other__' ? 'block' : 'none';
  if (selectEl.value !== '__other__') input.value = '';
}

// Show/hide OJT name text input when select has __ojt__ option chosen
function toggleOjtInput(selectEl, ojtInputId) {
  const input = document.getElementById(ojtInputId);
  if (!input) return;
  input.style.display = selectEl.value === '__ojt__' ? 'block' : 'none';
  if (selectEl.value !== '__ojt__') input.value = '';
}

// Get the final string value from a select that may have __other__ or __ojt__
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

// Animate a number counting up from current value to target
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

// Animate bar chart fill widths after render
function animateBars() {
  document.querySelectorAll('.bar-fill[data-width]').forEach(bar => {
    setTimeout(() => { bar.style.width = bar.dataset.width; }, 100);
  });
}

// ── Pagination renderer ───────────────────────────────────────────────────────
// Renders page buttons into containerId and calls onPageChange(page) on click
function renderPagination(containerId, { page, totalPages, total }, onPageChange) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (totalPages <= 1) { el.innerHTML = ''; return; }

  const start = (page - 1) * 20 + 1; // approximate, frontend doesn't know limit easily
  let html = `<div class="pagination">`;

  // Prev button
  html += `<button class="page-btn ${page === 1 ? 'disabled' : ''}"
    onclick="${page > 1 ? `(${onPageChange.toString()})(${page - 1})` : ''}"
    ${page === 1 ? 'disabled' : ''}>
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="13" height="13">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
    </svg>
  </button>`;

  // Page number buttons — show max 5 around current
  const pages = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.push(i);

  if (pages[0] > 1) {
    html += `<button class="page-btn" onclick="(${onPageChange.toString()})(1)">1</button>`;
    if (pages[0] > 2) html += `<span class="page-dots">…</span>`;
  }
  pages.forEach(p => {
    html += `<button class="page-btn ${p === page ? 'active' : ''}" onclick="(${onPageChange.toString()})(${p})">${p}</button>`;
  });
  if (pages[pages.length - 1] < totalPages) {
    if (pages[pages.length - 1] < totalPages - 1) html += `<span class="page-dots">…</span>`;
    html += `<button class="page-btn" onclick="(${onPageChange.toString()})(${totalPages})">${totalPages}</button>`;
  }

  // Next button
  html += `<button class="page-btn ${page === totalPages ? 'disabled' : ''}"
    onclick="${page < totalPages ? `(${onPageChange.toString()})(${page + 1})` : ''}"
    ${page === totalPages ? 'disabled' : ''}>
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="13" height="13">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
    </svg>
  </button>`;

  html += `<span class="page-info">${total} records</span></div>`;
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
    // Refresh the correct history tab
    if (type === 'repair')      loadRepairHistory(repairPages.history);
    else if (type === 'borrow') loadReturnHistory(borrowPages.history);
    else                        loadReservationHistory(resPages.history);
  } else {
    showAlert('deleteConfirmAlert', res.data.message || 'Deletion failed.');
  }
}
