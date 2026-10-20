/* DEADLINE Next board page: a sortable ranking with three column sets, every task as a heatmap, and score against
   effort. Reads data/board.json (entries with every run of every task) and data/facts.json (task kind names).
   Vanilla JS + inline SVG; no external requests. */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  const fmtTok = n => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : Math.round(n / 1e3) + 'k';
  const fmtTime = s => s >= 3600 ? (s / 3600).toFixed(1) + ' h' : Math.round(s / 60) + ' min';
  const SIZES = ['small', 'medium', 'large'];
  const get = name => fetch('data/' + name + '.json', {cache: 'no-cache'}).then(r => { if (!r.ok) throw new Error(name); return r.json(); });

  // One tooltip for the page.
  const tipEl = document.createElement('div'); tipEl.className = 'tip'; tipEl.setAttribute('role', 'status'); document.body.appendChild(tipEl);
  const tip = {
    show(html, e) { tipEl.innerHTML = html; tipEl.classList.add('on'); this.move(e); },
    move(e) { const w = tipEl.offsetWidth, h = tipEl.offsetHeight; let x = e.clientX + 14, y = e.clientY + 14;
      if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + h > innerHeight - 8) y = e.clientY - h - 14;
      tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px'; },
    hide() { tipEl.classList.remove('on'); },
  };
  const row = (k, v) => `<div class="r"><span>${esc(k)}</span><span>${esc(v)}</span></div>`;
  const seg = (el, fn) => $$('button', el).forEach(b => b.addEventListener('click', () => {
    $$('button', el).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); fn(b.dataset.value); }));

  Promise.all([get('board'), get('facts')]).then(([board, facts]) => {
    const models = board.entries.filter(e => e.tasks);
    if (!models.length) {
      $$('[data-bd]').forEach(el => { el.innerHTML = '<div class="bd-empty">No graded runs yet. Scores appear here as soon as they are graded.</div>'; });
      return;
    }
    const fams = facts.families.map(f => ({id: f.id, name: f.name}));
    const tasks = board.tasks;
    // Derived per-model numbers. A kind's score in one run is the mean of its three sizes in that run.
    // Colour follows the model in the order it was added, so new entries and filters never repaint a model. Past 8: grey.
    models.forEach((m, i) => { m.color = i < 8 ? `var(--m${i})` : 'var(--muted)'; });
    models.forEach((m, i) => {
      const n = m.headline_per_run.length;
      m.famRuns = {}; fams.forEach(f => { m.famRuns[f.id] = [...Array(n).keys()].map(r => mean(SIZES.map(s => m.tasks[f.id + '_' + s][r].score))); });
      m.fam = {}; fams.forEach(f => { m.fam[f.id] = 100 * m.families[f.id]; });
      m.spreadPts = m.spread[1] - m.spread[0];
    });
    const rankOf = new Map(models.slice().sort((a, b) => b.headline - a.headline).map((m, i) => [m.id, i + 1]));
    let q = '', cohort = 'all';
    const shown = () => models.filter(m => (cohort === 'all' || m.cohort === cohort) &&
      (!q || (m.model + ' ' + (m.provider || '') + ' ' + m.effort).toLowerCase().includes(q)));
    const key = () => $$('[data-key]').forEach(el => { el.innerHTML = shown().map(m => `<span><i class="sw" style="background:${m.color}"></i>${esc(m.model)}</span>`).join(''); });
    const cohorts = [...new Set(models.map(m => m.cohort || 'other'))];
    $('[data-seg="cohort"]').innerHTML = [['all', 'All', models.length], ...cohorts.map(c => [c, c[0].toUpperCase() + c.slice(1), models.filter(m => m.cohort === c).length])]
      .map(([v, l, n], i) => `<button type="button" data-value="${esc(v)}" aria-pressed="${i ? 'false' : 'true'}">${esc(l)} ${n}</button>`).join('');

    // ---------- ranking table ----------
    const ZOOM = 4;  // each strip shows the model mean +-4 points, the same window for every model
    const strip = m => {
      const lo = m.headline - ZOOM, hi = m.headline + ZOOM, W = 132, x = v => 6 + (v - lo) / (hi - lo) * (W - 12);
      const a = Math.min(...m.headline_per_run), b = Math.max(...m.headline_per_run);
      return `<svg class="strip" viewBox="0 0 ${W} 22" role="img" aria-label="Runs ${m.headline_per_run.map(v => v.toFixed(1)).join(', ')}">
        <line x1="6" x2="${W - 6}" y1="11" y2="11" stroke="var(--line)" stroke-width="2" stroke-linecap="round"/>
        <line x1="${W / 2}" x2="${W / 2}" y1="5" y2="17" stroke="var(--muted)" stroke-width="1"/>
        <line x1="${x(a)}" x2="${x(b)}" y1="11" y2="11" stroke="${m.color}" stroke-width="6" stroke-linecap="round" opacity=".35"/>
        ${m.headline_per_run.map(v => `<circle cx="${x(v)}" cy="11" r="3.5" fill="${m.color}" stroke="var(--surface)" stroke-width="1.5"/>`).join('')}</svg>`;
    };
    const famMax = Math.max(...models.flatMap(m => Object.values(m.fam)));
    const famLead = {}; fams.forEach(f => { famLead[f.id] = Math.max(...models.map(m => m.fam[f.id])); });
    const fcell = (m, f) => { const v = m.fam[f.id];
      return `<span class="fcell${v === famLead[f.id] ? ' lead' : ''}"><span>${v.toFixed(0)}</span><span class="fbar"><i style="width:${Math.max(0, v) / famMax * 100}%"></i><b style="left:${100 / famMax * 100}%"></b></span></span>`; };
    const C = {
      rank: {label: '#', get: m => rankOf.get(m.id), html: m => String(rankOf.get(m.id)).padStart(2, '0'), cls: 'rank', asc: true},
      model: {label: 'Model', get: m => m.model, text: true, asc: true,
              html: m => `<span class="model"><i class="sw" style="background:${m.color}"></i><span>${esc(m.model)}<br><span class="sub">${esc(m.provider || '-')} · ${esc(m.effort)} · ${esc(m.cohort)}${m.runs !== 3 ? `, ${m.runs} run${m.runs === 1 ? '' : 's'}` : ''}</span></span></span>`},
      headline: {label: 'Headline', get: m => m.headline, html: m => `<span class="big">${m.headline.toFixed(1)}</span>`, num: true},
      runs: {label: 'Runs (mean ±4)', get: m => m.spreadPts, html: strip, asc: true, tip: 'Each run against the model mean; the centre line is the mean'},
      spread: {label: 'Spread', get: m => m.runs > 1 ? m.spreadPts : Infinity, html: m => m.runs > 1 ? m.spreadPts.toFixed(2) : '<span class="sub">1 run</span>', num: true, asc: true, tip: 'Best run minus worst run, in headline points'},
      valid: {label: 'Valid', get: m => m.valid, html: m => (100 * m.valid).toFixed(1) + '%', num: true, tip: 'Hidden instances with a correct answer'},
      tokens: {label: 'Tokens / run', get: m => m.tokens, html: m => fmtTok(m.tokens), num: true, asc: true, tip: 'New tokens over all 24 tasks; cached re-reads not counted'},
      perTask: {label: 'Tokens / task', get: m => m.tokens / tasks.length, html: m => fmtTok(m.tokens / tasks.length), num: true, asc: true},
      wall: {label: 'Wall / run', get: m => m.wall_seconds, html: m => fmtTime(m.wall_seconds), num: true, asc: true, tip: 'Recorded, never scored'},
      cost: {label: 'Cost / run', get: m => m.cost_usd ?? Infinity, html: m => m.free ? '<span class="sub">free tier</span>' : m.cost_usd == null ? '<span class="sub">not reported</span>' : '$' + m.cost_usd.toFixed(2), num: true, asc: true, tip: 'Reported by the harness; opencode runs report it'},
      pts: {label: 'Points / 1M tokens', get: m => m.headline / (m.tokens / 1e6), html: m => (m.headline / (m.tokens / 1e6)).toFixed(1), num: true},
    };
    fams.forEach((f, i) => { C[f.id] = {label: f.id.toUpperCase(), get: m => m.fam[f.id], html: m => fcell(m, f), num: true, tip: f.name, grp: i === 0}; });
    const VIEWS = {
      overview: ['rank', 'model', 'headline', 'runs', 'spread', 'valid', 'tokens', 'wall'],
      families: ['rank', 'model', 'headline', ...fams.map(f => f.id)],
      effort: ['rank', 'model', 'headline', 'tokens', 'perTask', 'wall', 'pts'],
    };
    if (models.some(m => m.cost_usd != null)) { VIEWS.overview.push('cost'); VIEWS.effort.push('cost'); }
    const NOTES = {
      overview: 'The strip shows each run against the model mean, on the same ±4 point window for every model. A tight cluster means the score repeats. Community results are one run, and their tokens, time and cost are reported by the submitter.',
      families: 'Each task kind is the mean of its small, medium and large task. The tick on each bar is the reference, 100. The best model per kind is in blue.',
      effort: 'Effort is per run: the sum over all 24 tasks. Wall time is recorded but never scored. Price per run is not shown until it is measured.',
    };
    let view = 'overview', sortKey = 'headline', asc = false;
    function table() {
      const cols = VIEWS[view]; if (!cols.includes(sortKey)) { sortKey = 'headline'; asc = false; }
      const c = C[sortKey], rows = shown().sort((a, b) => { const va = c.get(a), vb = c.get(b);
        const d = c.text ? String(va).localeCompare(String(vb)) : va - vb; return asc ? d : -d; });
      const th = k => { const d = C[k], on = k === sortKey;
        return `<th scope="col" class="${d.num ? 'num' : ''}${d.grp ? ' grp' : ''}" aria-sort="${on ? (asc ? 'ascending' : 'descending') : 'none'}"${d.tip ? ` title="${esc(d.tip)}"` : ''}>
          <button type="button" data-sort="${k}">${esc(d.label)}<span class="arrow" aria-hidden="true">${on ? (asc ? '▲' : '▼') : ''}</span></button></th>`; };
      $('[data-rank]').innerHTML = `<table class="board-t"><thead><tr>${cols.map(th).join('')}</tr></thead><tbody>${rows.map(m => `<tr>${cols.map(k =>
        `<td class="${C[k].num ? 'num' : ''}${C[k].cls ? ' ' + C[k].cls : ''}${C[k].grp ? ' grp' : ''}">${C[k].html(m)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      if (!rows.length) $('[data-rank]').innerHTML = '<div class="bd-none">No model matches this filter.</div>';
      $('[data-count]').textContent = `Showing ${rows.length} of ${models.length} models`;
      $('[data-rank-note]').textContent = NOTES[view];
    }
    const refresh = () => { table(); heat(); scatter(); key(); };
    $('[data-q]').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); refresh(); });
    seg($('[data-seg="cohort"]'), v => { cohort = v; refresh(); });
    $('[data-rank]').addEventListener('click', e => { const b = e.target.closest('[data-sort]'); if (!b) return;
      const k = b.dataset.sort; if (k === sortKey) asc = !asc; else { sortKey = k; asc = !!C[k].asc; } table(); });
    seg($('[data-seg="view"]'), v => { view = v; table(); });

    // ---------- every task: heatmap ----------
    const LO = -0.15, HI = 2.3;
    const fill = v => { if (v < 1) { const t = Math.min(1, (1 - v) / (1 - LO)); return [`color-mix(in oklab, var(--div-lo) ${(t * 100).toFixed(0)}%, var(--div-mid))`, t]; }
      const t = Math.min(1, (v - 1) / (HI - 1)); return [`color-mix(in oklab, var(--div-hi) ${(t * 100).toFixed(0)}%, var(--div-mid))`, t]; };
    let cellMode = 'mean';
    const pick = runs => { const s = runs.map(r => r.score); return cellMode === 'best' ? Math.max(...s) : cellMode === 'worst' ? Math.min(...s) : mean(s); };
    const heatEl = $('[data-heat]');
    function heat() {
      heatEl.style.gridTemplateColumns = `118px repeat(${tasks.length}, minmax(34px, 1fr))`;
      let h = '<div></div>' + fams.map(f => `<div class="h-fam" style="grid-column:span 3" title="${esc(f.name)}"><b>${esc(f.id.toUpperCase())}</b> ${esc(f.name)}</div>`).join('');
      h += '<div></div>' + tasks.map(t => `<div class="h-size" title="${esc(t.split('_')[1])}">${t.split('_')[1][0].toUpperCase()}</div>`).join('');
      shown().forEach(m => { h += `<div class="h-model"><i class="sw" style="background:${m.color}"></i>${esc(m.model)}</div>`;
        tasks.forEach(t => { const v = pick(m.tasks[t]), [bg, k] = fill(v);
          h += `<div class="cell" data-cell="${esc(t)}|${esc(m.id)}" style="background:${bg};color:${k > .55 ? 'var(--on-strong)' : 'var(--ink)'}">${v.toFixed(2)}</div>`; }); });
      heatEl.innerHTML = h;
    }
    heatEl.addEventListener('mousemove', e => { const c = e.target.closest('[data-cell]'); if (!c) return tip.hide();
      const [t, mid] = c.dataset.cell.split('|'), m = models.find(q => q.id === mid), runs = m.tasks[t];
      tip.show(`<b>${esc(m.model)}</b> · ${esc(t.replace('_', ' '))}` + runs.map((r, i) => row('Run ' + (i + 1), r.score.toFixed(3) + '  (' + r.valid + '/' + r.instances + ' valid)')).join('') +
        row('Tokens, mean', fmtTok(mean(runs.map(r => r.tokens)))) + row('Wall, mean', fmtTime(mean(runs.map(r => r.wall_seconds)))), e); });
    heatEl.addEventListener('mouseleave', () => tip.hide());
    seg($('[data-seg="cell"]'), v => { cellMode = v; heat(); });
    $('[data-ramp]').style.background = `linear-gradient(in oklab to right, var(--div-lo), var(--div-mid) ${((1 - LO) / (HI - LO) * 100).toFixed(1)}%, var(--div-hi))`;
    $('[data-marks]').innerHTML = [[LO, '0 lazy'], [1, '1 reference'], [2, '2']].map(([v, l], i) => `<span style="left:${i ? (v - LO) / (HI - LO) * 100 : 0}%">${l}</span>`).join('');

    // ---------- score against effort ----------
    const svg = $('[data-scatter]'), W = 760, H = 420, L = 58, R = 30, T = 18, B = 52;
    const XM = {tokens: {get: m => m.token_runs, mean: m => m.tokens, fmt: v => (v / 1e6).toFixed(0) + 'M', label: 'New tokens per run', step: 1e6},
                wall: {get: m => m.wall_runs, mean: m => m.wall_seconds, fmt: v => (v / 3600).toFixed(0) + ' h', label: 'Wall time per run', step: 3600}};
    let xm = 'tokens';
    function scatter() {
      const list = shown(); if (!list.length) { svg.innerHTML = ''; return; }
      const X = XM[xm], xmax = Math.ceil(Math.max(...list.flatMap(X.get)) * 1.1 / X.step) * X.step;
      const nx = xmax / X.step, xstep = X.step * (nx > 10 ? Math.ceil(nx / 7) : 1);
      const heads = list.flatMap(m => m.headline_per_run), y0 = Math.min(80, Math.floor(Math.min(...heads) / 10) * 10 - 10), y1 = Math.ceil(Math.max(...heads) / 10) * 10 + 10;
      const x = v => L + v / xmax * (W - L - R), y = v => T + (y1 - v) / (y1 - y0) * (H - T - B);
      let s = '';
      for (let v = y0; v <= y1; v += 10) s += `<g class="tick"><line class="gridline" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 10}" y="${y(v) + 4}" text-anchor="end">${v}</text></g>`;
      for (let v = 0; v <= xmax + 1; v += xstep) s += `<g class="tick"><line class="axisline" x1="${x(v)}" x2="${x(v)}" y1="${H - B}" y2="${H - B + 5}"/><text x="${x(v)}" y="${H - B + 20}" text-anchor="middle">${X.fmt(v)}</text></g>`;
      s += `<line class="axisline" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/>`;
      s += `<line class="refline" x1="${L}" x2="${W - R}" y1="${y(100)}" y2="${y(100)}"/><text x="${L + 8}" y="${y(100) - 7}" text-anchor="start">reference = 100</text>`;
      s += `<text x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle">${X.label}</text><text x="16" y="${(T + H - B) / 2}" text-anchor="middle" transform="rotate(-90 16 ${(T + H - B) / 2})">Headline</text>`;
      list.forEach(m => { const vx = X.get(m), mx = X.mean(m);
        if (m.runs > 1) m.headline_per_run.forEach((h, r) => { s += `<circle cx="${x(vx[r])}" cy="${y(h)}" r="4.5" fill="${m.color}" opacity=".5"/>`; });
        s += m.cohort === 'community'  // a ring, so a single self-reported run never reads as a 3-run mean
          ? `<circle cx="${x(mx)}" cy="${y(m.headline)}" r="7" fill="var(--surface)" stroke="${m.color}" stroke-width="3"/>`
          : `<circle cx="${x(mx)}" cy="${y(m.headline)}" r="8" fill="${m.color}" stroke="var(--surface)" stroke-width="2"/>`;
        s += `<text class="label" x="${x(mx)}" y="${y(m.headline) - 17}" text-anchor="middle">${esc(m.model)}</text>`;
        m.headline_per_run.forEach((h, r) => { s += `<circle class="hit" cx="${x(vx[r])}" cy="${y(h)}" r="11" data-m="${esc(m.id)}" data-r="${r}"/>`; });
        s += `<circle class="hit" cx="${x(mx)}" cy="${y(m.headline)}" r="13" data-m="${esc(m.id)}" data-r="mean"/>`; });
      svg.innerHTML = s;
    }
    svg.addEventListener('mousemove', e => { const h = e.target.closest('.hit'); if (!h) return tip.hide();
      const m = models.find(q => q.id === h.dataset.m), r = h.dataset.r;
      if (r === 'mean') tip.show(`<b>${esc(m.model)}</b> · ${m.runs === 1 ? 'one run, ' + esc(m.cohort) + ', self-reported usage' : 'mean of ' + m.runs + ' runs'}` + row('Headline', m.headline.toFixed(1)) + row('Tokens', fmtTok(m.tokens)) + row('Wall time', fmtTime(m.wall_seconds)), e);
      else tip.show(`<b>${esc(m.model)}</b> · run ${+r + 1}` + row('Headline', m.headline_per_run[r].toFixed(1)) + row('Tokens', fmtTok(m.token_runs[r])) + row('Wall time', fmtTime(m.wall_runs[r])), e); });
    svg.addEventListener('mouseleave', () => tip.hide());
    seg($('[data-seg="x"]'), v => { xm = v; scatter(); });
    refresh();
  }).catch(() => {
    $$('[data-bd]').forEach(el => { el.innerHTML = '<div class="bd-empty">The data did not load. Open this site through a web server, not from a file.</div>'; });
  });
})();
