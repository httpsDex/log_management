// ─── Dropdowns Module ────────────────────────────────────────────────────────

let gOffices   = [];
let gEmployees = [];

async function loadLookups() {
  const [offRes, empRes] = await Promise.all([API.getOffices(), API.getEmployees()]);
  if (offRes?.ok) gOffices   = offRes.data;
  if (empRes?.ok) gEmployees = empRes.data;
  populateAllDropdowns();
}

function fillOfficeSelect(selectEl) {
  if (!selectEl) return;
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

function fillEmployeeSelect(selectEl) {
  if (!selectEl) return;
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
