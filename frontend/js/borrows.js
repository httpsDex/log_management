// ─── Borrows Module ──────────────────────────────────────────────────────────

async function loadBorrowLogs() {
  const res = await API.getBorrowed();
  if (!res?.ok) return;
  const all = res.data;

  animateCount(document.getElementById('stat-borrow-pending'),  all.filter(b => b.status === 'Pending').length);
  animateCount(document.getElementById('stat-borrow-returned'), all.filter(b => b.status === 'Returned').length);

  const pending = all.filter(b => b.status === 'Pending');
  document.getElementById('pendingBorrowBody').innerHTML = pending.length === 0
    ? emptyState('No pending borrowed items', 9)
    : pending.map(b => `<tr>
        <td class="td-mono">#${b.id}</td>
        <td class="td-name">${b.borrower_name}</td>
        <td>${b.office}</td>
        <td>${b.item_borrowed}</td>
        <td>${b.quantity}</td>
        <td>${b.released_by}</td>
        <td class="td-mono">${fmtDate(b.date_borrowed)}</td>
        <td>${badge(b.status)}</td>
        <td><button class="btn btn-success btn-sm" onclick="openReturn(${b.id})">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
          Return
        </button></td>
      </tr>`).join('');
}

// Store fetched records for detail lookup without re-fetching
let _returnHistoryCache = [];

async function loadReturnHistory() {
  const res = await API.getBorrowed();
  if (!res?.ok) return;
  _returnHistoryCache = res.data.filter(b => b.status === 'Returned');
  document.getElementById('returnHistoryBody').innerHTML = _returnHistoryCache.length === 0
    ? emptyState('No returned items yet', 11)
    : _returnHistoryCache.map(b => `<tr>
        <td class="td-mono">#${b.id}</td>
        <td class="td-name">${b.borrower_name}</td>
        <td>${b.office}</td>
        <td>${b.item_borrowed}</td>
        <td>${b.quantity}</td>
        <td>${b.returned_by || '—'}</td>
        <td>${b.received_by || '—'}</td>
        <td class="td-mono">${fmtDate(b.return_date)}</td>
        <td class="td-truncate" title="${b.comments || ''}">${b.comments || '—'}</td>
        <td>${badge(b.status)}</td>
        <td>
          <button class="btn btn-info btn-sm" onclick="openReturnDetail(${b.id})">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            View
          </button>
        </td>
      </tr>`).join('');
}

function openReturnDetail(id) {
  const b = _returnHistoryCache.find(x => x.id === id);
  if (!b) return;

  document.getElementById('bdm-title').textContent = `Borrow #${b.id} — ${b.item_borrowed}`;
  document.getElementById('bdm-badge').innerHTML = badge(b.status);

  document.getElementById('bdm-body').innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">Borrower Information</div>
      <div class="detail-grid-2">
        <div class="detail-field">
          <span class="detail-label">Borrower Name</span>
          <span class="detail-value">${b.borrower_name}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Office</span>
          <span class="detail-value">${b.office}</span>
        </div>
        <div class="detail-field detail-span-2">
          <span class="detail-label">Contact Number</span>
          <span class="detail-value">${b.contact_number || '<span style="color:var(--muted);">Not provided</span>'}</span>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Item Details</div>
      <div class="detail-grid-2">
        <div class="detail-field">
          <span class="detail-label">Item Borrowed</span>
          <span class="detail-value">${b.item_borrowed}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Quantity</span>
          <span class="detail-value">${b.quantity}</span>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Borrow Details</div>
      <div class="detail-grid-2">
        <div class="detail-field">
          <span class="detail-label">Released By</span>
          <span class="detail-value">${b.released_by}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Date Borrowed</span>
          <span class="detail-value mono">${fmtDate(b.date_borrowed)}</span>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Return Details</div>
      <div class="detail-grid-2">
        <div class="detail-field">
          <span class="detail-label">Returned By</span>
          <span class="detail-value">${b.returned_by || '—'}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Received By</span>
          <span class="detail-value">${b.received_by || '—'}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Return Date</span>
          <span class="detail-value mono">${fmtDate(b.return_date)}</span>
        </div>
        ${b.comments ? `
        <div class="detail-field detail-span-2">
          <span class="detail-label">Comments</span>
          <span class="detail-value long">${b.comments}</span>
        </div>` : ''}
      </div>
    </div>
  `;

  openModal('returnDetailModal');
}

// ─── New Borrow Form ──────────────────────────────────────────────────────────
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
    borrower_name: f.elements['borrower_name'].value.trim(),
    office,
    item_borrowed: f.elements['item_borrowed'].value.trim(),
    quantity:      f.elements['quantity'].value,
    released_by,
    date_borrowed: f.elements['date_borrowed'].value,
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
    loadBorrowLogs();
  } else showAlert('newBorrowAlert', res.data.message || 'Failed to create entry.');
});

// ─── Return Modal ─────────────────────────────────────────────────────────────
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

  const res = await API.returnBorrow(id, { returned_by, received_by, return_date, comments });
  if (!res) return;
  if (res.ok) { closeModal('returnModal'); loadBorrowLogs(); }
  else showAlert('returnAlert', res.data.message || 'Failed to process return.');
}
