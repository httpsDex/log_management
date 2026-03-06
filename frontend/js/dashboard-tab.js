// ── Dashboard tab — stats, charts, activity feed ──────────────────────────────

let _monthlyChart   = null;
let _borrowPieChart = null;

async function loadDashboard() {
  try {
    const res = await API.getStats();
    if (!res?.ok) return;
    const s = res.data;

    // ── Stat cards ──────────────────────────────────────────────────────────
    setText('ds-total-repairs',   s.repairs.total       ?? 0);
    setText('ds-pending-repairs', s.repairs.pending     ?? 0);
    setText('ds-total-borrowed',  s.borrows.total       ?? 0);
    setText('ds-pending-borrows', s.borrows.pending     ?? 0);
    setText('ds-released',        s.repairs.released    ?? 0);
    setText('ds-returned',        s.borrows.returned    ?? 0);
    setText('ds-reservations',    s.reservations?.active ?? 0);
    setText('ds-tech4ed',         s.tech4ed?.today      ?? 0);

    // ── Repair status donut ─────────────────────────────────────────────────
    renderDonut(s.repairs);

    // ── Office bars ─────────────────────────────────────────────────────────
    renderOfficeBars(s.officeData || []);

    // ── Repair type bars ────────────────────────────────────────────────────
    renderRepairTypeBars(s.repairs);

    // ── Monthly trend chart ─────────────────────────────────────────────────
    renderMonthlyChart(s.monthly || {});

    // ── Borrow status pie ───────────────────────────────────────────────────
    renderBorrowPie(s.borrows);

    // ── Activity feed ───────────────────────────────────────────────────────
    renderActivityFeed(s.recent || []);

    // ── Reservation monitor ─────────────────────────────────────────────────
    loadReservationMonitor();

  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderDonut(repairs) {
  const statuses = [
    { label: 'Pending',       value: repairs.pending       ?? 0, color: '#fbbf24' },
    { label: 'Fixed',         value: repairs.fixed         ?? 0, color: '#34d399' },
    { label: 'Unserviceable', value: repairs.unserviceable ?? 0, color: '#f87171' },
    { label: 'Released',      value: repairs.released      ?? 0, color: '#60a5fa' },
  ];

  const total = statuses.reduce((s, x) => s + Number(x.value), 0);
  setText('donut-total', total);

  const svgG  = document.getElementById('donut-svg');
  const legEl = document.getElementById('donut-legend');
  if (!svgG || !legEl) return;

  const r = 45, cx = 60, cy = 60, strokeW = 10;
  const circ = 2 * Math.PI * r;
  let offset = -circ / 4;

  svgG.innerHTML  = '';
  legEl.innerHTML = '';

  statuses.forEach(({ label, value, color }) => {
    const pct  = total ? Number(value) / total : 0;
    const dash = pct * circ;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', r);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', color);
    circle.setAttribute('stroke-width', strokeW);
    circle.setAttribute('stroke-dasharray', `${dash} ${circ - dash}`);
    circle.setAttribute('stroke-dashoffset', -offset);
    svgG.appendChild(circle);
    offset += dash;

    const li = document.createElement('li');
    li.className = 'legend-item';
    li.innerHTML = `
      <span class="legend-dot" style="background:${color};"></span>
      <span class="legend-label">${label}</span>
      <span class="legend-val">${value}</span>
    `;
    legEl.appendChild(li);
  });
}

function renderOfficeBars(officeData) {
  const el = document.getElementById('office-bars');
  if (!el) return;
  if (!officeData.length) { el.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:.8rem;padding:20px;">No data</div>'; return; }

  const max = Math.max(...officeData.map(o => o.cnt));
  el.innerHTML = officeData.map(o => `
    <div class="bar-row">
      <div class="bar-label" title="${esc(o.office)}">${esc(o.office)}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${max ? (o.cnt / max * 100).toFixed(1) : 0}%;background:var(--info);"></div>
      </div>
      <div class="bar-val">${o.cnt}</div>
    </div>
  `).join('');
}

function renderRepairTypeBars(repairs) {
  const el = document.getElementById('repair-type-bars');
  if (!el) return;
  const data = [
    { label: 'Fixed',         value: repairs.fixed         ?? 0, color: '#34d399' },
    { label: 'Unserviceable', value: repairs.unserviceable ?? 0, color: '#f87171' },
    { label: 'Pending',       value: repairs.pending       ?? 0, color: '#fbbf24' },
    { label: 'Released',      value: repairs.released      ?? 0, color: '#60a5fa' },
  ];
  const max = Math.max(...data.map(d => d.value), 1);
  el.innerHTML = data.map(d => `
    <div class="bar-row">
      <div class="bar-label">${d.label}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${(d.value / max * 100).toFixed(1)}%;background:${d.color};"></div>
      </div>
      <div class="bar-val">${d.value}</div>
    </div>
  `).join('');
}

function renderMonthlyChart(monthly) {
  const canvas = document.getElementById('monthlyTrendCanvas');
  if (!canvas) return;

  const labelSet = new Set([
    ...(monthly.repairs      || []).map(r => r.month),
    ...(monthly.borrows      || []).map(r => r.month),
    ...(monthly.reservations || []).map(r => r.month),
  ]);
  const labels = Array.from(labelSet).sort();

  const toMap = (arr) => Object.fromEntries((arr || []).map(r => [r.month, r.cnt]));
  const repairMap = toMap(monthly.repairs);
  const borrowMap = toMap(monthly.borrows);
  const resMap    = toMap(monthly.reservations);

  const shortLabels = labels.map(l => {
    const [y, m] = l.split('-');
    return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m - 1]} ${y.slice(2)}`;
  });

  if (_monthlyChart) { _monthlyChart.destroy(); _monthlyChart = null; }

  const isDark    = document.documentElement.getAttribute('data-theme') !== 'light';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#9ca3af' : '#6b7280';

  _monthlyChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: shortLabels,
      datasets: [
        { label: 'Repairs',      data: labels.map(l => repairMap[l] || 0), borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.08)', tension: 0.4, pointRadius: 3 },
        { label: 'Borrows',      data: labels.map(l => borrowMap[l] || 0), borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.08)', tension: 0.4, pointRadius: 3 },
        { label: 'Reservations', data: labels.map(l => resMap[l]    || 0), borderColor: '#c084fc', backgroundColor: 'rgba(192,132,252,0.08)', tension: 0.4, pointRadius: 3 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { labels: { color: textColor, font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
        y: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor }, beginAtZero: true },
      }
    }
  });
}

function renderBorrowPie(borrows) {
  const canvas = document.getElementById('borrowStatusCanvas');
  if (!canvas) return;
  if (_borrowPieChart) { _borrowPieChart.destroy(); _borrowPieChart = null; }

  const isDark    = document.documentElement.getAttribute('data-theme') !== 'light';
  const textColor = isDark ? '#9ca3af' : '#6b7280';

  _borrowPieChart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['Pending', 'Returned'],
      datasets: [{
        data: [borrows.pending ?? 0, borrows.returned ?? 0],
        backgroundColor: ['rgba(251,191,36,0.7)', 'rgba(52,211,153,0.7)'],
        borderColor:     ['#fbbf24', '#34d399'],
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { labels: { color: textColor, font: { size: 11 } } } }
    }
  });
}

function renderActivityFeed(recent) {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;
  if (!recent.length) {
    feed.innerHTML = '<li style="padding:40px;text-align:center;color:var(--muted);font-size:.8rem;">No recent activity.</li>';
    return;
  }

  const iconMap = {
    repair:      { icon: '🔧', color: 'var(--info)' },
    borrow:      { icon: '📦', color: 'var(--success)' },
    reservation: { icon: '📅', color: '#c084fc' },
  };

  feed.innerHTML = recent.map(r => {
    const { icon, color } = iconMap[r.kind] || { icon: '📋', color: 'var(--text2)' };
    return `
      <li class="activity-item">
        <div class="activity-icon" style="color:${color};">${icon}</div>
        <div class="activity-info">
          <div class="activity-main">
            <strong>${esc(r.name)}</strong>
            <span class="activity-kind">— ${r.item ? esc(r.item) : ''}</span>
          </div>
          <div class="activity-meta">
            <span class="activity-office">${esc(r.office || '')}</span>
            <span class="activity-status">${r.status}</span>
            <span class="activity-time">${timeAgo(r.ts)}</span>
          </div>
        </div>
      </li>
    `;
  }).join('');
}
