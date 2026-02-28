// ─── Dashboard Module ────────────────────────────────────────────────────────

async function loadDashboard() {
  const [repairsRes, borrowedRes, reservationsRes, tech4edRes] = await Promise.all([
    API.getRepairs(),
    API.getBorrowed(),
    API.getReservations(),
    API.getTech4Ed(),
  ]);
  if (!repairsRes?.ok || !borrowedRes?.ok) return;

  const repairs      = repairsRes.data;
  const borrowed     = borrowedRes.data;
  const reservations = reservationsRes?.ok ? reservationsRes.data : [];
  const tech4ed      = tech4edRes?.ok ? tech4edRes.data : [];

  renderDashboardStats(repairs, borrowed, reservations, tech4ed);
  renderDonutChart(repairs);
  renderActivityFeed(repairs, borrowed, reservations);
  renderOfficeBar(repairs, borrowed, reservations);
  renderRepairTypeChart(repairs);
  renderMonthlyTrendChart(repairs, borrowed, reservations);
  renderBorrowStatusChart(borrowed);
  renderTech4EdGenderChart(tech4ed);
}

function renderDashboardStats(repairs, borrowed, reservations, tech4ed) {
  const rPending   = repairs.filter(r => r.status === 'Pending').length;
  const rReleased  = repairs.filter(r => r.status === 'Released').length;
  const bPending   = borrowed.filter(b => b.status === 'Pending').length;
  const bReturned  = borrowed.filter(b => b.status === 'Returned').length;
  const resActive  = reservations.filter(r => r.status === 'Active' || r.status === 'Overdue').length;
  const t4eToday   = tech4ed.filter(e => {
    const d = new Date(e.time_in);
    return d.toDateString() === new Date().toDateString();
  }).length;

  setCount('ds-total-repairs',   repairs.length);
  setCount('ds-total-borrowed',  borrowed.length);
  setCount('ds-pending-repairs', rPending);
  setCount('ds-pending-borrows', bPending);
  setCount('ds-released',        rReleased);
  setCount('ds-returned',        bReturned);
  setCount('ds-reservations',    resActive);
  setCount('ds-tech4ed',         t4eToday);
}

function setCount(id, val) {
  const el = document.getElementById(id);
  if (el) animateCount(el, val);
}

// ── Donut: Repair Status ──────────────────────────────────────────────────────
function renderDonutChart(repairs) {
  const counts = {
    Pending:       repairs.filter(r => r.status === 'Pending').length,
    Fixed:         repairs.filter(r => r.status === 'Fixed').length,
    Unserviceable: repairs.filter(r => r.status === 'Unserviceable').length,
    Released:      repairs.filter(r => r.status === 'Released').length,
  };
  const total = repairs.length;
  const colors = { Pending: '#f59e0b', Fixed: '#10b981', Unserviceable: '#ef4444', Released: '#818cf8' };
  const R = 45, CIRC = 2 * Math.PI * R;
  let offset = 0;
  let paths = '';

  Object.entries(counts).forEach(([status, count]) => {
    if (count === 0) return;
    const len = (count / Math.max(total, 1)) * CIRC;
    paths += `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${colors[status]}" stroke-width="10"
      stroke-dasharray="${len} ${CIRC - len}" stroke-dashoffset="${-offset}" stroke-linecap="butt"/>`;
    offset += len;
  });

  document.getElementById('donut-svg').innerHTML = paths;
  document.getElementById('donut-total').textContent = total;

  document.getElementById('donut-legend').innerHTML = Object.entries(counts).map(([status, count]) => `
    <li class="legend-item">
      <div class="legend-left"><span class="legend-dot" style="background:${colors[status]}"></span>${status}</div>
      <span class="legend-count">${count}</span>
    </li>`).join('');
}

// ── Bar: Repair type breakdown (Fixed vs Unserviceable) ────────────────────
function renderRepairTypeChart(repairs) {
  const fixed   = repairs.filter(r => r.status === 'Fixed' || r.status === 'Released').length;
  const unserv  = repairs.filter(r => r.status === 'Unserviceable').length;
  const pending = repairs.filter(r => r.status === 'Pending').length;
  const data = [
    { label: 'Pending',       value: pending, color: '#f59e0b' },
    { label: 'Fixed/Released',value: fixed,   color: '#10b981' },
    { label: 'Unserviceable', value: unserv,  color: '#ef4444' },
  ];
  const max = Math.max(...data.map(d => d.value), 1);
  const wrap = document.getElementById('repair-type-bars');
  if (!wrap) return;
  wrap.innerHTML = data.map(d => `
    <div class="bar-row">
      <div class="bar-label" title="${d.label}">${d.label}</div>
      <div class="bar-track"><div class="bar-fill" data-width="${(d.value/max*100).toFixed(1)}%" style="background:${d.color};width:0"></div></div>
      <div class="bar-count">${d.value}</div>
    </div>`).join('');
  setTimeout(animateBars, 50);
}

