// ── Borrows module — subtabs: Pending | Returned History ─────────────────────

const borrowPages = { pending: 1, history: 1 };
const BORROW_LIMIT = 15;

let _returnHistoryCache = [];

// ── Load functions ────────────────────────────────────────────────────────────

async function loadBorrowPending(page = 1) {
  borrowPages.pending = page;
  const res = await API.getBorrowed({ status: 'Pending', page, limit: BORROW_LIMIT });
  if (!res?.ok) return;
  const { data, total, totalPages } = res.data;

  document.getElementById('pendingBorrowBody').innerHTML = data.length === 0
    ? emptyState('No pending borrowed items', 9)
    : data.map(b => `<tr>
        <td class="td-mono">#${b.id}</td>
        <td class="td-name">${esc(b.borrower_name)}</td>
        <td>${esc(b.office)}</td>
        <td>${esc(b.item_borrowed)}</td>
        <td>${b.quantity}</td>
        <td>${esc(b.released_by)}</td>
        <td class="td-mono">${fmtDate(b.date_borrowed)}</td>
        <td>${badge(b.status)}</td>
        <td>
          <button class="btn btn-success btn-sm" onclick="openReturn(${b.id})">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
            Return
          </button>
        </td>
      </tr>`).join('');

  renderPagination('borrowPendingPagination', { page, totalPages, total, limit: BORROW_LIMIT }, loadBorrowPending);
}

async function loadReturnHistory(page = 1) {
  borrowPages.history = page;
  const res = await API.getBorrowed({ status: 'Returned', page, limit: BORROW_LIMIT });
  if (!res?.ok) return;
  const { data, total, totalPages } = res.data;
  _returnHistoryCache = data;

  document.getElementById('returnHistoryBody').innerHTML = data.length === 0
    ? emptyState('No returned items yet', 11)
    : data.map(b => `<tr>
        <td class="td-mono">#${b.id}</td>
        <td class="td-name">${esc(b.borrower_name)}</td>
        <td>${esc(b.office)}</td>
        <td>${esc(b.item_borrowed)}</td>
        <td>${b.quantity}</td>
        <td>${esc(b.returned_by || '—')}</td>
        <td>${esc(b.received_by || '—')}</td>
        <td class="td-mono">${fmtDate(b.return_date)}</td>
        <td class="td-truncate" title="${esc(b.comments || '')}">${esc(b.comments || '—')}</td>
        <td>${badge(b.status)}</td>
        <td style="display:flex;gap:6px;">
          <button class="btn btn-info btn-sm" onclick="openReturnDetail(${b.id})">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            View
          </button>
          <button class="btn btn-sm" style="background:rgba(239,68,68,0.1);color:#f87171;border:1px solid rgba(239,68,68,0.2);"
            onclick="openDeleteConfirm('borrow', ${b.id}, '${esc(b.borrower_name).replace(/'/g,"\\'")} — ${esc(b.item_borrowed).replace(/'/g,"\\'")}')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            Delete
          </button>
        </td>
      </tr>`).join('');

  renderPagination('borrowHistoryPagination', { page, totalPages, total, limit: BORROW_LIMIT }, loadReturnHistory);
}

async function loadBorrowStats() {
  const res = await API.getStats();
  if (!res?.ok) return;
  const b = res.data.borrows;
  animateCount(document.getElementById('stat-borrow-pending'),  b.pending);
  animateCount(document.getElementById('stat-borrow-returned'), b.returned);
}

function loadBorrowLogs() {
  loadBorrowStats();
  switchBorrowSubTab('pending');
}

// ── Subtab switcher ───────────────────────────────────────────────────────────
function switchBorrowSubTab(name) {
  document.querySelectorAll('#tab-borrowLogs .subtab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subtab === name);
  });
  document.querySelectorAll('#tab-borrowLogs .subtab-content').forEach(el => {
    el.classList.toggle('active', el.id === `borrow-subtab-${name}`);
  });

  if (name === 'pending') loadBorrowPending(borrowPages.pending);
  if (name === 'history') loadReturnHistory(borrowPages.history);
}

