// ── Settings module — password-gated offices & employees CRUD ─────────────────

// ── State ─────────────────────────────────────────────────────────────────────
let _settingsDeleteType = null;   // 'office' | 'employee'
let _settingsDeleteId   = null;

// ── Auth gate ─────────────────────────────────────────────────────────────────
function openSettingsWithAuth() {
  document.getElementById('settingsAuthPassword').value = '';
  clearAlert('settingsAuthAlert');
  openModal('settingsAuthModal');
  setTimeout(() => document.getElementById('settingsAuthPassword').focus(), 120);
}

async function submitSettingsAuth() {
  const password = document.getElementById('settingsAuthPassword').value.trim();
  if (!password) { showAlert('settingsAuthAlert', 'Please enter your password.'); return; }

  const res = await API.verifyPassword({ password });
  if (!res) return;
  if (res.ok) {
    closeModal('settingsAuthModal');
    openSettingsModal();
  } else {
    showAlert('settingsAuthAlert', res.data.message || 'Incorrect password.');
  }
}

// ── Main settings modal ───────────────────────────────────────────────────────
function openSettingsModal() {
  switchSettingsTab('offices');
  openModal('settingsModal');
}

function switchSettingsTab(tab) {
  document.querySelectorAll('.settings-tab-btn').forEach((btn, i) => {
    const tabs = ['offices', 'employees'];
    btn.classList.toggle('active', tabs[i] === tab);
  });
  document.getElementById('settings-tab-offices').classList.toggle('active',   tab === 'offices');
  document.getElementById('settings-tab-employees').classList.toggle('active', tab === 'employees');

  if (tab === 'offices')   loadOfficeSettings();
  if (tab === 'employees') loadEmployeeSettings();
}

// ── Offices ───────────────────────────────────────────────────────────────────
async function loadOfficeSettings() {
  const listEl = document.getElementById('officeSettingsList');
  listEl.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:.8rem;padding:20px;">Loading...</div>';

  const res = await API.getOffices();
  if (!res?.ok) {
    listEl.innerHTML = `<div style="text-align:center;color:var(--danger);font-size:.8rem;padding:20px;">${res?.data?.message || 'Failed to load offices.'}</div>`;
    return;
  }

  const offices = res.data;
  if (!offices.length) {
    listEl.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:.8rem;padding:20px;">No offices yet.</div>';
    return;
  }

  listEl.innerHTML = offices.map(o => `
    <div class="settings-list-item">
      <span class="settings-item-name">${esc(o.name)}</span>
      <div class="settings-item-actions">
        <button class="btn btn-ghost btn-sm" onclick="openEditOffice(${o.id}, '${esc(o.name).replace(/'/g, "\\'")}')">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:13px;height:13px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          Edit
        </button>
        <button class="btn btn-sm" style="background:rgba(239,68,68,0.1);color:#f87171;border:1px solid rgba(239,68,68,0.2);"
          onclick="confirmSettingsDelete('office', ${o.id}, '${esc(o.name).replace(/'/g, "\\'")}')">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:13px;height:13px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          Delete
        </button>
      </div>
    </div>
  `).join('');
}

async function addOffice() {
  const input = document.getElementById('newOfficeName');
  const name  = input.value.trim();
  if (!name) { showAlert('settingsOfficeAlert', 'Office name is required.'); return; }

  const res = await API.createOffice({ name });
  if (!res) return;
  if (res.ok) {
    input.value = '';
    showAlert('settingsOfficeAlert', 'Office added successfully.', 'success');
    loadOfficeSettings();
    loadLookups();
  } else {
    showAlert('settingsOfficeAlert', res.data.message || 'Failed to add office.');
  }
}

function openEditOffice(id, currentName) {
  document.getElementById('editOfficeId').value   = id;
  document.getElementById('editOfficeName').value = currentName;
  clearAlert('editOfficeAlert');
  openModal('editOfficeModal');
  setTimeout(() => document.getElementById('editOfficeName').focus(), 120);
}

async function submitEditOffice() {
  const id   = document.getElementById('editOfficeId').value;
  const name = document.getElementById('editOfficeName').value.trim();
  if (!name) { showAlert('editOfficeAlert', 'Office name is required.'); return; }

  const res = await API.updateOffice(id, { name });
  if (!res) return;
  if (res.ok) {
    closeModal('editOfficeModal');
    loadOfficeSettings();
    loadLookups();
  } else {
    showAlert('editOfficeAlert', res.data.message || 'Failed to update office.');
  }
}

