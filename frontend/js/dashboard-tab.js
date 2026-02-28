// ── Dashboard module — uses /api/stats for all counts and chart data ──────────

async function loadDashboard() {
  const res = await API.getStats();
  if (!res?.ok) return;
  const s = res.data;

  renderDashboardStats(s);
  renderDonutChart(s.repairs);
  renderActivityFeed(s.recent);
  renderOfficeBar(s.officeData);
  renderRepairTypeChart(s.repairs);
  renderMonthlyTrendChart(s.monthly);
  renderBorrowStatusChart(s.borrows);
}

// ── Stat cards ────────────────────────────────────────────────────────────────
function renderDashboardStats(s) {
  const setC = (id, v) => animateCount(document.getElementById(id), v || 0);

  // Row 1 — main counts
  setC('ds-total-repairs',   s.repairs.total);
  setC('ds-pending-repairs', s.repairs.pending);
  setC('ds-total-borrowed',  s.borrows.total);
  setC('ds-pending-borrows', s.borrows.pending);

  // Row 2 — secondary counts
  setC('ds-released',     s.repairs.released);
  setC('ds-returned',     s.borrows.returned);
  setC('ds-reservations', Number(s.reservations.active) + Number(s.reservations.overdue));
  setC('ds-tech4ed',      s.tech4ed.today);
}

// ── Donut: repair status breakdown ───────────────────────────────────────────
function renderDonutChart(repairs) {
  const counts = {
    Pending:       Number(repairs.pending),
    Fixed:         Number(repairs.fixed),
    Unserviceable: Number(repairs.unserviceable),
    Released:      Number(repairs.released),
  };
  const total  = Number(repairs.total);
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

  document.getElementById('donut-svg').innerHTML   = paths;
  document.getElementById('donut-total').textContent = total;

  document.getElementById('donut-legend').innerHTML = Object.entries(counts).map(([status, count]) => `
    <li class="legend-item">
      <div class="legend-left"><span class="legend-dot" style="background:${colors[status]}"></span>${status}</div>
      <span class="legend-count">${count}</span>
    </li>`).join('');
}

// ── Bar: repair outcome breakdown ─────────────────────────────────────────────
function renderRepairTypeChart(repairs) {
  const data = [
    { label: 'Pending',        value: Number(repairs.pending),        color: '#f59e0b' },
    { label: 'Fixed/Released', value: Number(repairs.fixed) + Number(repairs.released), color: '#10b981' },
    { label: 'Unserviceable',  value: Number(repairs.unserviceable),  color: '#ef4444' },
  ];
  const max  = Math.max(...data.map(d => d.value), 1);
  const wrap = document.getElementById('repair-type-bars');
  if (!wrap) return;
  wrap.innerHTML = data.map(d => `
    <div class="bar-row">
      <div class="bar-label" title="${d.label}">${d.label}</div>
      <div class="bar-track"><div class="bar-fill" data-width="${(d.value / max * 100).toFixed(1)}%" style="background:${d.color};width:0"></div></div>
      <div class="bar-count">${d.value}</div>
    </div>`).join('');
  setTimeout(animateBars, 50);
}

// ── Bar: top offices ──────────────────────────────────────────────────────────
function renderOfficeBar(officeData) {
  if (!officeData?.length) return;
  const max = officeData[0].cnt;
  const barColors = ['#3b82f6','#10b981','#f59e0b','#818cf8','#ef4444','#a855f7','#06b6d4','#84cc16'];
  const container = document.getElementById('office-bars');
  if (!container) return;
  container.innerHTML = officeData.map(({ office, cnt }, i) => `
    <div class="bar-row">
      <div class="bar-label" title="${office}">${office.replace(' Division','').replace(' of the','')}</div>
      <div class="bar-track"><div class="bar-fill" data-width="${(cnt / max * 100).toFixed(1)}%" style="background:${barColors[i % barColors.length]};width:0"></div></div>
      <div class="bar-count">${cnt}</div>
    </div>`).join('');
  setTimeout(animateBars, 50);
}

