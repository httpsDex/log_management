// ─── Config ───────────────────────────────────────────────────────────────────
const API = 'http://localhost:3000/api';

// ─── Auth Guard ───────────────────────────────────────────────────────────────
const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';

document.getElementById('sidebarUsername').textContent =
  localStorage.getItem('username') || 'Admin';

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href = 'index.html';
}

// ─── API Helper ───────────────────────────────────────────────────────────────
async function apiFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json();

  if (res.status === 401) {
    logout();
    return null;
  }

  return { ok: res.ok, status: res.status, data };
}

// ─── Tab Navigation ───────────────────────────────────────────────────────────
const tabTitles = {
  repairLogs: ['Repair Logs', 'Manage and track all repair requests'],
  repairHistory: ['Repair History', 'All completed repair records'],
  borrowLogs: ['Borrowers Logs', 'Manage borrowed items'],
  returnHistory: ['Returned Items History', 'All returned item records'],
};

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  document.getElementById(`tab-${tabName}`).classList.add('active');
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(el => {
    if (el.getAttribute('onclick') === `switchTab('${tabName}')`) {
      el.classList.add('active');
    }
  });

  const [title, subtitle] = tabTitles[tabName];
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageSubtitle').textContent = subtitle;

  if (tabName === 'repairLogs') loadRepairLogs();
  if (tabName === 'repairHistory') loadRepairHistory();
  if (tabName === 'borrowLogs') loadBorrowLogs();
  if (tabName === 'returnHistory') loadReturnHistory();
}

// ─── Modal Helpers ────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}
// Close modal on backdrop click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
});

// ─── Alert Helpers ────────────────────────────────────────────────────────────
function showAlert(containerId, message, type = 'error') {
  const el = document.getElementById(containerId);
  el.className = `alert alert-${type}`;
  el.textContent = message;
}
function clearAlert(containerId) {
  const el = document.getElementById(containerId);
  el.className = '';
  el.textContent = '';
}

// ─── Badge Helper ─────────────────────────────────────────────────────────────
function badge(status) {
  const map = {
    Pending: 'badge-pending',
    Repaired: 'badge-repaired',
    Completed: 'badge-completed',
    Unserviceable: 'badge-unserviceable',
    Returned: 'badge-returned',
  };
  return `<span class="badge ${map[status] || ''}">${status}</span>`;
}

// ─── Date Formatter ───────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ─── Today's date (YYYY-MM-DD) ────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPAIR LOGS
// ═══════════════════════════════════════════════════════════════════════════════

async function loadRepairLogs() {
  const res = await apiFetch('/repairs');
  if (!res || !res.ok) return;

  const all = res.data;

  // Update stats
  document.getElementById('stat-pending').textContent =
    all.filter(r => r.status === 'Pending').length;
  document.getElementById('stat-repaired').textContent =
    all.filter(r => r.status === 'Repaired').length;
  document.getElementById('stat-unserviceable').textContent =
    all.filter(r => r.status === 'Unserviceable').length;
  document.getElementById('stat-completed').textContent =
    all.filter(r => r.status === 'Completed').length;

  // Pending table
  const pending = all.filter(r => r.status === 'Pending');
  const pendingBody = document.getElementById('pendingRepairsBody');
  if (pending.length === 0) {
    pendingBody.innerHTML = `<tr><td colspan="11"><div class="empty-state">
      <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/>
      </svg>
      No pending repairs
    </div></td></tr>`;
  } else {
    pendingBody.innerHTML = pending.map(r => `
      <tr>
        <td class="mono text-xs" style="color:var(--muted)">#${r.id}</td>
        <td class="font-semibold">${r.customer_name}</td>
        <td>${r.location}</td>
        <td>${r.item_name}</td>
        <td>${r.item_type}</td>
        <td>${r.quantity}</td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.problem_description}">${r.problem_description}</td>
        <td>${r.received_by}</td>
        <td class="mono text-xs">${fmtDate(r.date_received)}</td>
        <td>${badge(r.status)}</td>
        <td>
          <button class="btn btn-warning btn-sm" onclick="openUpdateStatus(${r.id})">Update Status</button>
        </td>
      </tr>
    `).join('');
  }

  // Pickup (Repaired) table
  const repaired = all.filter(r => r.status === 'Repaired');
  const pickupBody = document.getElementById('pickupBody');
  if (repaired.length === 0) {
    pickupBody.innerHTML = `<tr><td colspan="5"><div class="empty-state">No items ready for pickup</div></td></tr>`;
  } else {
    pickupBody.innerHTML = repaired.map(r => `
      <tr>
        <td class="mono text-xs" style="color:var(--muted)">#${r.id}</td>
        <td class="font-semibold">${r.customer_name}</td>
        <td>${r.item_name}</td>
        <td>${r.repaired_by || '—'}</td>
        <td>
          <button class="btn btn-success btn-sm" onclick="openPickup(${r.id})">Process Pickup</button>
        </td>
      </tr>
    `).join('');
  }
}