// ── Employees ─────────────────────────────────────────────────────────────────
async function loadEmployeeSettings() {
  const listEl = document.getElementById('employeeSettingsList');
  listEl.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:.8rem;padding:20px;">Loading...</div>';

  const res = await API.getAllEmployees();
  if (!res?.ok) {
    listEl.innerHTML = `<div style="text-align:center;color:var(--danger);font-size:.8rem;padding:20px;">${res?.data?.message || 'Failed to load employees.'}</div>`;
    return;
  }

  const employees = res.data;
  if (!employees.length) {
    listEl.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:.8rem;padding:20px;">No employees yet.</div>';
    return;
  }

  listEl.innerHTML = employees.map(e => `
    <div class="settings-list-item">
      <span class="settings-item-name">
        ${esc(e.full_name)}
        ${e.is_active ? '' : '<span style="font-size:.65rem;color:var(--muted);margin-left:6px;">(inactive)</span>'}
      </span>
      <div class="settings-item-actions">
        <button class="btn btn-ghost btn-sm" onclick="openEditEmployee(${e.id}, '${esc(e.full_name).replace(/'/g, "\\'")}')">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:13px;height:13px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          Edit
        </button>
        <button class="btn btn-ghost btn-sm" onclick="toggleEmployeeActive(${e.id}, ${e.is_active ? 1 : 0})" title="${e.is_active ? 'Deactivate' : 'Activate'}">
          ${e.is_active
            ? '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:13px;height:13px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg> Hide'
            : '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:13px;height:13px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg> Show'}
        </button>
        <button class="btn btn-sm" style="background:rgba(239,68,68,0.1);color:#f87171;border:1px solid rgba(239,68,68,0.2);"
          onclick="confirmSettingsDelete('employee', ${e.id}, '${esc(e.full_name).replace(/'/g, "\\'")}')">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:13px;height:13px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          Delete
        </button>
      </div>
    </div>
  `).join('');
}

async function addEmployee() {
  const input     = document.getElementById('newEmployeeName');
  const full_name = input.value.trim();
  if (!full_name) { showAlert('settingsEmployeeAlert', 'Employee name is required.'); return; }

  const res = await API.createEmployee({ full_name });
  if (!res) return;
  if (res.ok) {
    input.value = '';
    showAlert('settingsEmployeeAlert', 'Employee added successfully.', 'success');
    loadEmployeeSettings();
    loadLookups();
  } else {
    showAlert('settingsEmployeeAlert', res.data.message || 'Failed to add employee.');
  }
}

function openEditEmployee(id, currentName) {
  document.getElementById('editEmployeeId').value   = id;
  document.getElementById('editEmployeeName').value = currentName;
  clearAlert('editEmployeeAlert');
  openModal('editEmployeeModal');
  setTimeout(() => document.getElementById('editEmployeeName').focus(), 120);
}

async function submitEditEmployee() {
  const id        = document.getElementById('editEmployeeId').value;
  const full_name = document.getElementById('editEmployeeName').value.trim();
  if (!full_name) { showAlert('editEmployeeAlert', 'Employee name is required.'); return; }

  const res = await API.updateEmployee(id, { full_name });
  if (!res) return;
  if (res.ok) {
    closeModal('editEmployeeModal');
    loadEmployeeSettings();
    loadLookups();
  } else {
    showAlert('editEmployeeAlert', res.data.message || 'Failed to update employee.');
  }
}

async function toggleEmployeeActive(id, currentActive) {
  const res = await API.updateEmployee(id, { is_active: currentActive ? 0 : 1 });
  if (!res) return;
  if (res.ok) {
    loadEmployeeSettings();
    loadLookups();
  } else {
    alert(res.data.message || 'Failed to update employee.');
  }
}

// ── Delete (password-gated) ───────────────────────────────────────────────────
function confirmSettingsDelete(type, id, label) {
  _settingsDeleteType = type;
  _settingsDeleteId   = id;
  document.getElementById('deleteSettingsLabel').textContent =
    `Delete ${type === 'office' ? 'office' : 'employee'}: "${label}"?`;
  document.getElementById('deleteSettingsPassword').value = '';
  clearAlert('deleteSettingsAlert');
  openModal('deleteSettingsItemModal');
  setTimeout(() => document.getElementById('deleteSettingsPassword').focus(), 120);
}

async function submitSettingsDelete() {
  const admin_password = document.getElementById('deleteSettingsPassword').value.trim();
  if (!admin_password) { showAlert('deleteSettingsAlert', 'Password is required.'); return; }

  const res = _settingsDeleteType === 'office'
    ? await API.deleteOffice(_settingsDeleteId, { admin_password })
    : await API.deleteEmployee(_settingsDeleteId, { admin_password });

  if (!res) return;
  if (res.ok) {
    closeModal('deleteSettingsItemModal');
    if (_settingsDeleteType === 'office')   { loadOfficeSettings();   loadLookups(); }
    if (_settingsDeleteType === 'employee') { loadEmployeeSettings(); loadLookups(); }
  } else {
    showAlert('deleteSettingsAlert', res.data.message || 'Failed to delete.');
  }
}
