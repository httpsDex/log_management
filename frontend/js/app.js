const API = 'http://localhost:3000/api';

// ─── Auth Guard ───────────────────────────────────────────────────────────────
const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';

const username = localStorage.getItem('username') || 'Admin';
document.getElementById('sidebarUsername').textContent = username;
document.getElementById('userInitial').textContent = username.charAt(0).toUpperCase();

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href = 'index.html';
}

// ─── API Helper ───────────────────────────────────────────────────────────────
async function apiFetch(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(`${API}${path}`, opts);
  const data = await res.json();
  if (res.status === 401) { logout(); return null; }
  return { ok: res.ok, data };
}

// ─── Load Dropdowns (offices + employees) ────────────────────────────────────
// Called once on page load; stores the arrays globally for reuse
let gOffices   = [];
let gEmployees = [];

async function loadLookups() {
  const [offRes, empRes] = await Promise.all([apiFetch('/offices'), apiFetch('/employees')]);
  if (offRes?.ok) gOffices   = offRes.data;
  if (empRes?.ok) gEmployees = empRes.data;
  populateAllDropdowns();
}

// Populate a <select> with offices (adds an "Other" option at the end)
function fillOfficeSelect(selectEl) {
  selectEl.innerHTML = '<option value="">Select office...</option>';
  gOffices.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.name; opt.textContent = o.name;
    selectEl.appendChild(opt);
  });
  const other = document.createElement('option');
  other.value = '__other__'; other.textContent = 'Other (specify)';
  selectEl.appendChild(other);
}

// Populate a <select> with employees (adds an "OJT" option at the end)
function fillEmployeeSelect(selectEl) {
  selectEl.innerHTML = '<option value="">Select employee...</option>';
  gEmployees.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.full_name; opt.textContent = e.full_name;
    selectEl.appendChild(opt);
  });
  const ojt = document.createElement('option');
  ojt.value = '__ojt__'; ojt.textContent = 'OJT (enter name)';
  selectEl.appendChild(ojt);
}

function populateAllDropdowns() {
  fillOfficeSelect(document.getElementById('repairOfficeSelect'));
  fillOfficeSelect(document.getElementById('borrowOfficeSelect'));
  fillEmployeeSelect(document.getElementById('repairReceivedBySelect'));
  fillEmployeeSelect(document.getElementById('updateRepairedBySelect'));
  fillEmployeeSelect(document.getElementById('releaseReleasedBySelect'));
  fillEmployeeSelect(document.getElementById('borrowReleasedBySelect'));
  fillEmployeeSelect(document.getElementById('returnReceivedBySelect'));
}

// Show/hide the "Other" text input based on dropdown selection
function toggleOtherInput(selectEl, otherInputId) {
  const input = document.getElementById(otherInputId);
  input.style.display = selectEl.value === '__other__' ? 'block' : 'none';
  if (selectEl.value !== '__other__') input.value = '';
}

// Show/hide OJT name input
function toggleOjtInput(selectEl, ojtInputId) {
  const input = document.getElementById(ojtInputId);
  input.style.display = selectEl.value === '__ojt__' ? 'block' : 'none';
  if (selectEl.value !== '__ojt__') input.value = '';
}

// Resolve the final string value from a select+optional-text-input pair
// otherVal = what __other__ resolves to; ojtVal = what __ojt__ resolves to
function resolveSelectValue(selectEl, otherInputId, otherPrefix, ojtInputId) {
  const val = selectEl.value;
  if (val === '__other__') {
    const t = document.getElementById(otherInputId).value.trim();
    return t ? `${otherPrefix}${t}` : '';
  }
  if (val === '__ojt__') {
    const t = document.getElementById(ojtInputId).value.trim();
    return t ? `OJT: ${t}` : '';
  }
  return val;
}

// ─── Tab Navigation ───────────────────────────────────────────────────────────
const tabMeta = {
  repairLogs:    ['Repair Logs',         'Manage and track all repair requests'],
  repairHistory: ['Repair History',      'All released repair records'],
  borrowLogs:    ['Borrow Logs',         'Manage borrowed items'],
  returnHistory: ['Returned Items',      'All returned item records'],
};