// Open update status modal
function openUpdateStatus(id) {
  document.getElementById('updateRepairId').value = id;
  document.getElementById('updateRepairedBy').value = '';
  document.getElementById('updateStatus').value = 'Repaired';
  clearAlert('updateStatusAlert');
  openModal('updateStatusModal');
}

// Submit update status
async function submitUpdateStatus() {
  const id = document.getElementById('updateRepairId').value;
  const status = document.getElementById('updateStatus').value;
  const repaired_by = document.getElementById('updateRepairedBy').value.trim();

  if (!repaired_by) {
    showAlert('updateStatusAlert', 'Please enter who repaired the item.');
    return;
  }

  const res = await apiFetch(`/repairs/${id}/status`, 'PATCH', { status, repaired_by });
  if (!res) return;

  if (res.ok) {
    closeModal('updateStatusModal');
    loadRepairLogs();
  } else {
    showAlert('updateStatusAlert', res.data.message || 'Failed to update status.');
  }
}

// Open pickup modal
function openPickup(id) {
  document.getElementById('pickupRepairId').value = id;
  document.getElementById('pickedUpBy').value = '';
  document.getElementById('datePickedUp').value = today();
  document.getElementById('pickupComment').value = '';
  clearAlert('pickupAlert');
  openModal('pickupModal');
}

// Submit pickup
async function submitPickup() {
  const id = document.getElementById('pickupRepairId').value;
  const picked_up_by = document.getElementById('pickedUpBy').value.trim();
  const date_picked_up = document.getElementById('datePickedUp').value;
  const pickup_comment = document.getElementById('pickupComment').value.trim();

  if (!picked_up_by) {
    showAlert('pickupAlert', 'Please enter who picked up the item.');
    return;
  }

  const res = await apiFetch(`/repairs/${id}/pickup`, 'PATCH', {
    picked_up_by, date_picked_up, pickup_comment,
  });
  if (!res) return;

  if (res.ok) {
    closeModal('pickupModal');
    loadRepairLogs();
  } else {
    showAlert('pickupAlert', res.data.message || 'Failed to process pickup.');
  }
}

