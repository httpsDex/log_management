// ── Reservations module — subtabs: Active | History ──────────────────────────

const resPages = { active: 1, history: 1 };
const RES_LIMIT = 15;

let _reservationHistoryCache = [];

// ── Load functions ────────────────────────────────────────────────────────────

async function loadReservationsActive(page = 1) {
  resPages.active = page;
  // status=Active fetches Active + Overdue from backend
  const res = await API.getReservations({ status: 'Active', page, limit: RES_LIMIT });
  if (!res?.ok) return;
  const { data, total, totalPages } = res.data;

  document.getElementById('pendingReservationBody').innerHTML = data.length === 0
    ? emptyState('No active reservations', 10)
    : data.map(r => {
        const isOverdue = r.expected_return_date && new Date(r.expected_return_date) < new Date() && r.status !== 'Returned';
        return `<tr>
          <td class="td-mono">#${r.id}</td>
          <td class="td-name">${esc(r.borrower_name)}</td>
          <td>${esc(r.office)}</td>
          <td>${esc(r.item_name)}</td>
          <td>${r.quantity}</td>
          <td class="td-mono">${fmtDate(r.reservation_date)}</td>
          <td class="td-mono" style="${isOverdue ? 'color:var(--danger);font-weight:600;' : ''}">${fmtDate(r.expected_return_date)}</td>
          <td>${esc(r.released_by)}</td>
          <td>${badge(isOverdue ? 'Overdue' : r.status)}</td>
          <td>
            <button class="btn btn-success btn-sm" onclick="openReservationReturn(${r.id})">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
              Return
            </button>
          </td>
        </tr>`;
      }).join('');

  renderPagination('resPendingPagination', { page, totalPages, total }, loadReservationsActive);
}

async function loadReservationHistory(page = 1) {
  resPages.history = page;
  const res = await API.getReservations({ status: 'Returned', page, limit: RES_LIMIT });
  if (!res?.ok) return;
  const { data, total, totalPages } = res.data;
  _reservationHistoryCache = data;

  document.getElementById('reservationHistoryBody').innerHTML = data.length === 0
    ? emptyState('No returned reservations yet', 12)
    : data.map(r => `<tr>
        <td class="td-mono">#${r.id}</td>
        <td class="td-name">${esc(r.borrower_name)}</td>
        <td>${esc(r.office)}</td>
        <td>${esc(r.item_name)}</td>
        <td>${r.quantity}</td>
        <td class="td-mono">${fmtDate(r.reservation_date)}</td>
        <td class="td-mono">${fmtDate(r.expected_return_date)}</td>
        <td>${esc(r.returned_by || '—')}</td>
        <td>${esc(r.received_by || '—')}</td>
        <td class="td-mono">${fmtDate(r.actual_return_date)}</td>
        <td>${badge(r.status)}</td>
        <td style="display:flex;gap:6px;">
          <button class="btn btn-info btn-sm" onclick="openReservationDetail(${r.id})">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            View
          </button>
          <button class="btn btn-sm" style="background:rgba(239,68,68,0.1);color:#f87171;border:1px solid rgba(239,68,68,0.2);"
            onclick="openDeleteConfirm('reservation', ${r.id}, '${esc(r.borrower_name).replace(/'/g,"\\'")} — ${esc(r.item_name).replace(/'/g,"\\'")}')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            Delete
          </button>
        </td>
      </tr>`).join('');

  renderPagination('resHistoryPagination', { page, totalPages, total }, loadReservationHistory);
}

async function loadReservationStats() {
  const res = await API.getStats();
  if (!res?.ok) return;
  const r = res.data.reservations;
  animateCount(document.getElementById('stat-res-active'),   r.active);
  animateCount(document.getElementById('stat-res-overdue'),  r.overdue);
  animateCount(document.getElementById('stat-res-returned'), r.returned);
  animateCount(document.getElementById('stat-res-total'),    r.total);
}

// Called on tab open
function loadReservations() {
  loadReservationStats();
  switchResSubTab('active');
}

// ── Subtab switcher ───────────────────────────────────────────────────────────
function switchResSubTab(name) {
  document.querySelectorAll('#tab-reservationLogs .subtab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subtab === name);
  });
  document.querySelectorAll('#tab-reservationLogs .subtab-content').forEach(el => {
    el.classList.toggle('active', el.id === `res-subtab-${name}`);
  });

  if (name === 'active')  loadReservationsActive(resPages.active);
  if (name === 'history') loadReservationHistory(resPages.history);
}

