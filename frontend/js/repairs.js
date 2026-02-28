// ── Repairs module — subtabs: Pending | Ready for Release | History ───────────

// Track current page per subtab
const repairPages = { pending: 1, ready: 1, history: 1 };
const REPAIR_LIMIT = 15;

// Cache history rows for detail view (avoids re-fetch just for modal)
let _repairHistoryCache = [];

// ── Load functions (one per subtab) ──────────────────────────────────────────

async function loadRepairPending(page = 1) {
  repairPages.pending = page;
  const res = await API.getRepairs({ status: 'Pending', page, limit: REPAIR_LIMIT });
  if (!res?.ok) return;
  const { data, total, totalPages } = res.data;

  // Update stat cards from the counts of THIS response isn't accurate for total —
  // stats come from loadRepairStats() called once on tab open
  const pending = data;

  document.getElementById('pendingRepairsBody').innerHTML = pending.length === 0
    ? emptyState('No pending repairs', 11)
    : pending.map(r => `<tr>
        <td class="td-mono">#${r.id}</td>
        <td class="td-name">${esc(r.customer_name)}</td>
        <td>${esc(r.office)}</td>
        <td>${esc(r.item_name)}</td>
        <td class="td-mono">${esc(r.serial_specs || '—')}</td>
        <td>${r.quantity}</td>
        <td class="td-truncate" title="${esc(r.problem_description)}">${esc(r.problem_description)}</td>
        <td>${esc(r.received_by)}</td>
        <td class="td-mono">${fmtDate(r.date_received)}</td>
        <td>${repairBadges(r.status, r.repair_condition)}</td>
        <td>
          <button class="btn btn-warn btn-sm" onclick="openUpdateStatus(${r.id})">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            Update
          </button>
        </td>
      </tr>`).join('');

  renderPagination('repairPendingPagination', { page, totalPages, total }, loadRepairPending);
}

async function loadRepairReady(page = 1) {
  repairPages.ready = page;
  // "Ready" = Pending status AND repair_condition is already set
  // We fetch all pending and filter client-side for this subtab
  // (small set, so one extra fetch is fine; alternatively add a backend filter)
  const res = await API.getRepairs({ status: 'Pending', page: 1, limit: 200 });
  if (!res?.ok) return;
  const ready = res.data.data.filter(r => r.repair_condition);

  // Manual client-side pagination for ready subtab
  const total      = ready.length;
  const totalPages = Math.ceil(total / REPAIR_LIMIT) || 1;
  const sliced     = ready.slice((page - 1) * REPAIR_LIMIT, page * REPAIR_LIMIT);

  document.getElementById('releaseBody').innerHTML = sliced.length === 0
    ? emptyState('No items ready for release', 8)
    : sliced.map(r => `<tr>
        <td class="td-mono">#${r.id}</td>
        <td class="td-name">${esc(r.customer_name)}</td>
        <td>${esc(r.office)}</td>
        <td>${esc(r.item_name)}</td>
        <td>${esc(r.repaired_by || '—')}</td>
        <td class="td-truncate" title="${esc(r.repair_comment || '')}">${esc(r.repair_comment || '—')}</td>
        <td>${repairBadges(r.status, r.repair_condition)}</td>
        <td>
          <button class="btn btn-success btn-sm" onclick="openRelease(${r.id})">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            Release
          </button>
        </td>
      </tr>`).join('');

  renderPagination('repairReadyPagination', { page, totalPages, total }, loadRepairReady);
}