// ── Detail modal ──────────────────────────────────────────────────────────────
function openReturnDetail(id) {
  const b = _returnHistoryCache.find(x => x.id === id);
  if (!b) return;
  document.getElementById('bdm-title').textContent = `Borrow #${b.id} — ${b.item_borrowed}`;
  document.getElementById('bdm-badge').innerHTML = badge(b.status);
  document.getElementById('bdm-body').innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">Borrower</div>
      <div class="detail-grid-2">
        <div class="detail-field"><span class="detail-label">Name</span><span class="detail-value">${esc(b.borrower_name)}</span></div>
        <div class="detail-field"><span class="detail-label">Office</span><span class="detail-value">${esc(b.office)}</span></div>
        <div class="detail-field detail-span-2"><span class="detail-label">Contact</span><span class="detail-value">${b.contact_number || '<span style="color:var(--muted);">Not provided</span>'}</span></div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Item</div>
      <div class="detail-grid-2">
        <div class="detail-field"><span class="detail-label">Item</span><span class="detail-value">${esc(b.item_borrowed)}</span></div>
        <div class="detail-field"><span class="detail-label">Quantity</span><span class="detail-value">${b.quantity}</span></div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Borrow Details</div>
      <div class="detail-grid-2">
        <div class="detail-field"><span class="detail-label">Released By</span><span class="detail-value">${esc(b.released_by)}</span></div>
        <div class="detail-field"><span class="detail-label">Date Borrowed</span><span class="detail-value mono">${fmtDate(b.date_borrowed)}</span></div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Return Details</div>
      <div class="detail-grid-2">
        <div class="detail-field"><span class="detail-label">Returned By</span><span class="detail-value">${esc(b.returned_by || '—')}</span></div>
        <div class="detail-field"><span class="detail-label">Received By</span><span class="detail-value">${esc(b.received_by || '—')}</span></div>
        <div class="detail-field"><span class="detail-label">Return Date</span><span class="detail-value mono">${fmtDate(b.return_date)}</span></div>
        ${b.comments ? `<div class="detail-field detail-span-2"><span class="detail-label">Comments</span><span class="detail-value long">${esc(b.comments)}</span></div>` : ''}
      </div>
    </div>`;
  openModal('returnDetailModal');
}

// ── New borrow form ───────────────────────────────────────────────────────────
document.getElementById('newBorrowForm')?.addEventListener('submit', async (e) => {
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
    borrower_name:  f.elements['borrower_name'].value.trim(),
    office,
    item_borrowed:  f.elements['item_borrowed'].value.trim(),
    quantity:       f.elements['quantity'].value,
    released_by,
    date_borrowed:  f.elements['date_borrowed'].value,
    contact_number: f.elements['contact_number'].value.trim(),
  };

  if (!body.borrower_name) { showAlert('newBorrowAlert', 'Borrower name is required.'); return; }
  if (!body.office)        { showAlert('newBorrowAlert', 'Please select or enter an office.'); return; }
  if (!body.item_borrowed) { showAlert('newBorrowAlert', 'Item name is required.'); return; }
  if (!body.date_borrowed) { showAlert('newBorrowAlert', 'Date borrowed is required.'); return; }
  if (!body.released_by)   { showAlert('newBorrowAlert', 'Please select who released the item.'); return; }

  const res = await API.createBorrow(body);
  if (!res) return;
  if (res.ok) {
    e.target.reset();
    document.getElementById('borrowDateInput').value = today();
    document.getElementById('borrowOfficeOther').style.display   = 'none';
    document.getElementById('borrowReleasedByOjt').style.display = 'none';
    closeModal('newBorrowModal');
    loadBorrowPending(1);
    loadBorrowStats();
  } else showAlert('newBorrowAlert', res.data.message || 'Failed to create entry.');
});

// ── Return modal ──────────────────────────────────────────────────────────────
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
  const comments = document.getElementById('returnComments').value.trim();

  if (!returned_by) { showAlert('returnAlert', 'Please enter who returned the item.'); return; }
  if (!received_by) { showAlert('returnAlert', 'Please select who received the item.'); return; }

  const res = await API.returnBorrow(id, { returned_by, received_by, return_date, comments });
  if (!res) return;
  if (res.ok) {
    closeModal('returnModal');
    loadBorrowPending(borrowPages.pending);
    loadBorrowStats();
  } else showAlert('returnAlert', res.data.message || 'Failed to process return.');
}