// ── Detail modal ──────────────────────────────────────────────────────────────
function openReservationDetail(id) {
  const r = _reservationHistoryCache.find(x => x.id === id);
  if (!r) return;
  document.getElementById('rsdm-title').textContent = `Reservation #${r.id} — ${r.item_name}`;
  document.getElementById('rsdm-badge').innerHTML = badge(r.status);
  document.getElementById('rsdm-body').innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">Borrower</div>
      <div class="detail-grid-2">
        <div class="detail-field"><span class="detail-label">Name</span><span class="detail-value">${esc(r.borrower_name)}</span></div>
        <div class="detail-field"><span class="detail-label">Office</span><span class="detail-value">${esc(r.office)}</span></div>
        <div class="detail-field detail-span-2"><span class="detail-label">Contact</span><span class="detail-value">${r.contact_number || '<span style="color:var(--muted);">Not provided</span>'}</span></div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Item</div>
      <div class="detail-grid-2">
        <div class="detail-field"><span class="detail-label">Item</span><span class="detail-value">${esc(r.item_name)}</span></div>
        <div class="detail-field"><span class="detail-label">Quantity</span><span class="detail-value">${r.quantity}</span></div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Schedule</div>
      <div class="detail-grid-2">
        <div class="detail-field"><span class="detail-label">Reserved</span><span class="detail-value mono">${fmtDate(r.reservation_date)}</span></div>
        <div class="detail-field"><span class="detail-label">Expected Return</span><span class="detail-value mono">${fmtDate(r.expected_return_date)}</span></div>
        <div class="detail-field"><span class="detail-label">Released By</span><span class="detail-value">${esc(r.released_by)}</span></div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Return Details</div>
      <div class="detail-grid-2">
        <div class="detail-field"><span class="detail-label">Returned By</span><span class="detail-value">${esc(r.returned_by || '—')}</span></div>
        <div class="detail-field"><span class="detail-label">Received By</span><span class="detail-value">${esc(r.received_by || '—')}</span></div>
        <div class="detail-field"><span class="detail-label">Actual Return</span><span class="detail-value mono">${fmtDate(r.actual_return_date)}</span></div>
        ${r.comments ? `<div class="detail-field detail-span-2"><span class="detail-label">Comments</span><span class="detail-value long">${esc(r.comments)}</span></div>` : ''}
      </div>
    </div>`;
  openModal('reservationDetailModal');
}

// ── New reservation form ──────────────────────────────────────────────────────
document.getElementById('newReservationForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert('newReservationAlert');
  const f = e.target;

  const office = resolveSelectValue(
    document.getElementById('resOfficeSelect'), 'resOfficeOther', '', 'resOfficeOther'
  );
  const released_by = resolveSelectValue(
    document.getElementById('resReleasedBySelect'), 'resReleasedByOjt', '', 'resReleasedByOjt'
  );

  const body = {
    borrower_name:        f.elements['borrower_name'].value.trim(),
    contact_number:       f.elements['contact_number'].value.trim(),
    office,
    item_name:            f.elements['item_name'].value.trim(),
    quantity:             f.elements['quantity'].value,
    reservation_date:     f.elements['reservation_date'].value,
    expected_return_date: f.elements['expected_return_date'].value,
    released_by,
  };

  if (!body.borrower_name)        { showAlert('newReservationAlert', 'Borrower name is required.'); return; }
  if (!body.office)               { showAlert('newReservationAlert', 'Please select or enter an office.'); return; }
  if (!body.item_name)            { showAlert('newReservationAlert', 'Item name is required.'); return; }
  if (!body.reservation_date)     { showAlert('newReservationAlert', 'Reservation date is required.'); return; }
  if (!body.expected_return_date) { showAlert('newReservationAlert', 'Expected return date is required.'); return; }
  if (body.expected_return_date < body.reservation_date) { showAlert('newReservationAlert', 'Expected return must be after reservation date.'); return; }
  if (!body.released_by)          { showAlert('newReservationAlert', 'Please select who released the item.'); return; }

  const res = await API.createReservation(body);
  if (!res) return;
  if (res.ok) {
    e.target.reset();
    document.getElementById('resDateInput').value = today();
    document.getElementById('resOfficeOther').style.display   = 'none';
    document.getElementById('resReleasedByOjt').style.display = 'none';
    closeModal('newReservationModal');
    loadReservationsActive(1);
    loadReservationStats();
  } else showAlert('newReservationAlert', res.data.message || 'Failed to create reservation.');
});

// ── Return modal ──────────────────────────────────────────────────────────────
function openReservationReturn(id) {
  document.getElementById('resReturnId').value = id;
  document.getElementById('resReturnedBy').value = '';
  document.getElementById('resActualReturnDate').value = today();
  document.getElementById('resReturnReceivedBySelect').value = '';
  document.getElementById('resReturnReceivedByOjt').style.display = 'none';
  document.getElementById('resReturnReceivedByOjt').value = '';
  document.getElementById('resReturnComments').value = '';
  clearAlert('resReturnAlert');
  openModal('reservationReturnModal');
}

async function submitReservationReturn() {
  const id               = document.getElementById('resReturnId').value;
  const returned_by      = document.getElementById('resReturnedBy').value.trim();
  const actual_return_date = document.getElementById('resActualReturnDate').value;
  const received_by      = resolveSelectValue(
    document.getElementById('resReturnReceivedBySelect'), 'resReturnReceivedByOjt', '', 'resReturnReceivedByOjt'
  );
  const comments = document.getElementById('resReturnComments').value.trim();

  if (!returned_by) { showAlert('resReturnAlert', 'Please enter who returned the item.'); return; }
  if (!received_by) { showAlert('resReturnAlert', 'Please select who received the item.'); return; }

  const res = await API.returnReservation(id, { returned_by, received_by, actual_return_date, comments });
  if (!res) return;
  if (res.ok) {
    closeModal('reservationReturnModal');
    loadReservationsActive(resPages.active);
    loadReservationStats();
  }
  else showAlert('resReturnAlert', res.data.message || 'Failed to process return.');
}