async function loadRepairHistory(page = 1) {
  repairPages.history = page;
  const res = await API.getRepairs({ status: 'Released', page, limit: REPAIR_LIMIT });
  if (!res?.ok) return;
  const { data, total, totalPages } = res.data;
  _repairHistoryCache = data;

  document.getElementById('repairHistoryBody').innerHTML = data.length === 0
    ? emptyState('No released repairs yet', 12)
    : data.map(r => `<tr>
        <td class="td-mono">#${r.id}</td>
        <td class="td-name">${esc(r.customer_name)}</td>
        <td>${esc(r.office)}</td>
        <td>${esc(r.item_name)}</td>
        <td class="td-mono">${esc(r.serial_specs || '—')}</td>
        <td class="td-truncate" title="${esc(r.problem_description)}">${esc(r.problem_description)}</td>
        <td>${esc(r.repaired_by || '—')}</td>
        <td>${esc(r.claimed_by || '—')}</td>
        <td>${esc(r.released_by || '—')}</td>
        <td class="td-mono">${fmtDate(r.date_claimed)}</td>
        <td>${repairBadges(r.status, r.repair_condition)}</td>
        <td style="display:flex;gap:6px;">
          <button class="btn btn-info btn-sm" onclick="openRepairDetail(${r.id})">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            View
          </button>
          <button class="btn btn-sm" style="background:rgba(239,68,68,0.1);color:#f87171;border:1px solid rgba(239,68,68,0.2);"
            onclick="openDeleteConfirm('repair', ${r.id}, '${esc(r.customer_name).replace(/'/g,"\\'")} — ${esc(r.item_name).replace(/'/g,"\\'")}')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            Delete
          </button>
        </td>
      </tr>`).join('');

  renderPagination('repairHistoryPagination', { page, totalPages, total }, loadRepairHistory);
}

// Load stat cards — single fetch for counts
async function loadRepairStats() {
  const res = await API.getStats();
  if (!res?.ok) return;
  const r = res.data.repairs;
  animateCount(document.getElementById('stat-pending'),       r.pending);
  animateCount(document.getElementById('stat-fixed'),         r.fixed);
  animateCount(document.getElementById('stat-unserviceable'), r.unserviceable);
  animateCount(document.getElementById('stat-released'),      r.released);
}

// Called when navigating to repairs tab
function loadRepairLogs() {
  loadRepairStats();
  switchRepairSubTab('pending');
}

// ── Subtab switcher ───────────────────────────────────────────────────────────
function switchRepairSubTab(name) {
  document.querySelectorAll('#tab-repairLogs .subtab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subtab === name);
  });
  document.querySelectorAll('#tab-repairLogs .subtab-content').forEach(el => {
    el.classList.toggle('active', el.id === `repair-subtab-${name}`);
  });

  if (name === 'pending') loadRepairPending(repairPages.pending);
  if (name === 'ready')   loadRepairReady(repairPages.ready);
  if (name === 'history') loadRepairHistory(repairPages.history);
}

