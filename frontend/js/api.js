// ─── API Module ──────────────────────────────────────────────────────────────

const getToken = () => localStorage.getItem('token');

async function apiFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = 'index.html';
    return null;
  }
  return { ok: res.ok, data, status: res.status };
}

const API = {
  getOffices:   () => apiFetch('/offices'),
  getEmployees: () => apiFetch('/employees'),
  getRepairs:   () => apiFetch('/repairs'),
  getBorrowed:  () => apiFetch('/borrowed'),

  createRepair:        (body) => apiFetch('/repairs', 'POST', body),
  updateRepairCondition: (id, body) => apiFetch(`/repairs/${id}/condition`, 'PATCH', body),
  releaseRepair:       (id, body) => apiFetch(`/repairs/${id}/release`, 'PATCH', body),
  deleteRepair:        (id, admin_password) => apiFetch(`/repairs/${id}`, 'DELETE', { admin_password }),

  createBorrow: (body) => apiFetch('/borrowed', 'POST', body),
  returnBorrow: (id, body) => apiFetch(`/borrowed/${id}/return`, 'PATCH', body),
  deleteBorrow: (id, admin_password) => apiFetch(`/borrowed/${id}`, 'DELETE', { admin_password }),

  getReservations:   () => apiFetch('/reservations'),
  createReservation: (body) => apiFetch('/reservations', 'POST', body),
  returnReservation: (id, body) => apiFetch(`/reservations/${id}/return`, 'PATCH', body),
  deleteReservation: (id, admin_password) => apiFetch(`/reservations/${id}`, 'DELETE', { admin_password }),

  getTech4Ed:    () => apiFetch('/tech4ed'),
  createTech4Ed: (body) => apiFetch('/tech4ed', 'POST', body),
  timeoutTech4Ed:(id) => apiFetch(`/tech4ed/${id}/timeout`, 'PATCH'),
};
