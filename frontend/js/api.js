// ── API module — all fetch calls go through apiFetch ─────────────────────────

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

  // Auto-redirect on expired token
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = 'index.html';
    return null;
  }
  return { ok: res.ok, data, status: res.status };
}

// Build query string helper
const qs = (params) => {
  const p = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return p.length ? '?' + p.map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&') : '';
};

const API = {
  // Lookups
  getOffices:   () => apiFetch('/offices'),
  getEmployees: () => apiFetch('/employees'),

  // Dashboard stats (single endpoint)
  getStats: () => apiFetch('/stats'),

  // Repairs — paginated; pass { status, page, limit }
  getRepairs:            (params = {}) => apiFetch('/repairs' + qs(params)),
  createRepair:          (body)        => apiFetch('/repairs', 'POST', body),
  updateRepairCondition: (id, body)    => apiFetch(`/repairs/${id}/condition`, 'PATCH', body),
  releaseRepair:         (id, body)    => apiFetch(`/repairs/${id}/release`, 'PATCH', body),
  deleteRepair:          (id, pw)      => apiFetch(`/repairs/${id}`, 'DELETE', { admin_password: pw }),

  // Borrows — paginated; pass { status, page, limit }
  getBorrowed:  (params = {}) => apiFetch('/borrowed' + qs(params)),
  createBorrow: (body)        => apiFetch('/borrowed', 'POST', body),
  returnBorrow: (id, body)    => apiFetch(`/borrowed/${id}/return`, 'PATCH', body),
  deleteBorrow: (id, pw)      => apiFetch(`/borrowed/${id}`, 'DELETE', { admin_password: pw }),

  // Reservations — paginated; pass { status, page, limit }
  getReservations:   (params = {}) => apiFetch('/reservations' + qs(params)),
  createReservation: (body)        => apiFetch('/reservations', 'POST', body),
  returnReservation: (id, body)    => apiFetch(`/reservations/${id}/return`, 'PATCH', body),
  deleteReservation: (id, pw)      => apiFetch(`/reservations/${id}`, 'DELETE', { admin_password: pw }),

  // Tech4Ed — paginated; pass { type, active, page, limit }
  getTech4Ed:         (params = {}) => apiFetch('/tech4ed' + qs(params)),
  getActiveSessions:  ()            => apiFetch('/tech4ed/active'),
  createTech4Ed:      (body)        => apiFetch('/tech4ed', 'POST', body),
  createTech4EdEntry: (body)        => apiFetch('/tech4ed/entry', 'POST', body),
  timeoutTech4Ed:     (id)          => apiFetch(`/tech4ed/${id}/timeout`, 'PATCH'),
};