// ── Line/Bar: Monthly trend (last 6 months) ───────────────────────────────
function renderMonthlyTrendChart(repairs, borrowed, reservations) {
  const canvas = document.getElementById('monthlyTrendCanvas');
  if (!canvas) return;

  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() });
  }

  const getCount = (items, dateField, m) =>
    items.filter(x => {
      const d = new Date(x[dateField] || x.created_at);
      return d.getMonth() === m.month && d.getFullYear() === m.year;
    }).length;

  const repairData = months.map(m => getCount(repairs, 'date_received', m));
  const borrowData = months.map(m => getCount(borrowed, 'date_borrowed', m));
  const resData    = months.map(m => getCount(reservations, 'reservation_date', m));

  drawBarGroupChart(canvas, {
    labels: months.map(m => m.label),
    datasets: [
      { label: 'Repairs',      data: repairData, color: '#3b82f6' },
      { label: 'Borrows',      data: borrowData, color: '#10b981' },
      { label: 'Reservations', data: resData,    color: '#a855f7' },
    ]
  });
}

// ── Donut: Borrow status ──────────────────────────────────────────────────
function renderBorrowStatusChart(borrowed) {
  const canvas = document.getElementById('borrowStatusCanvas');
  if (!canvas) return;

  const pending  = borrowed.filter(b => b.status === 'Pending').length;
  const returned = borrowed.filter(b => b.status === 'Returned').length;

  drawDonutCanvas(canvas, {
    labels: ['Pending', 'Returned'],
    data:   [pending,   returned],
    colors: ['#f59e0b', '#10b981'],
  });
}

// ── Donut: Tech4Ed Gender ─────────────────────────────────────────────────
function renderTech4EdGenderChart(tech4ed) {
  const canvas = document.getElementById('genderChartCanvas');
  if (!canvas) return;

  const male   = tech4ed.filter(e => e.gender === 'Male').length;
  const female = tech4ed.filter(e => e.gender === 'Female').length;
  const other  = tech4ed.filter(e => e.gender === 'Other').length;

  drawDonutCanvas(canvas, {
    labels: ['Male', 'Female', 'Other'],
    data:   [male,   female,   other],
    colors: ['#3b82f6', '#a855f7', '#f59e0b'],
  });
}