// ── Activity feed ─────────────────────────────────────────────────────────────
function renderActivityFeed(recent) {
  const feed = document.getElementById('activity-feed');
  if (!recent?.length) {
    feed.innerHTML = `<li style="padding:32px 20px;text-align:center;color:var(--muted);font-size:.8rem;">No recent activity</li>`;
    return;
  }

  // Dot color mapping per kind + status
  const dotClass = (item) => {
    if (item.kind === 'repair')  return item.status === 'Released' ? 'released' : 'pending';
    if (item.kind === 'borrow')  return item.status === 'Returned' ? 'returned' : 'borrowed';
    return 'borrowed';
  };

  feed.innerHTML = recent.map(e => `
    <li class="activity-item">
      <div class="activity-dot ${dotClass(e)}"></div>
      <div class="activity-content">
        <div class="activity-title">${e.item} — ${e.name}</div>
        <div class="activity-meta">${e.office} · ${e.kind} · ${badge(e.status)} · ${timeAgo(e.ts)}</div>
      </div>
    </li>`).join('');
}

// ── Canvas: monthly trend bar group ──────────────────────────────────────────
function renderMonthlyTrendChart(monthly) {
  const canvas = document.getElementById('monthlyTrendCanvas');
  if (!canvas) return;

  // Build a list of the last 6 months
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString('default', { month: 'short' }),
      key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    });
  }

  // Map backend row arrays into key→count lookups
  const toMap = (rows) => Object.fromEntries(rows.map(r => [r.month, r.cnt]));
  const rm = toMap(monthly.repairs);
  const bm = toMap(monthly.borrows);
  const sm = toMap(monthly.reservations);

  drawBarGroupChart(canvas, {
    labels: months.map(m => m.label),
    datasets: [
      { label: 'Repairs',      data: months.map(m => rm[m.key] || 0), color: '#3b82f6' },
      { label: 'Borrows',      data: months.map(m => bm[m.key] || 0), color: '#10b981' },
      { label: 'Reservations', data: months.map(m => sm[m.key] || 0), color: '#a855f7' },
    ]
  });
}

// ── Canvas: borrow status donut ───────────────────────────────────────────────
function renderBorrowStatusChart(borrows) {
  const canvas = document.getElementById('borrowStatusCanvas');
  if (!canvas) return;
  drawDonutCanvas(canvas, {
    labels: ['Pending', 'Returned'],
    data:   [Number(borrows.pending), Number(borrows.returned)],
    colors: ['#f59e0b', '#10b981'],
  });
}

// ── Canvas helpers (shared drawing functions) ─────────────────────────────────

function drawDonutCanvas(canvas, { labels, data, colors }) {
  const ctx  = canvas.getContext('2d');
  const dpr  = window.devicePixelRatio || 1;
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

  // Cut out the donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#101929';
  ctx.fill();

  // Center label
  ctx.fillStyle = '#e4eaf4';
  ctx.font = `bold ${Math.round(size * 0.12)}px DM Sans, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(data.reduce((a, b) => a + b, 0), cx, cy - size * 0.03);
  ctx.fillStyle = '#4d6480';
  ctx.font = `${Math.round(size * 0.07)}px DM Sans, sans-serif`;
  ctx.fillText('Total', cx, cy + size * 0.1);

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

  const pad    = { top: 16, right: 16, bottom: 36, left: 28 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top  - pad.bottom;
  const allVals = datasets.flatMap(d => d.data);
  const maxVal  = Math.max(...allVals, 1);
  const groupW  = chartW / labels.length;
  const barW    = (groupW - 8) / datasets.length;

  // Horizontal grid lines
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

  // Bars
  labels.forEach((label, gi) => {
    datasets.forEach((ds, di) => {
      const val = ds.data[gi];
      const bh  = (val / maxVal) * chartH;
      const x   = pad.left + gi * groupW + di * barW + 4;
      const y   = pad.top + chartH - bh;
      ctx.fillStyle = ds.color + 'cc';
      // Rounded top corners
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
    // X-axis label
    ctx.fillStyle = '#4d6480';
    ctx.font = `${Math.round(w * 0.025 + 8)}px DM Sans, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, pad.left + gi * groupW + groupW / 2, h - 8);
  });

  const legendEl = canvas.parentElement.querySelector('.canvas-legend');
  if (legendEl) {
    legendEl.innerHTML = datasets.map(ds => `
      <span style="display:inline-flex;align-items:center;gap:5px;font-size:.7rem;color:var(--text2);margin:4px 8px 0 0;">
        <span style="width:8px;height:8px;border-radius:2px;background:${ds.color};display:inline-block;"></span>${ds.label}
      </span>`).join('');
  }
}
