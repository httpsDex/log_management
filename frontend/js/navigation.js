// ─── Navigation Module ───────────────────────────────────────────────────────

const tabMeta = {
  dashboard:          ['Dashboard',            'Overview of all IT office activities'],
  repairLogs:         ['Repair Logs',          'Manage and track all repair requests'],
  repairHistory:      ['Repair History',       'All released repair records'],
  borrowLogs:         ['Borrow Logs',          'Manage borrowed items'],
  returnHistory:      ['Returned Items',       'All returned item records'],
  reservationLogs:    ['Reservations',         'Manage item reservations with date ranges'],
  reservationHistory: ['Reservation History',  'All returned reservation records'],
  tech4ed:            ['Tech4Ed Sessions',     'Computer use time-in / time-out tracking'],
};

function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  document.getElementById(`tab-${name}`)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.dataset.tab === name) el.classList.add('active');
  });

  const [title, sub] = tabMeta[name] || ['', ''];
  const titleEl  = document.getElementById('pageTitle');
  const subEl    = document.getElementById('pageSubtitle');
  const mobileEl = document.getElementById('mobileTitleBar');

  if (titleEl)  titleEl.textContent  = title;
  if (subEl)    subEl.textContent    = sub;
  if (mobileEl) mobileEl.textContent = title;

  closeSidebar();

  if (name === 'dashboard')          loadDashboard();
  if (name === 'repairLogs')         loadRepairLogs();
  if (name === 'repairHistory')      loadRepairHistory();
  if (name === 'borrowLogs')         loadBorrowLogs();
  if (name === 'returnHistory')      loadReturnHistory();
  if (name === 'reservationLogs')    loadReservations();
  if (name === 'reservationHistory') loadReservationHistory();
  if (name === 'tech4ed')            loadTech4Ed();
}

// Sidebar open/close (mobile)
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarBackdrop').classList.add('visible');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('visible');
  document.body.style.overflow = '';
}