// New repair form submit
document.getElementById('newRepairForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert('newRepairAlert');

  const form = e.target;
  const fields = ['customer_name', 'location', 'item_name', 'item_type',
    'quantity', 'received_by', 'date_received', 'problem_description'];

  const body = {};
  for (const f of fields) {
    const val = form.elements[f].value.trim();
    if (!val) {
      showAlert('newRepairAlert', `Please fill in: ${f.replace('_', ' ')}`);
      return;
    }
    body[f] = val;
  }

  const res = await apiFetch('/repairs', 'POST', body);
  if (!res) return;

  if (res.ok) {
    form.reset();
    document.getElementById('repairDateInput').value = today();
    closeModal('newRepairModal');
    loadRepairLogs();
  } else {
    showAlert('newRepairAlert', res.data.message || 'Failed to create entry.');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// REPAIR HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

async function loadRepairHistory() {
  const res = await apiFetch('/repairs');
  if (!res || !res.ok) return;

  const completed = res.data.filter(r =>
    r.status === 'Completed' || r.status === 'Unserviceable'
  );
  const body = document.getElementById('repairHistoryBody');

  if (completed.length === 0) {
    body.innerHTML = `<tr><td colspan="10"><div class="empty-state">No completed repairs yet</div></td></tr>`;
    return;
  }

  body.innerHTML = completed.map(r => `
    <tr>
      <td class="mono text-xs" style="color:var(--muted)">#${r.id}</td>
      <td class="font-semibold">${r.customer_name}</td>
      <td>${r.location}</td>
      <td>${r.item_name}</td>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.problem_description}</td>
      <td>${r.repaired_by || '—'}</td>
      <td>${r.picked_up_by || '—'}</td>
      <td class="mono text-xs">${fmtDate(r.date_picked_up)}</td>
      <td>${r.pickup_comment || '—'}</td>
      <td>${badge(r.status)}</td>
    </tr>
  `).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BORROW LOGS
// ═══════════════════════════════════════════════════════════════════════════════

async function loadBorrowLogs() {
  const res = await apiFetch('/borrowed');
  if (!res || !res.ok) return;

  const all = res.data;

  document.getElementById('stat-borrow-pending').textContent =
    all.filter(b => b.status === 'Pending').length;
  document.getElementById('stat-borrow-returned').textContent =
    all.filter(b => b.status === 'Returned').length;

  const pending = all.filter(b => b.status === 'Pending');
  const body = document.getElementById('pendingBorrowBody');

  if (pending.length === 0) {
    body.innerHTML = `<tr><td colspan="9"><div class="empty-state">No pending borrowed items</div></td></tr>`;
  } else {
    body.innerHTML = pending.map(b => `
      <tr>
        <td class="mono text-xs" style="color:var(--muted)">#${b.id}</td>
        <td class="font-semibold">${b.borrower_name}</td>
        <td>${b.location}</td>
        <td>${b.item_borrowed}</td>
        <td>${b.quantity}</td>
        <td>${b.released_by}</td>
        <td class="mono text-xs">${fmtDate(b.date_borrowed)}</td>
        <td>${badge(b.status)}</td>
        <td>
          <button class="btn btn-success btn-sm" onclick="openReturn(${b.id})">Return</button>
        </td>
      </tr>
    `).join('');
  }
}

// New borrow form submit
document.getElementById('newBorrowForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert('newBorrowAlert');

  const form = e.target;
  const fields = ['borrower_name', 'location', 'item_borrowed', 'quantity', 'released_by', 'date_borrowed'];

  const body = {};
  for (const f of fields) {
    const val = form.elements[f].value.trim();
    if (!val) {
      showAlert('newBorrowAlert', `Please fill in: ${f.replace('_', ' ')}`);
      return;
    }
    body[f] = val;
  }

  const res = await apiFetch('/borrowed', 'POST', body);
  if (!res) return;

  if (res.ok) {
    form.reset();
    document.getElementById('borrowDateInput').value = today();
    closeModal('newBorrowModal');
    loadBorrowLogs();
  } else {
    showAlert('newBorrowAlert', res.data.message || 'Failed to create entry.');
  }
});

// Open return modal
function openReturn(id) {
  document.getElementById('returnBorrowId').value = id;
  document.getElementById('returnedBy').value = '';
  document.getElementById('receivedByReturn').value = '';
  document.getElementById('returnDate').value = today();
  document.getElementById('returnComments').value = '';
  clearAlert('returnAlert');
  openModal('returnModal');
}

// Submit return
async function submitReturn() {
  const id = document.getElementById('returnBorrowId').value;
  const returned_by = document.getElementById('returnedBy').value.trim();
  const received_by = document.getElementById('receivedByReturn').value.trim();
  const return_date = document.getElementById('returnDate').value;
  const comments = document.getElementById('returnComments').value.trim();

  if (!returned_by) { showAlert('returnAlert', 'Please enter who returned the item.'); return; }
  if (!received_by) { showAlert('returnAlert', 'Please enter who received the item.'); return; }

  const res = await apiFetch(`/borrowed/${id}/return`, 'PATCH', {
    returned_by, received_by, return_date, comments,
  });
  if (!res) return;

  if (res.ok) {
    closeModal('returnModal');
    loadBorrowLogs();
  } else {
    showAlert('returnAlert', res.data.message || 'Failed to process return.');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RETURN HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

async function loadReturnHistory() {
  const res = await apiFetch('/borrowed');
  if (!res || !res.ok) return;

  const returned = res.data.filter(b => b.status === 'Returned');
  const body = document.getElementById('returnHistoryBody');

  if (returned.length === 0) {
    body.innerHTML = `<tr><td colspan="10"><div class="empty-state">No returned items yet</div></td></tr>`;
    return;
  }

  body.innerHTML = returned.map(b => `
    <tr>
      <td class="mono text-xs" style="color:var(--muted)">#${b.id}</td>
      <td class="font-semibold">${b.borrower_name}</td>
      <td>${b.location}</td>
      <td>${b.item_borrowed}</td>
      <td>${b.quantity}</td>
      <td>${b.returned_by || '—'}</td>
      <td>${b.received_by || '—'}</td>
      <td class="mono text-xs">${fmtDate(b.return_date)}</td>
      <td>${b.comments || '—'}</td>
      <td>${badge(b.status)}</td>
    </tr>
  `).join('');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
// Set default dates on modals open
document.getElementById('repairDateInput').value = today();
document.getElementById('borrowDateInput').value = today();

// Load first tab
loadRepairLogs();
