// ── Reservations module — dashboard monitor & return-as-borrow flow ───────────

// ── Load reservation monitor (called from dashboard-tab.js) ───────────────────
async function loadReservationMonitor() {
  const section = document.getElementById('reservation-monitor-section');
  if (!section) return;

  const card = section.querySelector('.card');

  const headerHTML = `
    <div class="card-header">
      <span class="card-title">📅 Active Reservations Monitor</span>
      <button class="btn btn-primary btn-sm" onclick="openNewReservation()">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Add Reservation
      </button>
    </div>
  `;

  try {
    const res = await API.getReservations({ status: 'Active', limit: 100 });
    if (!res?.ok) {
      card.innerHTML = headerHTML + `<div style="padding:32px 20px;text-align:center;color:var(--danger);font-size:.8rem;">Failed to load reservations.</div>`;
      return;
    }

    const rows = res.data.data || [];

    if (!rows.length) {
      card.innerHTML = headerHTML + `<div style="padding:32px 20px;text-align:center;color:var(--muted);font-size:.8rem;">No active reservations.</div>`;
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const tableRows = rows.map(r => {
      const isOverdue   = r.status === 'Overdue' || r.expected_return_date < todayStr;
      const statusBadge = isOverdue
        ? `<span class="badge badge-overdue">Overdue</span>`
        : `<span class="badge badge-active">Active</span>`;
      return `
        <tr>
          <td class="td-mono">#${r.id}</td>
          <td class="td-name">${esc(r.borrower_name)}</td>
          <td>${esc(r.office)}</td>
          <td>${esc(r.item_name)}</td>
          <td>${r.quantity}</td>
          <td class="td-mono">${fmtDate(r.reservation_date)}</td>
          <td class="td-mono">${fmtDate(r.expected_return_date)}</td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn btn-success btn-sm"
              onclick="openReservationReturn(${r.id}, '${esc(r.borrower_name).replace(/'/g,"\\'")}', '${esc(r.item_name).replace(/'/g,"\\'")}', '${esc(r.office).replace(/'/g,"\\'")}')">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:12px;height:12px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
              Return
            </button>
          </td>
        </tr>
      `;
    }).join('');

    card.innerHTML = headerHTML + `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th><th>Borrower</th><th>Office</th><th>Item</th><th>Qty</th>
              <th>Reserved</th><th>Expected Return</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    `;
  } catch (err) {
    card.innerHTML = headerHTML + `<div style="padding:32px 20px;text-align:center;color:var(--danger);font-size:.8rem;">Failed to load reservations.</div>`;
  }
}

// ── New Reservation modal (from dashboard) ────────────────────────────────────
function openNewReservation() {
  clearAlert('newReservationAlert');
  document.getElementById('newReservationForm').reset();
  document.getElementById('resDateInput').value           = today();
  document.getElementById('resExpectedReturnInput').value = today();
  fillOfficeSelect(document.getElementById('resOfficeSelect'));
  fillEmployeeSelect(document.getElementById('resReleasedBySelect'));
  document.getElementById('resOfficeOther').style.display   = 'none';
  document.getElementById('resReleasedByOjt').style.display = 'none';
  openModal('newReservationModal');
}

document.getElementById('newReservationForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert('newReservationAlert');
  const f = e.target;

  const office      = resolveSelectValue(document.getElementById('resOfficeSelect'),      'resOfficeOther',   '', 'resOfficeOther');
  const released_by = resolveSelectValue(document.getElementById('resReleasedBySelect'), 'resReleasedByOjt', '', 'resReleasedByOjt');

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

  if (!body.borrower_name)    { showAlert('newReservationAlert', 'Borrower name is required.'); return; }
  if (!body.office)           { showAlert('newReservationAlert', 'Please select or enter an office.'); return; }
  if (!body.item_name)        { showAlert('newReservationAlert', 'Item name is required.'); return; }
  if (!body.reservation_date) { showAlert('newReservationAlert', 'Reservation date is required.'); return; }
  if (!body.released_by)      { showAlert('newReservationAlert', 'Please select who released the item.'); return; }

  const res = await API.createReservation(body);
  if (!res) return;
  if (res.ok) {
    e.target.reset();
    document.getElementById('resDateInput').value           = today();
    document.getElementById('resExpectedReturnInput').value = today();
    document.getElementById('resOfficeOther').style.display   = 'none';
    document.getElementById('resReleasedByOjt').style.display = 'none';
    closeModal('newReservationModal');
    loadReservationMonitor();
    loadDashboard();
  } else {
    showAlert('newReservationAlert', res.data.message || 'Failed to create reservation.');
  }
});

// ── Reservation Return → Borrow History ──────────────────────────────────────
function openReservationReturn(id, borrowerName, itemName, office) {
  document.getElementById('resReturnId').value         = id;
  document.getElementById('resReturnedBy').value       = borrowerName;
  document.getElementById('resActualReturnDate').value = today();
  document.getElementById('resReturnComments').value   = '';
  clearAlert('resReturnAlert');

  document.getElementById('resReturnBannerTitle').textContent = `${itemName} — ${office}`;
  document.getElementById('resReturnBannerSub').textContent   = `Borrower: ${borrowerName}`;

  fillEmployeeSelect(document.getElementById('resReturnReceivedBySelect'));
  document.getElementById('resReturnReceivedByOjt').style.display = 'none';
  document.getElementById('resReturnReceivedByOjt').value = '';

  openModal('reservationReturnModal');
}

async function submitReservationReturn() {
  const id          = document.getElementById('resReturnId').value;
  const returned_by = document.getElementById('resReturnedBy').value.trim();
  const return_date = document.getElementById('resActualReturnDate').value;
  const comments    = document.getElementById('resReturnComments').value.trim();
  const received_by = resolveSelectValue(
    document.getElementById('resReturnReceivedBySelect'), 'resReturnReceivedByOjt', '', 'resReturnReceivedByOjt'
  );

  if (!returned_by) { showAlert('resReturnAlert', 'Please enter who returned the item.'); return; }
  if (!received_by) { showAlert('resReturnAlert', 'Please select who received the item.'); return; }

  const res = await API.returnReservationAsBorrow(id, { returned_by, received_by, return_date, comments });
  if (!res) return;
  if (res.ok) {
    closeModal('reservationReturnModal');
    showToast('Item returned and logged in Borrow History ✓', 'success');
    loadReservationMonitor();
    loadDashboard();
  } else {
    showAlert('resReturnAlert', res.data.message || 'Failed to process return.');
  }
}

// ── Toast helper ──────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:${type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'};
    border:1px solid ${type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'};
    color:${type === 'success' ? '#34d399' : '#f87171'};
    padding:12px 18px;border-radius:10px;font-size:.8rem;font-weight:600;
    box-shadow:0 4px 20px rgba(0,0,0,0.3);
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}