// ── Activity Feed ─────────────────────────────────────────────────────────
function renderActivityFeed(repairs, borrowed, reservations) {
  const events = [
    ...repairs.map(r => ({
      title: `${r.item_name} — ${r.customer_name}`,
      meta: `${r.office} · ${r.status}`,
      dot: r.status.toLowerCase().replace(' ', ''),
      date: r.updated_at || r.created_at,
    })),
    ...borrowed.map(b => ({
      title: `${b.item_borrowed} borrowed by ${b.borrower_name}`,
      meta: `${b.office} · ${b.status}`,
      dot: b.status === 'Returned' ? 'returned' : 'borrowed',
      date: b.updated_at || b.created_at,
    })),
    ...reservations.map(r => ({
      title: `${r.item_name} reserved by ${r.borrower_name}`,
      meta: `${r.office} · Reservation`,
      dot: r.status === 'Returned' ? 'returned' : 'borrowed',
      date: r.updated_at || r.created_at,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 12);

  const feed = document.getElementById('activity-feed');
  if (!events.length) {
    feed.innerHTML = `<li style="padding:32px 20px;text-align:center;color:var(--muted);font-size:.8rem;">No recent activity</li>`;
    return;
  }
  feed.innerHTML = events.map(e => `
    <li class="activity-item">
      <div class="activity-dot ${e.dot}"></div>
      <div class="activity-content">
        <div class="activity-title">${e.title}</div>
        <div class="activity-meta">${e.meta} · ${timeAgo(e.date)}</div>
      </div>
    </li>`).join('');
}

// ── Bar: By Office ────────────────────────────────────────────────────────
function renderOfficeBar(repairs, borrowed, reservations) {
  const officeCounts = {};
  [...repairs, ...borrowed, ...reservations].forEach(item => {
    const o = item.office || 'Unknown';
    officeCounts[o] = (officeCounts[o] || 0) + 1;
  });

  const sorted = Object.entries(officeCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = sorted[0]?.[1] || 1;
  const barColors = ['#3b82f6','#10b981','#f59e0b','#818cf8','#ef4444','#a855f7','#06b6d4','#84cc16'];

  const container = document.getElementById('office-bars');
  if (!container) return;
  container.innerHTML = sorted.map(([office, count], i) => `
    <div class="bar-row">
      <div class="bar-label" title="${office}">${office.replace(' Division','').replace(' of the','')}</div>
      <div class="bar-track"><div class="bar-fill" data-width="${(count/max*100).toFixed(1)}%" style="background:${barColors[i%barColors.length]};width:0"></div></div>
      <div class="bar-count">${count}</div>
    </div>`).join('');

  setTimeout(animateBars, 50);
}

// ── Canvas helpers ────────────────────────────────────────────────────────

function drawDonutCanvas(canvas, { labels, data, colors }) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = canvas.parentElement.clientWidth || 200;
  canvas.width  = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  const total = data.reduce((a, b) => a + b, 0) || 1;
  const cx = size / 2, cy = size / 2;
  const outer = size * 0.38, inner = size * 0.22;
  let angle = -Math.PI / 2;

  data.forEach((val, i) => {
    const sweep = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outer, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    angle += sweep;
  });

  // hole
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#101929';
  ctx.fill();

  // center total
  ctx.fillStyle = '#e4eaf4';
  ctx.font = `bold ${Math.round(size * 0.12)}px DM Sans, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(data.reduce((a, b) => a + b, 0), cx, cy - size * 0.03);
  ctx.fillStyle = '#4d6480';
  ctx.font = `${Math.round(size * 0.07)}px DM Sans, sans-serif`;
  ctx.fillText('Total', cx, cy + size * 0.1);

  // legend below
  const legendEl = canvas.parentElement.querySelector('.canvas-legend');
  if (legendEl) {
    legendEl.innerHTML = labels.map((l, i) => `
      <span style="display:inline-flex;align-items:center;gap:5px;font-size:.7rem;color:var(--text2);margin:4px 8px 0 0;">
        <span style="width:8px;height:8px;border-radius:50%;background:${colors[i]};display:inline-block;"></span>${l}: ${data[i]}
      </span>`).join('');
  }
}

function drawBarGroupChart(canvas, { labels, datasets }) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w   = canvas.parentElement.clientWidth || 400;
  const h   = 200;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);

  const pad = { top: 16, right: 16, bottom: 36, left: 28 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top  - pad.bottom;

  const allVals  = datasets.flatMap(d => d.data);
  const maxVal   = Math.max(...allVals, 1);
  const groupW   = chartW / labels.length;
  const barW     = (groupW - 8) / datasets.length;

  // grid lines
  ctx.strokeStyle = 'rgba(26,38,64,0.8)';
  ctx.lineWidth   = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + chartH - (i / 4) * chartH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();
    ctx.fillStyle = '#4d6480';
    ctx.font = `${Math.round(w * 0.025 + 8)}px DM Mono, monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(Math.round((i / 4) * maxVal), pad.left - 4, y + 4);
  }

  // bars
  labels.forEach((label, gi) => {
    datasets.forEach((ds, di) => {
      const val  = ds.data[gi];
      const bh   = (val / maxVal) * chartH;
      const x    = pad.left + gi * groupW + di * barW + 4;
      const y    = pad.top + chartH - bh;
      ctx.fillStyle = ds.color + 'cc';
      ctx.beginPath();
      const r = 3;
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, y + bh);
      ctx.lineTo(x, y + bh);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.fill();
    });
    // x label
    ctx.fillStyle = '#4d6480';
    ctx.font = `${Math.round(w * 0.025 + 8)}px DM Sans, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, pad.left + gi * groupW + groupW / 2, h - 8);
  });

  // legend
  const legendEl = canvas.parentElement.querySelector('.canvas-legend');
  if (legendEl) {
    legendEl.innerHTML = datasets.map(ds => `
      <span style="display:inline-flex;align-items:center;gap:5px;font-size:.7rem;color:var(--text2);margin:4px 8px 0 0;">
        <span style="width:8px;height:8px;border-radius:2px;background:${ds.color};display:inline-block;"></span>${ds.label}
      </span>`).join('');
  }
}