// ── Detail modal ──────────────────────────────────────────────────────────────
function openRepairDetail(id) {
  const r = _repairHistoryCache.find(x => x.id === id);
  if (!r) return;
  document.getElementById('rdm-title').textContent = `Repair #${r.id} — ${r.item_name}`;
  document.getElementById('rdm-badge').innerHTML = repairBadges(r.status, r.repair_condition);
  document.getElementById('rdm-body').innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">Customer</div>
      <div class="detail-grid-2">
        <div class="detail-field"><span class="detail-label">Name</span><span class="detail-value">${esc(r.customer_name)}</span></div>
        <div class="detail-field"><span class="detail-label">Office</span><span class="detail-value">${esc(r.office)}</span></div>
        <div class="detail-field detail-span-2"><span class="detail-label">Contact</span><span class="detail-value">${r.contact_number || '<span style="color:var(--muted);">Not provided</span>'}</span></div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Item</div>
      <div class="detail-grid-2">
        <div class="detail-field"><span class="detail-label">Item Name</span><span class="detail-value">${esc(r.item_name)}</span></div>
        <div class="detail-field"><span class="detail-label">Specs</span><span class="detail-value mono">${esc(r.serial_specs || '—')}</span></div>
        <div class="detail-field"><span class="detail-label">Quantity</span><span class="detail-value">${r.quantity}</span></div>
        <div class="detail-field"><span class="detail-label">Date Received</span><span class="detail-value mono">${fmtDate(r.date_received)}</span></div>
        <div class="detail-field detail-span-2"><span class="detail-label">Problem</span><span class="detail-value long">${esc(r.problem_description)}</span></div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Repair</div>
      <div class="detail-grid-2">
        <div class="detail-field"><span class="detail-label">Received By</span><span class="detail-value">${esc(r.received_by)}</span></div>
        <div class="detail-field"><span class="detail-label">Repaired By</span><span class="detail-value">${esc(r.repaired_by || '—')}</span></div>
        <div class="detail-field"><span class="detail-label">Condition</span><span class="detail-value">${r.repair_condition ? badge(r.repair_condition) : '—'}</span></div>
        ${r.repair_comment ? `<div class="detail-field detail-span-2"><span class="detail-label">Notes</span><span class="detail-value long">${esc(r.repair_comment)}</span></div>` : ''}
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Release</div>
      <div class="detail-grid-2">
        <div class="detail-field"><span class="detail-label">Claimed By</span><span class="detail-value">${esc(r.claimed_by || '—')}</span></div>
        <div class="detail-field"><span class="detail-label">Released By</span><span class="detail-value">${esc(r.released_by || '—')}</span></div>
        <div class="detail-field"><span class="detail-label">Date Claimed</span><span class="detail-value mono">${fmtDate(r.date_claimed)}</span></div>
      </div>
    </div>`;
  openModal('repairDetailModal');
}

// ── Update status modal ───────────────────────────────────────────────────────
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
  const id               = document.getElementById('updateRepairId').value;
  const repair_condition = document.getElementById('updateStatus').value;
  const repair_comment   = document.getElementById('repairComment').value.trim();
  const repaired_by      = resolveSelectValue(
    document.getElementById('updateRepairedBySelect'), 'updateRepairedByOjt', '', 'updateRepairedByOjt'
  );
  if (!repaired_by) { showAlert('updateStatusAlert', 'Please select or enter who repaired the item.'); return; }

  const res = await API.updateRepairCondition(id, { repair_condition, repaired_by, repair_comment });
  if (!res) return;
  if (res.ok) { closeModal('updateStatusModal'); loadRepairPending(repairPages.pending); loadRepairReady(1); }
  else showAlert('updateStatusAlert', res.data.message || 'Failed to update.');
}

// ── Release modal ─────────────────────────────────────────────────────────────
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
  const id           = document.getElementById('releaseRepairId').value;
  const claimed_by   = document.getElementById('claimedBy').value.trim();
  const date_claimed = document.getElementById('dateClaimed').value;
  const released_by  = resolveSelectValue(
    document.getElementById('releaseReleasedBySelect'), 'releaseReleasedByOjt', '', 'releaseReleasedByOjt'
  );
  if (!claimed_by)  { showAlert('releaseAlert', 'Please enter who is claiming the item.'); return; }
  if (!released_by) { showAlert('releaseAlert', 'Please select who is releasing the item.'); return; }

  const res = await API.releaseRepair(id, { claimed_by, date_claimed, released_by });
  if (!res) return;
  if (res.ok) { closeModal('releaseModal'); loadRepairPending(repairPages.pending); loadRepairReady(1); }
  else showAlert('releaseAlert', res.data.message || 'Failed to release.');
}

// ── New repair form submit ────────────────────────────────────────────────────
document.getElementById('newRepairForm')?.addEventListener('submit', async (e) => {
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
    contact_number:      f.elements['contact_number'].value.trim(),
  };

  if (!body.customer_name)       { showAlert('newRepairAlert', 'Customer name is required.'); return; }
  if (!body.office)              { showAlert('newRepairAlert', 'Please select or enter an office.'); return; }
  if (!body.item_name)           { showAlert('newRepairAlert', 'Item name is required.'); return; }
  if (!body.date_received)       { showAlert('newRepairAlert', 'Date received is required.'); return; }
  if (!body.received_by)         { showAlert('newRepairAlert', 'Please select who received the item.'); return; }
  if (!body.problem_description) { showAlert('newRepairAlert', 'Problem description is required.'); return; }

  const res = await API.createRepair(body);
  if (!res) return;
  if (res.ok) {
    e.target.reset();
    document.getElementById('repairDateInput').value = today();
    document.getElementById('repairOfficeOther').style.display   = 'none';
    document.getElementById('repairReceivedByOjt').style.display = 'none';
    closeModal('newRepairModal');
    loadRepairPending(1);
    loadRepairStats();
  } else showAlert('newRepairAlert', res.data.message || 'Failed to create entry.');
});

// Simple HTML escape to prevent XSS in table cells
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
