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
  await renderReservationMonitor();
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

// ── Reservation Monitor ───────────────────────────────────────────────────────
async function renderReservationMonitor() {
  const container = document.getElementById('reservation-monitor-section');
  if (!container) return;

  // Fetch active + overdue reservations (no pagination limit needed for calendar)
  const res = await API.getReservations({ status: 'Active', limit: 100, page: 1 });
  if (!res?.ok) return;
  const { data } = res.data;

  if (data.length === 0) {
    container.innerHTML = `
      <div class="card" style="margin-top:0;">
        <div class="card-header">
          <span class="card-title">📅 Active Reservations Monitor</span>
          <span class="card-sub">No active reservations</span>
        </div>
        <div class="empty-state" style="padding:32px 20px;">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <p>No active reservations to display</p>
        </div>
      </div>`;
    return;
  }

  const today = new Date();
  today.setHours(0,0,0,0);

  // Build calendar for current month — centered on today
  const calHtml = buildReservationCalendar(data, today);
  const tableHtml = buildReservationTable(data, today);

  container.innerHTML = `
    <div class="card" style="margin-top:0;">
      <div class="card-header" style="padding:16px 20px 14px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:30px;height:30px;border-radius:8px;background:rgba(59,130,246,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="15" height="15" fill="none" stroke="#60a5fa" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
          <div>
            <div class="card-title">Active Reservations Monitor</div>
            <div class="card-sub">${data.length} active · calendar view + details</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <span style="display:inline-flex;align-items:center;gap:5px;font-size:.68rem;color:var(--text2);"><span style="width:10px;height:10px;border-radius:2px;background:rgba(16,185,129,0.5);display:inline-block;border:1px solid #10b981;"></span>Reserved</span>
          <span style="display:inline-flex;align-items:center;gap:5px;font-size:.68rem;color:var(--text2);"><span style="width:10px;height:10px;border-radius:2px;background:rgba(239,68,68,0.5);display:inline-block;border:1px solid #ef4444;"></span>Overdue</span>
          <span style="display:inline-flex;align-items:center;gap:5px;font-size:.68rem;color:var(--text2);"><span style="width:10px;height:10px;border-radius:50%;background:#3b82f6;display:inline-block;"></span>Today</span>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:auto 1fr;gap:0;border-top:1px solid var(--border);">

        <!-- Calendar -->
        <div style="padding:18px 20px;border-right:1px solid var(--border);min-width:260px;">
          ${calHtml}
        </div>

        <!-- Table -->
        <div style="overflow-x:auto;">
          <table class="data-table" style="min-width:520px;">
            <thead>
              <tr>
                <th>#</th>
                <th>Borrower</th>
                <th>Item</th>
                <th>Office</th>
                <th>Qty</th>
                <th>Reserved Date</th>
                <th>Expected Return</th>
                <th>Released By</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${tableHtml}</tbody>
          </table>
        </div>
      </div>
    </div>`;
}