// ─── Sidebar open/close (mobile) ─────────────────────────────────────────────
function openSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  sidebar.classList.add('open');
  backdrop.classList.add('visible');
  document.body.style.overflow = 'hidden'; // prevent background scroll
}

function closeSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  sidebar.classList.remove('open');
  backdrop.classList.remove('visible');
  document.body.style.overflow = '';
}

function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.getAttribute('onclick') === `switchTab('${name}')`) el.classList.add('active');
  });
  const [title, sub] = tabMeta[name];
  document.getElementById('pageTitle').textContent    = title;
  document.getElementById('pageSubtitle').textContent = sub;
  // Update mobile topbar title
  const mobileTitle = document.getElementById('mobileTitleBar');
  if (mobileTitle) mobileTitle.textContent = title;
  // Auto-close sidebar when a nav item is tapped on mobile
  closeSidebar();
  if (name === 'repairLogs')    loadRepairLogs();
  if (name === 'repairHistory') loadRepairHistory();
  if (name === 'borrowLogs')    loadBorrowLogs();
  if (name === 'returnHistory') loadReturnHistory();
}

// ─── Modal Helpers ────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
document.querySelectorAll('.modal-overlay').forEach(overlay =>
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); })
);

function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  el.className = `alert alert-${type}`; el.textContent = msg;
}
function clearAlert(id) {
  const el = document.getElementById(id);
  el.className = ''; el.textContent = '';
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function badge(status) {
  const map = {
    Pending: 'badge-pending', Fixed: 'badge-fixed',
    Unserviceable: 'badge-unserviceable', Released: 'badge-released', Returned: 'badge-returned',
  };
  return `<span class="badge ${map[status] || ''}">${status}</span>`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function today() { return new Date().toISOString().split('T')[0]; }

// ═══════════════════════════════════════════════════════════════════════════════
// REPAIR LOGS
// ═══════════════════════════════════════════════════════════════════════════════

async function loadRepairLogs() {
  const res = await apiFetch('/repairs');
  if (!res?.ok) return;
  const all = res.data;

  // Stats
  document.getElementById('stat-pending').textContent      = all.filter(r => r.status === 'Pending').length;
  document.getElementById('stat-fixed').textContent        = all.filter(r => r.status === 'Fixed').length;
  document.getElementById('stat-unserviceable').textContent= all.filter(r => r.status === 'Unserviceable').length;
  document.getElementById('stat-released').textContent     = all.filter(r => r.status === 'Released').length;

  // Pending for repair table
  const pending = all.filter(r => r.status === 'Pending');
  const pBody   = document.getElementById('pendingRepairsBody');
  pBody.innerHTML = pending.length === 0
    ? `<tr><td colspan="11"><div class="empty-state"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/></svg>No pending repairs</div></td></tr>`
    : pending.map(r => `<tr>
        <td class="td-mono">#${r.id}</td>
        <td class="td-name">${r.customer_name}</td>
        <td>${r.office}</td>
        <td>${r.item_name}</td>
        <td class="td-mono">${r.serial_specs || '—'}</td>
        <td>${r.quantity}</td>
        <td class="td-truncate" title="${r.problem_description}">${r.problem_description}</td>
        <td>${r.received_by}</td>
        <td class="td-mono">${fmtDate(r.date_received)}</td>
        <td>${badge(r.status)}</td>
        <td><button class="btn btn-warn btn-sm" onclick="openUpdateStatus(${r.id})">Update</button></td>
      </tr>`).join('');

  // Ready for release (Fixed or Unserviceable)
  const ready  = all.filter(r => r.status === 'Fixed' || r.status === 'Unserviceable');
  const rBody  = document.getElementById('releaseBody');
  rBody.innerHTML = ready.length === 0
    ? `<tr><td colspan="8"><div class="empty-state">No items ready for release</div></td></tr>`
    : ready.map(r => `<tr>
        <td class="td-mono">#${r.id}</td>
        <td class="td-name">${r.customer_name}</td>
        <td>${r.office}</td>
        <td>${r.item_name}</td>
        <td>${r.repaired_by || '—'}</td>
        <td class="td-truncate" title="${r.repair_comment || ''}">${r.repair_comment || '—'}</td>
        <td>${badge(r.status)}</td>
        <td><button class="btn btn-success btn-sm" onclick="openRelease(${r.id})">Release</button></td>
      </tr>`).join('');
}

// Open update-status modal
function openUpdateStatus(id) {
  document.getElementById('updateRepairId').value = id;
  document.getElementById('updateStatus').value   = 'Fixed';
  document.getElementById('updateRepairedBySelect').value = '';
  document.getElementById('updateRepairedByOjt').style.display = 'none';
  document.getElementById('updateRepairedByOjt').value = '';
  document.getElementById('repairComment').value  = '';
  clearAlert('updateStatusAlert');
  openModal('updateStatusModal');
}

async function submitUpdateStatus() {
  const id          = document.getElementById('updateRepairId').value;
  const status      = document.getElementById('updateStatus').value;
  const repair_comment = document.getElementById('repairComment').value.trim();
  const repaired_by = resolveSelectValue(
    document.getElementById('updateRepairedBySelect'), 'updateRepairedByOjt', '', 'updateRepairedByOjt'
  );

  if (!repaired_by) { showAlert('updateStatusAlert', 'Please select or enter who repaired the item.'); return; }

  const res = await apiFetch(`/repairs/${id}/status`, 'PATCH', { status, repaired_by, repair_comment });
  if (!res) return;
  if (res.ok) { closeModal('updateStatusModal'); loadRepairLogs(); }
  else showAlert('updateStatusAlert', res.data.message || 'Failed to update.');
}

// Open release modal
function openRelease(id) {
  document.getElementById('releaseRepairId').value = id;
  document.getElementById('claimedBy').value       = '';
  document.getElementById('dateClaimed').value     = today();
  document.getElementById('releaseReleasedBySelect').value = '';
  document.getElementById('releaseReleasedByOjt').style.display = 'none';
  document.getElementById('releaseReleasedByOjt').value = '';
  clearAlert('releaseAlert');
  openModal('releaseModal');
}

async function submitRelease() {
  const id          = document.getElementById('releaseRepairId').value;
  const claimed_by  = document.getElementById('claimedBy').value.trim();
  const date_claimed= document.getElementById('dateClaimed').value;
  const released_by = resolveSelectValue(
    document.getElementById('releaseReleasedBySelect'), 'releaseReleasedByOjt', '', 'releaseReleasedByOjt'
  );

  if (!claimed_by)  { showAlert('releaseAlert', 'Please enter who is claiming the item.'); return; }
  if (!released_by) { showAlert('releaseAlert', 'Please select who is releasing the item.'); return; }

  const res = await apiFetch(`/repairs/${id}/release`, 'PATCH', { claimed_by, date_claimed, released_by });
  if (!res) return;
  if (res.ok) { closeModal('releaseModal'); loadRepairLogs(); }
  else showAlert('releaseAlert', res.data.message || 'Failed to release.');
}

// New repair form
document.getElementById('newRepairForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert('newRepairAlert');
  const f = e.target;

  const office = resolveSelectValue(
    document.getElementById('repairOfficeSelect'), 'repairOfficeOther', '', 'repairOfficeOther'
  );
  const received_by = resolveSelectValue(
    document.getElementById('repairReceivedBySelect'), 'repairReceivedByOjt', '', 'repairReceivedByOjt'
  );

  const body = {
    customer_name:       f.elements['customer_name'].value.trim(),
    office,
    item_name:           f.elements['item_name'].value.trim(),
    serial_specs:        f.elements['serial_specs'].value.trim(),
    quantity:            f.elements['quantity'].value,
    date_received:       f.elements['date_received'].value,
    received_by,
    problem_description: f.elements['problem_description'].value.trim(),
  };

  if (!body.customer_name)       { showAlert('newRepairAlert', 'Customer name is required.'); return; }
  if (!body.office)              { showAlert('newRepairAlert', 'Please select or enter an office.'); return; }
  if (!body.item_name)           { showAlert('newRepairAlert', 'Item name is required.'); return; }
  if (!body.date_received)       { showAlert('newRepairAlert', 'Date received is required.'); return; }
  if (!body.received_by)         { showAlert('newRepairAlert', 'Please select who received the item.'); return; }
  if (!body.problem_description) { showAlert('newRepairAlert', 'Problem description is required.'); return; }

  const res = await apiFetch('/repairs', 'POST', body);
  if (!res) return;
  if (res.ok) {
    e.target.reset();
    document.getElementById('repairDateInput').value = today();
    // Reset conditional fields
    document.getElementById('repairOfficeOther').style.display    = 'none';
    document.getElementById('repairReceivedByOjt').style.display  = 'none';
    closeModal('newRepairModal');
    loadRepairLogs();
  } else showAlert('newRepairAlert', res.data.message || 'Failed to create entry.');
});

// ─── Repair History ───────────────────────────────────────────────────────────
async function loadRepairHistory() {
  const res = await apiFetch('/repairs');
  if (!res?.ok) return;
  const released = res.data.filter(r => r.status === 'Released');
  const body = document.getElementById('repairHistoryBody');
  body.innerHTML = released.length === 0
    ? `<tr><td colspan="11"><div class="empty-state">No released repairs yet</div></td></tr>`
    : released.map(r => `<tr>
        <td class="td-mono">#${r.id}</td>
        <td class="td-name">${r.customer_name}</td>
        <td>${r.office}</td>
        <td>${r.item_name}</td>
        <td class="td-mono">${r.serial_specs || '—'}</td>
        <td class="td-truncate" title="${r.problem_description}">${r.problem_description}</td>
        <td>${r.repaired_by || '—'}</td>
        <td>${r.claimed_by || '—'}</td>
        <td>${r.released_by || '—'}</td>
        <td class="td-mono">${fmtDate(r.date_claimed)}</td>
        <td>${badge(r.status)}</td>
      </tr>`).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BORROW LOGS
// ═══════════════════════════════════════════════════════════════════════════════

async function loadBorrowLogs() {
  const res = await apiFetch('/borrowed');
  if (!res?.ok) return;
  const all = res.data;

  document.getElementById('stat-borrow-pending').textContent  = all.filter(b => b.status === 'Pending').length;
  document.getElementById('stat-borrow-returned').textContent = all.filter(b => b.status === 'Returned').length;

  const pending = all.filter(b => b.status === 'Pending');
  const body    = document.getElementById('pendingBorrowBody');
  body.innerHTML = pending.length === 0
    ? `<tr><td colspan="9"><div class="empty-state">No pending borrowed items</div></td></tr>`
    : pending.map(b => `<tr>
        <td class="td-mono">#${b.id}</td>
        <td class="td-name">${b.borrower_name}</td>
        <td>${b.office}</td>
        <td>${b.item_borrowed}</td>
        <td>${b.quantity}</td>
        <td>${b.released_by}</td>
        <td class="td-mono">${fmtDate(b.date_borrowed)}</td>
        <td>${badge(b.status)}</td>
        <td><button class="btn btn-success btn-sm" onclick="openReturn(${b.id})">Return</button></td>
      </tr>`).join('');
}

// New borrow form
document.getElementById('newBorrowForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert('newBorrowAlert');
  const f = e.target;

  const office = resolveSelectValue(
    document.getElementById('borrowOfficeSelect'), 'borrowOfficeOther', '', 'borrowOfficeOther'
  );
  const released_by = resolveSelectValue(
    document.getElementById('borrowReleasedBySelect'), 'borrowReleasedByOjt', '', 'borrowReleasedByOjt'
  );

  const body = {
    borrower_name: f.elements['borrower_name'].value.trim(),
    office,
    item_borrowed: f.elements['item_borrowed'].value.trim(),
    quantity:      f.elements['quantity'].value,
    released_by,
    date_borrowed: f.elements['date_borrowed'].value,
  };

  if (!body.borrower_name) { showAlert('newBorrowAlert', 'Borrower name is required.'); return; }
  if (!body.office)        { showAlert('newBorrowAlert', 'Please select or enter an office.'); return; }
  if (!body.item_borrowed) { showAlert('newBorrowAlert', 'Item name is required.'); return; }
  if (!body.date_borrowed) { showAlert('newBorrowAlert', 'Date borrowed is required.'); return; }
  if (!body.released_by)   { showAlert('newBorrowAlert', 'Please select who released the item.'); return; }

  const res = await apiFetch('/borrowed', 'POST', body);
  if (!res) return;
  if (res.ok) {
    e.target.reset();
    document.getElementById('borrowDateInput').value = today();
    document.getElementById('borrowOfficeOther').style.display    = 'none';
    document.getElementById('borrowReleasedByOjt').style.display  = 'none';
    closeModal('newBorrowModal');
    loadBorrowLogs();
  } else showAlert('newBorrowAlert', res.data.message || 'Failed to create entry.');
});

// Open return modal
function openReturn(id) {
  document.getElementById('returnBorrowId').value  = id;
  document.getElementById('returnedBy').value      = '';
  document.getElementById('returnDate').value      = today();
  document.getElementById('returnReceivedBySelect').value = '';
  document.getElementById('returnReceivedByOjt').style.display = 'none';
  document.getElementById('returnReceivedByOjt').value = '';
  document.getElementById('returnComments').value  = '';
  clearAlert('returnAlert');
  openModal('returnModal');
}

async function submitReturn() {
  const id          = document.getElementById('returnBorrowId').value;
  const returned_by = document.getElementById('returnedBy').value.trim();
  const return_date = document.getElementById('returnDate').value;
  const received_by = resolveSelectValue(
    document.getElementById('returnReceivedBySelect'), 'returnReceivedByOjt', '', 'returnReceivedByOjt'
  );
  const comments    = document.getElementById('returnComments').value.trim();

  if (!returned_by) { showAlert('returnAlert', 'Please enter who returned the item.'); return; }
  if (!received_by) { showAlert('returnAlert', 'Please select who received the item.'); return; }

  const res = await apiFetch(`/borrowed/${id}/return`, 'PATCH', { returned_by, received_by, return_date, comments });
  if (!res) return;
  if (res.ok) { closeModal('returnModal'); loadBorrowLogs(); }
  else showAlert('returnAlert', res.data.message || 'Failed to process return.');
}

// ─── Return History ───────────────────────────────────────────────────────────
async function loadReturnHistory() {
  const res = await apiFetch('/borrowed');
  if (!res?.ok) return;
  const returned = res.data.filter(b => b.status === 'Returned');
  const body = document.getElementById('returnHistoryBody');
  body.innerHTML = returned.length === 0
    ? `<tr><td colspan="10"><div class="empty-state">No returned items yet</div></td></tr>`
    : returned.map(b => `<tr>
        <td class="td-mono">#${b.id}</td>
        <td class="td-name">${b.borrower_name}</td>
        <td>${b.office}</td>
        <td>${b.item_borrowed}</td>
        <td>${b.quantity}</td>
        <td>${b.returned_by || '—'}</td>
        <td>${b.received_by || '—'}</td>
        <td class="td-mono">${fmtDate(b.return_date)}</td>
        <td>${b.comments || '—'}</td>
        <td>${badge(b.status)}</td>
      </tr>`).join('');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.getElementById('repairDateInput').value = today();
document.getElementById('borrowDateInput').value = today();

// Load offices + employees first, then render the first tab
loadLookups().then(() => loadRepairLogs());