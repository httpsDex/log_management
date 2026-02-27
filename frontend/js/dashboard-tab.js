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
  const entries = Object.entries(counts);

  entries.forEach(([status, count]) => {
    if (count === 0) return;
    const pct = count / Math.max(total, 1);
    const len = pct * CIRC;
    paths += `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${colors[status]}" stroke-width="10"
      stroke-dasharray="${len} ${CIRC - len}" stroke-dashoffset="${-offset}" stroke-linecap="butt"
      style="transition: stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)"/>`;
    offset += len;
  });

  document.getElementById('donut-svg').innerHTML = paths;
  document.getElementById('donut-total').textContent = total;

  const legend = document.getElementById('donut-legend');
  legend.innerHTML = entries.map(([status, count]) => `
    <li class="legend-item">
      <div class="legend-left"><span class="legend-dot" style="background:${colors[status]}"></span>${status}</div>
      <span class="legend-count">${count}</span>
    </li>`).join('');
}

function renderActivityFeed(repairs, borrowed, reservations) {
  const events = [
    ...repairs.map(r => ({
      title: `${r.item_name} — ${r.customer_name}`,
      meta: `${r.office} · ${r.status}`,
      dot: r.status.toLowerCase().replace(' ',''),
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
  ]
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice(0, 12);

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
  container.innerHTML = sorted.map(([office, count], i) => `
    <div class="bar-row">
      <div class="bar-label" title="${office}">${office.replace(' Division','').replace(' of the','')}</div>
      <div class="bar-track"><div class="bar-fill" data-width="${(count/max*100).toFixed(1)}%" style="background:${barColors[i%barColors.length]};width:0"></div></div>
      <div class="bar-count">${count}</div>
    </div>`).join('');

  setTimeout(animateBars, 50);
}