function buildReservationCalendar(data, today) {
  const year  = today.getFullYear();
  const month = today.getMonth();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build a map of day → events for this month
  const dayMap = {};
  data.forEach(r => {
    const resDate    = new Date(r.reservation_date);
    const retDate    = new Date(r.expected_return_date);
    const expRetDate = new Date(r.expected_return_date);
    expRetDate.setHours(0,0,0,0);
    const isOverdue  = expRetDate < today;

    // Mark all days from reservation to expected return in current month
    const start = new Date(Math.max(resDate, new Date(year, month, 1)));
    const end   = new Date(Math.min(retDate, new Date(year, month + 1, 0)));

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate();
        if (!dayMap[day]) dayMap[day] = [];
        dayMap[day].push({ id: r.id, item: r.item_name, borrower: r.borrower_name, isOverdue });
      }
    }
  });

  let html = `
    <div style="font-size:.78rem;font-weight:700;color:var(--text);margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">
      <span>${monthNames[month]} ${year}</span>
      <span style="font-size:.65rem;font-weight:500;color:var(--muted);">Current Month</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:6px;">`;

  dayNames.forEach(d => {
    html += `<div style="text-align:center;font-size:.6rem;font-weight:700;color:var(--muted);padding:2px 0;">${d}</div>`;
  });

  html += `</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;">`;

  // Empty cells for days before the 1st
  for (let i = 0; i < firstDay; i++) {
    html += `<div style="aspect-ratio:1;"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const isToday   = day === today.getDate();
    const events    = dayMap[day] || [];
    const hasEvents = events.length > 0;
    const hasOverdue = events.some(e => e.isOverdue);

    let bg = 'transparent';
    let border = '1px solid transparent';
    let color = 'var(--text2)';
    let dot = '';

    if (isToday) {
      bg = 'var(--accent)';
      color = 'white';
      border = '1px solid var(--accent)';
    } else if (hasOverdue) {
      bg = 'rgba(239,68,68,0.15)';
      border = '1px solid rgba(239,68,68,0.35)';
      color = '#f87171';
    } else if (hasEvents) {
      bg = 'rgba(16,185,129,0.12)';
      border = '1px solid rgba(16,185,129,0.3)';
      color = '#34d399';
    }

    if (hasEvents && !isToday) {
      const dotColor = hasOverdue ? '#ef4444' : '#10b981';
      dot = `<div style="position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:${dotColor};"></div>`;
    }

    // Tooltip content
    const tooltipItems = events.slice(0, 3).map(e => e.item).join(', ');
    const tooltipExtra = events.length > 3 ? ` +${events.length - 3} more` : '';
    const titleAttr = hasEvents ? `title="${tooltipItems}${tooltipExtra}"` : '';

    html += `<div ${titleAttr} style="aspect-ratio:1;border-radius:5px;background:${bg};border:${border};display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:${isToday ? '700' : hasEvents ? '600' : '400'};color:${color};position:relative;cursor:${hasEvents ? 'pointer' : 'default'};transition:all 0.15s;">
      ${day}
      ${dot}
    </div>`;
  }

  html += `</div>`;

  // Mini summary below calendar
  const totalActive  = data.filter(r => { const d = new Date(r.expected_return_date); d.setHours(0,0,0,0); return d >= today; }).length;
  const totalOverdue = data.filter(r => { const d = new Date(r.expected_return_date); d.setHours(0,0,0,0); return d < today; }).length;

  html += `
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);display:flex;gap:12px;flex-wrap:wrap;">
      <div style="display:flex;flex-direction:column;gap:2px;">
        <span style="font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);">Active</span>
        <span style="font-size:1.1rem;font-weight:700;color:#34d399;">${totalActive}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:2px;">
        <span style="font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);">Overdue</span>
        <span style="font-size:1.1rem;font-weight:700;color:#f87171;">${totalOverdue}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:2px;">
        <span style="font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);">Total</span>
        <span style="font-size:1.1rem;font-weight:700;color:var(--text);">${data.length}</span>
      </div>
    </div>`;

  return html;
}

function buildReservationTable(data, today) {
  if (!data.length) return `<tr><td colspan="9"><div class="empty-state"><p>No active reservations</p></div></td></tr>`;

  return data.map(r => {
    const expDate = new Date(r.expected_return_date);
    expDate.setHours(0,0,0,0);
    const isOverdue = expDate < today;

    // Days until return (or days overdue)
    const diffMs   = expDate.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    let dueLabel = '';
    if (diffDays === 0)        dueLabel = `<span style="font-size:.62rem;color:#fbbf24;font-weight:600;">Due today</span>`;
    else if (diffDays > 0)     dueLabel = `<span style="font-size:.62rem;color:var(--muted);">in ${diffDays}d</span>`;
    else                       dueLabel = `<span style="font-size:.62rem;color:#f87171;font-weight:600;">${Math.abs(diffDays)}d overdue</span>`;

    const rowStyle = isOverdue ? 'background:rgba(239,68,68,0.04);' : '';

    return `<tr style="${rowStyle}">
      <td class="td-mono">#${r.id}</td>
      <td class="td-name">${esc(r.borrower_name)}</td>
      <td>${esc(r.item_name)}</td>
      <td style="font-size:.75rem;">${esc(r.office)}</td>
      <td>${r.quantity}</td>
      <td class="td-mono">${fmtDate(r.reservation_date)}</td>
      <td style="white-space:nowrap;">
        <div class="td-mono" style="${isOverdue ? 'color:#f87171;font-weight:600;' : ''}">${fmtDate(r.expected_return_date)}</div>
        <div>${dueLabel}</div>
      </td>
      <td style="font-size:.75rem;">${esc(r.released_by)}</td>
      <td>${badge(isOverdue ? 'Overdue' : r.status)}</td>
    </tr>`;
  }).join('');
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
