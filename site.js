// DEADLINE Next site renderer. Every fact comes from data/*.json (built by deadline_next/site.py from the code).
// Pictures are drawn from real public task instances. No network requests leave this origin.
'use strict';
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const icon = name => `<span class="icon" style="--src:url(icons/${name}.svg)"></span>`;
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n);
  const redraws = [];
  // Embedded task HTML (in future model-written) is shown with no scripts (sandbox="") and no network at all: the
  // iframe csp attribute is enforced by the browser, and the same policy is also placed in the document itself, right
  // after any BOM, comments and doctype, so no element can come before it. Display-only styles follow.
  const FRAME_CSP = "default-src 'none'; style-src 'unsafe-inline'";
  const lockdown = html => {
    const lead = String(html).match(/^\uFEFF?\s*(?:<!--[\s\S]*?-->\s*)*(?:<!doctype[^>]*>)?/i)[0];
    return lead + `<meta http-equiv="Content-Security-Policy" content="${FRAME_CSP}">`
      + '<style>.t{font-family:"DejaVu Sans",Verdana,system-ui,sans-serif!important}[data-dl^=i]{background:#c9cfda}[data-dl^=d]{background:#e3e6ec}</style>'
      + String(html).slice(lead.length);
  };

  // ---------- theme ----------
  const toggle = $('[data-theme-toggle]');
  const setIcon = () => { if (toggle) toggle.innerHTML = icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon'); };
  setIcon();
  if (toggle) toggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('next-theme', next); } catch (e) {}
    setIcon(); redraws.forEach(fn => fn());
  });

  // ---------- canvas helpers ----------
  function fit(canvas) {
    const r = canvas.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const g = canvas.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
    return {g, w, h, d};
  }
  function mix(hex, alpha) {
    const m = hex.replace('#', ''); const v = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
    return `rgba(${parseInt(v.slice(0, 2), 16)},${parseInt(v.slice(2, 4), 16)},${parseInt(v.slice(4, 6), 16)},${alpha})`;
  }
  function rgbOf(color) {  // '#rgb', '#rrggbb' or 'rgb(r,g,b)' -> [r, g, b]
    if (color.startsWith('rgb')) return color.match(/[\d.]+/g).slice(0, 3).map(Number);
    const m = color.replace('#', ''); const v = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
    return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16));
  }
  function shade(color, k) {  // k < 1 darker, k > 1 lighter
    const c = rgbOf(color).map(x => k < 1 ? x * k : x + (255 - x) * (k - 1));
    return `rgb(${c.map(x => Math.round(Math.max(0, Math.min(255, x)))).join(',')})`;
  }
  function iso(x, y, z, s) { return [(x - y) * s * 0.866, (x + y) * s * 0.5 - z * s]; }
  function prism(g, ox, oy, s, x, y, z, dx, dy, dz, base) {
    const p = (a, b, c) => { const [u, v] = iso(a, b, c, s); return [ox + u, oy + v]; };
    const face = (pts, fill) => { g.beginPath(); pts.forEach(([u, v], i) => i ? g.lineTo(u, v) : g.moveTo(u, v)); g.closePath(); g.fillStyle = fill; g.fill(); };
    face([p(x, y, z + dz), p(x + dx, y, z + dz), p(x + dx, y + dy, z + dz), p(x, y + dy, z + dz)], shade(base, 1.18));
    face([p(x + dx, y, z), p(x + dx, y + dy, z), p(x + dx, y + dy, z + dz), p(x + dx, y, z + dz)], shade(base, 0.82));
    face([p(x, y + dy, z), p(x + dx, y + dy, z), p(x + dx, y + dy, z + dz), p(x, y + dy, z + dz)], shade(base, 0.64));
    // A thin outline in the page colour keeps neighbouring boxes and cubes apart.
    g.strokeStyle = css('--surface'); g.lineWidth = Math.max(0.6, s * 0.06); g.lineJoin = 'round';
    [[p(x, y, z + dz), p(x + dx, y, z + dz), p(x + dx, y + dy, z + dz), p(x, y + dy, z + dz)],
     [p(x + dx, y, z), p(x + dx, y + dy, z), p(x + dx, y + dy, z + dz), p(x + dx, y, z + dz)],
     [p(x, y + dy, z), p(x + dx, y + dy, z), p(x + dx, y + dy, z + dz), p(x, y + dy, z + dz)]].forEach(pts => {
      g.beginPath(); pts.forEach(([u, v], i) => i ? g.lineTo(u, v) : g.moveTo(u, v)); g.closePath(); g.stroke(); });
  }
  function isoBounds(points, s) {
    let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
    for (const [x, y, z] of points) { const [u, v] = iso(x, y, z, s); a = Math.min(a, u); b = Math.max(b, u); c = Math.min(c, v); d = Math.max(d, v); }
    return {a, b, c, d};
  }
  function drawIso(canvas, boxes, colorOf) {  // boxes: [x,y,z,dx,dy,dz,key], drawn back to front
    const {g, w, h} = fit(canvas);
    const corners = []; boxes.forEach(([x, y, z, dx, dy, dz]) => { corners.push([x, y, z], [x + dx, y + dy, z + dz], [x + dx, y, z], [x, y + dy, z], [x, y, z + dz]); });
    const unit = isoBounds(corners, 1); const s = Math.min(w / (unit.b - unit.a), h / (unit.d - unit.c)) * 0.9;
    const ox = (w - (unit.b - unit.a) * s) / 2 - unit.a * s, oy = (h - (unit.d - unit.c) * s) / 2 - unit.c * s;
    boxes.slice().sort((p, q) => (p[0] + p[1] + p[2]) - (q[0] + q[1] + q[2]) || p[2] - q[2])
      .forEach(([x, y, z, dx, dy, dz, k]) => prism(g, ox, oy, s, x, y, z, dx, dy, dz, colorOf(k)));
  }

  // ---------- family pictures (each from a real public instance) ----------
  const pictures = {
    o1(c, v) { drawIso(c, v.cells.map(([x, y, z]) => [x, y, z, 1, 1, 1, 0]), () => css('--accent')); },
    o2(c, v) { drawArena(c, v, v.frames[Math.floor(v.frames.length * 0.55)] || v.frames[0]); },
    o3(c, v) {
      // One shade of the accent per delivery stop: later stops darker (they ride deeper in the truck).
      const stops = Math.max(...v.boxes.map(b => b[7]));
      drawIso(c, v.boxes.map(([id, x, y, z, dx, dy, dz, stop]) => [x, y, z, dx, dy, dz, stop]),
              k => shade(css('--accent'), 1.45 - 0.75 * (k - 1) / Math.max(1, stops - 1)));
    },
    o4(c, v) {
      const {g, w, h, d} = fit(c); const pts = v.stops.map(s => [s[0], s[1]]).concat([v.depot]);
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const lo = [Math.min(...xs), Math.min(...ys)], span = Math.max(Math.max(...xs) - lo[0], Math.max(...ys) - lo[1]) || 1;
      const s = Math.min(w, h) * 0.86 / span, ox = (w - span * s) / 2, oy = (h - span * s) / 2;
      const P = p => [ox + (p[0] - lo[0]) * s, oy + (p[1] - lo[1]) * s];
      v.routes.forEach((r, i) => {
        g.beginPath(); [v.depot, ...r, v.depot].forEach((p, k) => { const [x, y] = P(p); k ? g.lineTo(x, y) : g.moveTo(x, y); });
        g.strokeStyle = mix(css('--accent'), 0.35 + 0.55 * (i % 3) / 2); g.lineWidth = 2 * d; g.lineJoin = 'round'; g.stroke();
      });
      v.stops.forEach(([x, y, kind]) => { const [u, w2] = P([x, y]); g.beginPath(); g.arc(u, w2, (kind === 'drop' ? 3 : 4) * d, 0, 7);
        g.fillStyle = kind === 'drop' ? css('--ink') : css('--warn'); g.fill(); });
      const [dx, dy] = P(v.depot); g.fillStyle = css('--accent'); g.fillRect(dx - 6 * d, dy - 6 * d, 12 * d, 12 * d);
    },
    o5(c, v) {
      const {g, w, h, d} = fit(c); const end = v.end || Math.max(...v.runs.map(r => r[2]));
      const row = h / v.machines, sx = w / end;
      v.maintenance.forEach((ws, m) => ws.forEach(([a, b]) => { g.fillStyle = mix(css('--warn'), 0.25); g.fillRect(a * sx, m * row + row * 0.18, (b - a) * sx, row * 0.64); }));
      v.runs.forEach(([m, s, e, job]) => { g.fillStyle = mix(css('--accent'), 0.35 + 0.6 * ((job * 37) % 10) / 10);
        g.fillRect(s * sx + 0.5 * d, m * row + row * 0.18, Math.max(1, (e - s) * sx - d), row * 0.64); });
    },
    o6(c, v) { bars(c, v, 'x faster'); },
    o7(c, v) { bars(c, v, 'x lower cost than no compression'); },
  };
  function bars(c, rows, unit) {  // floor vs ref, one pair per tier: the ref bar is drawn to scale against floor
    const {g, w, h, d} = fit(c); const top = 22 * d, n = rows.length, band = (h - top) / n;
    g.font = `${11 * d}px Geist, sans-serif`;  // legend: what the two bars are
    g.fillStyle = mix(css('--muted'), 0.35); g.fillRect(0, 4 * d, 10 * d, 10 * d);
    g.fillStyle = css('--muted'); g.fillText('lazy answer', 14 * d, 13 * d);
    g.fillStyle = css('--accent'); g.fillRect(96 * d, 4 * d, 10 * d, 10 * d);
    g.fillStyle = css('--muted'); g.fillText('our reference', 110 * d, 13 * d);
    rows.forEach((r, i) => {
      const f = r.floor.reduce((a, b) => a + b) / r.floor.length, q = r.ref.reduce((a, b) => a + b) / r.ref.length;
      const y = top + i * band + band * 0.3, bh = band * 0.2;
      g.fillStyle = mix(css('--muted'), 0.35); g.fillRect(0, y, w, bh);
      g.fillStyle = css('--accent'); g.fillRect(0, y + bh * 1.3, Math.max(3 * d, w * q / f), bh);
      g.fillStyle = css('--ink'); g.font = `${12 * d}px Geist, sans-serif`;
      g.fillText(`${r.task.split('_')[1]}: ref ${(f / q).toFixed(f / q < 10 ? 1 : 0)}${unit}`, 0, y - 4 * d);
    });
  }
  function drawArena(c, v, frame) {
    const {g, w, h, d} = fit(c); const H = v.grid.length, W = v.grid[0].length, s = Math.min(w / W, h / H);
    const ox = (w - W * s) / 2, oy = (h - H * s) / 2;
    g.fillStyle = css('--sunken'); g.fillRect(ox, oy, W * s, H * s);
    v.grid.forEach((row, r) => [...row].forEach((ch, k) => { if (ch === '#') { g.fillStyle = css('--line'); g.fillRect(ox + k * s, oy + r * s, s, s); } }));
    (frame.crystals || []).forEach(([r, k]) => { g.fillStyle = mix(css('--accent'), 0.28); g.fillRect(ox + k * s + s * .2, oy + r * s + s * .2, s * .6, s * .6); });
    v.bases.forEach(([r, k], p) => { g.fillStyle = p ? css('--p1') : css('--p0'); g.fillRect(ox + k * s - s * .15, oy + r * s - s * .15, s * 1.3, s * 1.3); });
    frame.units.forEach(([p, kind, r, k]) => { g.beginPath(); g.arc(ox + (k + .5) * s, oy + (r + .5) * s, s * (kind === 's' ? .42 : .26), 0, 7);
      g.fillStyle = p ? css('--p1') : css('--p0'); g.fill(); });
  }

  // ---------- page sections ----------
  function bindFacts(f) {
    const values = {name: f.name, wave: f.wave, families: f.limits.families, tasks: f.limits.tasks, invalid: f.scoring.invalid.toFixed(2)};
    $$('[data-fact]').forEach(el => { if (el.dataset.fact in values) el.textContent = values[el.dataset.fact]; });
    $$('[data-formula]').forEach(el => { el.textContent = f.scoring.formula; });
  }
  function history(f) {
    const el = $('[data-history]'); if (!el) return;
    el.innerHTML = f.history.map((h, i) => `<li class="reveal" style="--i:${i}"><h3>${esc(h.line)}</h3><p class="what">${esc(h.what)}</p><p class="result">${esc(h.result)}</p></li>`).join('');
  }
  const LAYOUT = {o1: 'wide', o2: '', o3: '', o4: '', o5: 'wide', o6: 'tinted', o7: 'wide tinted', o8: 'wide'};
  const NUMS = {
    o1: v => [['floor', v.floor + ' nodes'], ['ref', v.ref + ' nodes']], o3: v => [['floor', v.floor + ' high'], ['ref', v.ref + ' high']],
    o4: v => [['floor', v.floor], ['ref', v.ref]], o5: v => [['floor', v.floor], ['ref', v.ref]],
  };
  function bento(f, vis) {
    const el = $('[data-bento]'); if (!el) return;
    el.innerHTML = f.families.map((fam, i) => {
      const nums = NUMS[fam.id] ? NUMS[fam.id](vis[fam.id]).map(([k, n]) => `<span>${k} <b class="mono">${esc(n)}</b></span>`).join('') : '';
      const pic = fam.id === 'o8' ? `<iframe title="A real page layout from the page layout task" sandbox="" csp="${FRAME_CSP}" referrerpolicy="no-referrer" loading="lazy" data-frame></iframe>`
                                  : `<canvas data-pic="${fam.id}" role="img" aria-label="${esc(fam.name)}: a real public instance"></canvas>`;
      return `<a class="tile ${LAYOUT[fam.id]} reveal" style="--i:${i}" href="gallery.html#${fam.id}">
        <span class="head">${icon(fam.icon)}${esc(fam.name)}</span><p>${esc(fam.asks)}</p>
        <span class="pic">${pic}</span>${nums ? `<span class="nums">${nums}</span>` : ''}</a>`;
    }).join('');
    const draw = () => $$('[data-pic]', el).forEach(c => pictures[c.dataset.pic] && vis[c.dataset.pic] && pictures[c.dataset.pic](c, vis[c.dataset.pic]));
    draw(); redraws.push(draw); window.addEventListener('resize', draw, {passive: true});
    const frame = $('[data-frame]', el);
    if (frame && vis.o8 && vis.o8[0]) {
      // The model-style HTML is shown scaled, in a sandbox with no scripts and no network (CSP inside the frame too).
      frame.srcdoc = lockdown(vis.o8[0].ref_html);
      const scale = () => { const box = frame.parentElement.getBoundingClientRect(); const k = box.width / vis.o8[0].page.width;
        frame.style.width = vis.o8[0].page.width + 'px'; frame.style.height = (box.height / k) + 'px';
        frame.style.transform = `scale(${k})`; frame.style.transformOrigin = '0 0'; };
      const box = frame.parentElement;  // a fixed box: the scaled frame keeps its full layout size inside, clipped
      box.style.cssText = 'display:block;flex:none;overflow:hidden;height:230px;border-radius:8px;border:1px solid var(--line)';
      frame.style.border = '0';
      scale(); window.addEventListener('resize', scale, {passive: true});
    }
  }
  function calc(f) {
    const el = $('[data-calc]'); if (!el) return;
    const FLOOR = 400, REF = 100, LO = 25, HI = 440, input = $('#you', el);
    const pos = cost => (Math.log(HI) - Math.log(cost)) / (Math.log(HI) - Math.log(LO)) * 100;  // lower cost to the right
    $('[data-mark="ref"]', el).style.left = pos(REF) + '%'; $('[data-mark="floor"]', el).style.left = pos(FLOOR) + '%';
    const update = () => {
      const you = Number(input.value), sc = Math.max(f.scoring.invalid, Math.log(FLOOR / you) / Math.log(FLOOR / REF));
      $('[data-score]', el).textContent = sc.toFixed(2); $('[data-cost]', el).textContent = `cost ${you}`;
      $('[data-you]', el).style.left = pos(you) + '%';
    };
    input.addEventListener('input', update); update();
  }
  function board(f, b, full) {
    const main = $('[data-board-main]'); const pilot = $('[data-pilot]');
    if (main) {
      if (!b.entries.length) {
        main.innerHTML = `<div class="empty"><h2 class="h3">No full runs yet.</h2><p>The first full runs come with the pilot: every model plays all ${f.limits.tasks} tasks once. Official scores use ${f.limits.samples_per_model} runs per model. Scores appear here as soon as they are graded.</p>
          <p><a class="btn ghost" href="method.html">Read the method</a></p></div>`;
      } else {
        const num = (v, d) => v === null || v === undefined ? '-' : Number(v).toFixed(d);
        main.innerHTML = `<div style="overflow-x:auto"><table class="results"><thead><tr><th>Model</th><th>Provider</th><th>Cohort</th><th>Effort</th><th>Runs</th>
          <th style="text-align:right">Headline</th><th style="text-align:right">Spread</th><th style="text-align:right">Valid</th>${full ? f.families.map(x => `<th style="text-align:right">${esc(x.id.toUpperCase())}</th>`).join('') : ''}
          <th style="text-align:right">Tokens / run</th><th style="text-align:right">Wall / run</th><th style="text-align:right">Cost</th></tr></thead><tbody>${
          b.entries.slice().sort((p, q) => q.headline - p.headline).map(e => `<tr><td>${esc(e.model)}</td><td>${esc(e.provider || '-')}</td><td>${esc(e.cohort || '-')}</td><td>${esc(e.effort)}</td><td class="num">${e.runs}</td>
            <td class="num">${num(e.headline, 1)}</td><td class="num">${e.spread && e.runs > 1 ? num(e.spread[0], 1) + ' to ' + num(e.spread[1], 1) : '-'}</td><td class="num">${e.valid === undefined ? '-' : num(100 * e.valid, 1) + '%'}</td>${
            full ? f.families.map(x => `<td class="num">${e.families && x.id in e.families ? (100 * e.families[x.id]).toFixed(0) : '-'}</td>`).join('') : ''}
            <td class="num">${e.tokens ? fmt(e.tokens) : '-'}</td><td class="num">${e.wall_seconds ? (e.wall_seconds / 3600).toFixed(1) + ' h' : '-'}</td><td class="num">${e.cost_usd ? '$' + num(e.cost_usd, 2) : '-'}</td></tr>`).join('')}</tbody></table></div>`;
      }
    }
    if (pilot && !b.pilot && f.package) {
      const p = f.package;
      pilot.innerHTML = `<h2 class="h3">Run it yourself</h2><p class="task">Every public task, the exact checkers and a small client. Python 3.10 and Node.js 22.</p>
        <p><a class="btn primary" href="${esc(p.file)}" download>Download the package <span class="icon" style="--src:url(icons/download-simple.svg)"></span></a></p>
        <p class="note">${esc(p.file)}, ${(p.bytes / 1e6).toFixed(1)} MB<br>sha256 <code>${esc(p.sha256)}</code></p>
        <p><a href="method.html#run">How to run it and submit</a></p>`;
    }
    if (pilot && b.pilot) {
      pilot.innerHTML = `<h2 class="h3">First pilot</h2><p class="task">${esc(b.pilot.task)}</p>` + b.pilot.results.map(r =>
        `<div class="row"><span class="model">${esc(r.model)} <span class="muted">${esc(r.effort)}</span></span><span class="val">${r.score.toFixed(2)}</span>${r.note ? `<span class="note">${esc(r.note)}</span>` : ''}</div>`).join('');
    }
  }
  function integrity(f) {
    const el = $('[data-integrity]'); if (!el) return;
    el.innerHTML = f.integrity.map((it, i) => `<li class="reveal" style="--i:${i}"><span class="badge">${icon(it.icon)}</span><div><h3>${esc(it.title)}</h3><p>${esc(it.body)}</p></div></li>`).join('');
  }
  function stats(f) {
    const el = $('[data-stats]'); if (!el) return;
    const L = f.limits;
    el.innerHTML = [[fmt(L.token_budget), 'new tokens per task, per run (cached re-reads not counted)'], [L.wall_stop_seconds / 60 + ' min', 'safety stop per task'],
      [L.hidden_per_task, 'hidden instances per task'], [L.tasks, 'tasks in the wave'], [L.samples_per_model, 'runs per model']]
      .map(([n, l]) => `<div><span class="n">${esc(n)}</span><span class="l">${esc(l)}</span></div>`).join('');
  }
  function arena(vis) {
    const c = $('#arena'); if (!c || !vis.o2) return;
    const v = vis.o2; let k = 0, last = 0, playing = !reduce, visible = true;
    const show = i => {
      const fr = v.frames[i]; drawArena(c, v, fr);
      const t = $('[data-arena-turn]'); if (t) t.textContent = 'turn ' + fr.t;
      fr.hp.forEach((hp, p) => { const bar = $(`[data-arena-hp="${p}"]`); if (bar) bar.style.width = Math.max(0, hp) / 50 * 100 + '%'; });
    };
    v.players.forEach((name, p) => { const el = $(`[data-arena-name="${p}"]`); if (el) el.textContent = name; });
    if (!playing) { show(Math.floor(v.frames.length * 0.6)); redraws.push(() => show(Math.floor(v.frames.length * 0.6))); return; }
    const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) requestAnimationFrame(tick); });
    io.observe(c);
    function tick(now) {
      if (!visible) return;
      if (now - last > 110) { last = now; show(k); k = (k + 1) % v.frames.length; if (k === 0) last = now + 1200; }
      requestAnimationFrame(tick);
    }
    redraws.push(() => show(Math.max(0, k - 1)));
  }
  function families(f) {  // tasks.html
    const el = $('[data-families]'); if (!el) return;
    el.innerHTML = f.families.map(fam => `<article class="family" id="${fam.id}">
      <div><h2>${icon(fam.icon)}${esc(fam.name)}</h2><p class="muted">${esc(fam.asks)}</p></div>
      <dl class="facts">
        <dt>Tests</dt><dd><ul class="chips">${fam.tests.map(t => `<li>${esc(t)}</li>`).join('')}</ul></dd>
        <dt>Cost</dt><dd>${esc(cap(fam.cost))}. Lower is better.</dd>
        <dt>Floor (0)</dt><dd>${esc(cap(fam.floor))}</dd>
        <dt>Reference (1)</dt><dd>${esc(cap(fam.ref))}</dd>
        <dt>Tasks</dt><dd>${fam.tiers.map(t => `<span class="mono">${esc(t.id)}</span> <span class="muted">${esc(t.language === 'js' ? 'JavaScript' : 'Python')}, ${t.hidden} hidden: ${esc(t.size)}</span>`).join('<br>')}</dd>
      </dl></article>`).join('');
  }
  function method(f) {  // method.html
    const el = $('[data-rules]'); if (el) el.innerHTML = f.rules.map((r, i) => `<li><span class="mono">${i + 1}</span><span>${esc(r)}</span></li>`).join('');
    const gates = $('[data-gates]'); if (gates) gates.innerHTML = f.release_gates.map(g => `<li>${esc(g)}</li>`).join('');
    const status = $('[data-status]'); if (status) status.innerHTML = f.status.map(x => `<li><b>${esc(x.item)}</b><span class="muted">${esc(x.state)}</span></li>`).join('');
  }
  function reveal() {
    const items = $$('.reveal'); if (reduce || !('IntersectionObserver' in window)) { items.forEach(i => i.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {threshold: 0.15});
    items.forEach(i => io.observe(i));
  }

  // ---------- gallery (gallery.html) ----------
  function outline(node, depth = 0, out = []) {  // a recipe tree as indented lines: type and its numbers
    const kids = node.children || (node.child ? [node.child] : []);
    const nums = Object.entries(node).filter(([k]) => !['type', 'children', 'child'].includes(k))
      .map(([k, v]) => `${k} ${Array.isArray(v) ? v.join(',') : v}`).join('  ');
    out.push(`<li style="padding-left:${depth * 18}px"><span class="k">${esc(node.type)}</span> <span class="muted">${esc(nums)}</span></li>`);
    kids.forEach(k => outline(k, depth + 1, out));
    return out;
  }
  function shot(label, cost, inner, ref) {
    return `<div class="shot${ref ? ' ref' : ''}"><header><b>${esc(label)}</b><span class="mono">${esc(cost)}</span></header>${inner}</div>`;
  }
  function framed(html, page) {
    return `<div class="frame" data-width="${page.width}"><iframe sandbox="" csp="${FRAME_CSP}" referrerpolicy="no-referrer" title="A page layout, scaled" srcdoc="${esc(lockdown(html))}"></iframe></div>`;
  }
  function scaleFrames(root) {
    $$('.frame', root).forEach(box => { const f = $('iframe', box), w = Number(box.dataset.width), k = box.clientWidth / w;
      f.style.width = w + 'px'; f.style.height = box.clientHeight / k + 'px'; f.style.transform = `scale(${k})`; });
  }
  const NOTE = "No model answers yet. After the pilot, each model's answer to this example appears here, with its cost and score.";
  const COST = {o1: n => `${n} nodes`, o2: n => `cost ${Math.round(n)}`, o3: n => `height ${n}`, o4: n => `cost ${n}`, o5: n => `cost ${n}`,
                o6: n => `${n.toFixed(4)} s`, o7: n => `${Math.round(n).toLocaleString('en-US')} bytes`, o8: n => `${Math.round(n)} px`};
  const o2Won = r => { const last = r.frames && r.frames[r.frames.length - 1]; return !!last && r.cost != null && last.hp[1 - r.side] <= 0; };
  function costText(r) {
    if (r.cost == null) return 'not valid';
    if (r.family === 'o2') return o2Won(r) ? `won on turn ${r.cost}` : `no win, cost ${Math.round(r.cost)}`;
    return COST[r.family](r.cost);
  }
  function modelsSection(fam, mine, who) {  // one row per model: its cost and score on this example; a row picks what is drawn below
    if (!mine.length) return `<div class="empty models"><h3>Models</h3><p>${esc(NOTE)}</p></div>`;
    const rows = mine.map(r => { const m = who[r.model] || {model: r.model};
      return `<tr><td class="who"><button type="button" class="pick" data-pick="${esc(r.model)}" aria-pressed="false"><b>${esc(m.model)}</b>
        <span class="sub">${esc(m.provider || '-')} · ${esc(m.effort || '')} · ${esc(m.cohort || '')}${m.cohort === 'pilot' ? ', run ' + esc(m.run) : ''}</span></button></td>
        <td class="num">${esc(costText(r))}</td><td class="num">${r.score.toFixed(2)}</td></tr>`; }).join('');
    const say = fam.id === 'o2' ? 'Pick a model to load its match in the player above.' : 'Pick a model to draw its answer next to ours.';
    return `<section class="models"><h3>Model answers</h3><p>Each model's own answer, run in the grading sandbox on this same example. ${say}
      Score 0 is the lazy answer and 1 is our reference. This is one example; the board scores 30 hidden instances per task.</p>
      <div class="gal-wrap"><table class="results gal"><thead><tr><th>Model</th><th style="text-align:right">On this example</th><th style="text-align:right">Score</th></tr></thead>
      <tbody>${rows}</tbody></table></div>${fam.id === 'o2' ? '' : '<div data-model-view></div>'}</section>`;
  }
  function modelView(fam, v, r, m) {  // the picked model's answer beside our reference, on the same scale
    const name = m ? m.model : r.model, cost = costText(r);
    if (r.cost == null) return `<div class="compare one">${shot(name, cost, `<p class="why">This answer was not valid on this example: ${esc(r.reason || 'no reason given')}.</p>`)}</div>`;
    const canvas = (k, label) => `<canvas data-m="${k}" role="img" aria-label="${esc(label)}"></canvas>`;
    if (fam.id === 'o1') return `<div class="compare">${shot(name + "'s recipe", cost, `<ul class="outline">${outline(r.tree).join('')}</ul>`)
      + shot('Our reference recipe', `${v.ref} nodes`, `<ul class="outline">${outline(v.ref_tree).join('')}</ul>`, true)}</div>`;
    const ours = {o3: `height ${v.ref}`, o4: `cost ${v.ref}`, o5: `cost ${v.ref}`};
    if (ours[fam.id]) return `<div class="compare">${shot(name, cost, canvas('m', name + "'s answer"))}${shot('Our reference', ours[fam.id], canvas('r', 'Our reference'), true)}</div>`;
    if (fam.id === 'o6') { const t = v[0];
      return `<div class="compare">${shot(name + "'s rewrite", `${cost} · ${(r.floor / r.cost).toFixed(0)}x faster than slow`, `<pre class="codebox">${esc(r.code)}</pre>`)
        + shot('Our faster rewrite', `${r.ref.toFixed(4)} s · ${(r.floor / r.ref).toFixed(0)}x`, `<pre class="codebox">${esc(t.fast)}</pre>`, true)}</div>`; }
    if (fam.id === 'o7') return `<div class="compare one">${shot(name + "'s compressor", `${cost} · ${(r.floor / r.cost).toFixed(1)}x smaller than raw · best standard compressor ${Math.round(r.ref).toLocaleString('en-US')} bytes`,
      `<pre class="codebox">${esc(r.code)}</pre>`)}</div>`;
    if (fam.id === 'o8') { const t = v[0];
      return `<div class="compare">${shot(name + "'s layout", cost, framed(r.html, t.page))}${shot('Our reference layout', `${t.ref[0]} px`, framed(t.ref_html, t.page), true)}</div>`; }
    return '';
  }
  function galleryPanel(fam, v, mine, who) {
    const models = modelsSection(fam, mine, who);
    const head = `<h2>${icon(fam.icon)}${esc(fam.name)}</h2><p class="lead">${esc(fam.asks)} Lazy answer: ${esc(fam.floor)}. Reference: ${esc(fam.ref)}.</p>`;
    if (fam.id === 'o2') {
      return head + `<div class="player"><canvas data-player width="640" height="640" role="img" aria-label="Match replay"></canvas>
        <div class="controls"><div><label for="match">Match on this public map</label><select id="match" data-match>${
          v.replays.map((r, i) => `<option value="${i}">${esc(r.players[0])} vs ${esc(r.players[1])}</option>`).join('')}</select></div>
          <div class="row"><button class="round" type="button" data-play aria-label="Play" aria-pressed="false">${icon('play')}</button>
          <input type="range" min="0" value="0" data-turn aria-label="Turn"></div>
          <p class="result" data-result></p></div></div>` + models;
    }
    let pair = '';
    if (fam.id === 'o1') pair = shot('The target shape', `${v.size.join(' x ')} cells`, '<canvas data-g="o1" role="img" aria-label="The target voxel shape"></canvas>')
      + shot('Our reference recipe', `${v.ref} nodes (lazy: ${v.floor})`, `<ul class="outline">${outline(v.ref_tree).join('')}</ul>`, true);
    if (fam.id === 'o3') pair = shot('Lazy answer', `height ${v.floor}`, '<canvas data-g="o3f" role="img" aria-label="Lazy answer: truck load"></canvas>') + shot('Our reference', `height ${v.ref}`, '<canvas data-g="o3r" role="img" aria-label="Reference: truck load"></canvas>', true);
    if (fam.id === 'o4') pair = shot('Lazy answer', `cost ${v.floor}`, '<canvas data-g="o4f" role="img" aria-label="Lazy answer: van routes"></canvas>') + shot('Our reference', `cost ${v.ref}`, '<canvas data-g="o4r" role="img" aria-label="Reference: van routes"></canvas>', true);
    if (fam.id === 'o5') pair = shot('Lazy answer', `cost ${v.floor}`, '<canvas data-g="o5f" role="img" aria-label="Lazy answer: machine schedule"></canvas>') + shot('Our reference', `cost ${v.ref}`, '<canvas data-g="o5r" role="img" aria-label="Reference: machine schedule"></canvas>', true);
    if (fam.id === 'o6') { const t = v[0]; pair = shot('The slow program (lazy answer)', `${t.floor[0].toFixed(3)} s`, `<pre class="codebox">${esc(t.slow)}</pre>`)
      + shot('Our faster rewrite', `${t.ref[0].toFixed(3)} s`, `<pre class="codebox">${esc(t.fast)}</pre>`, true); }
    if (fam.id === 'o7') { const t = v[0]; pair = shot('A public file (first lines)', `${t.raw} bytes`, `<pre class="codebox">${esc(t.sample)}</pre>`)
      + shot('Cost per tier', 'no compression vs best standard compressor', '<canvas data-g="o7" role="img" aria-label="Sizes per tier: no compression and the best standard compressor"></canvas>', true); }
    if (fam.id === 'o8') { const t = v[0]; pair = shot('Lazy answer: one column', `${t.floor[0]} px`, framed(t.floor_html, t.page))
      + shot('Our reference layout', `${t.ref[0]} px`, framed(t.ref_html, t.page), true); }
    return head + `<div class="compare">${pair}</div>` + models;
  }
  function gallery(f, vis, gal) {
    const el = $('[data-gallery]'); if (!el) return;
    const runs = (gal && gal.runs) || [];
    const who = Object.fromEntries(((gal && gal.models) || []).map(m => [m.id, m]));
    el.innerHTML = `<div class="tabs" role="tablist" aria-label="Task kinds">${f.families.map(fam =>
      `<button role="tab" type="button" id="tab-${fam.id}" data-tab="${fam.id}" aria-selected="false" aria-controls="panel" tabindex="-1">${icon(fam.icon)}${esc(fam.name)}</button>`).join('')}</div>
      <div class="panel" id="panel" role="tabpanel" data-panel></div>`;
    let stop = () => {};
    const open = id => {
      const fam = f.families.find(x => x.id === id) || f.families[0];
      $$('[data-tab]', el).forEach(b => { const on = b.dataset.tab === fam.id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      $('[data-panel]', el).setAttribute('aria-labelledby', 'tab-' + fam.id);
      stop(); stop = () => {};
      const mine = runs.filter(r => r.family === fam.id);
      let v = vis[fam.id];
      if (fam.id === 'o2') v = {...v, replays: v.replays.concat(mine.filter(r => r.frames && r.frames.length).map(r => {  // model matches join the ladder replays
        const name = (who[r.model] || {model: r.model}).model;
        return {model: r.model, players: r.side ? [r.opponent, name] : [name, r.opponent], frames: r.frames};
      }))};
      const panel = $('[data-panel]', el); panel.innerHTML = galleryPanel(fam, v, mine, who);
      let picked = null;
      const paintModel = () => {
        if (!picked) return;
        const m = name => $(`[data-m="${name}"]`, panel);
        if (fam.id === 'o3' && m('m')) { pictures.o3(m('m'), {boxes: picked.boxes}); pictures.o3(m('r'), v); }
        if (fam.id === 'o4' && m('m')) { pictures.o4(m('m'), {...v, routes: picked.routes}); pictures.o4(m('r'), v); }
        if (fam.id === 'o5' && m('m')) { const end = Math.max(...v.floor_runs.map(r => r[2]), ...picked.runs.map(r => r[2]), ...v.runs.map(r => r[2]));
          pictures.o5(m('m'), {...v, runs: picked.runs, end}); pictures.o5(m('r'), {...v, end}); }
      };
      const pick = id => {
        picked = mine.find(r => r.model === id) || null;
        $$('[data-pick]', panel).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pick === id)));
        if (fam.id === 'o2') {
          const i = v.replays.findIndex(r => r.model === id), sel = $('[data-match]', panel);
          if (i >= 0 && sel) { sel.value = String(i); sel.dispatchEvent(new Event('change')); }
          return;
        }
        const view = $('[data-model-view]', panel);
        if (view && picked) { view.innerHTML = modelView(fam, v, picked, who[id]); paintModel(); scaleFrames(view); }
      };
      $$('[data-pick]', panel).forEach(b => b.addEventListener('click', () => pick(b.dataset.pick)));
      const draw = () => {
        const c = name => $(`[data-g="${name}"]`, panel);
        if (c('o1')) pictures.o1(c('o1'), v);
        if (c('o3f')) { pictures.o3(c('o3f'), {boxes: v.floor_boxes}); pictures.o3(c('o3r'), v); }
        if (c('o4f')) { pictures.o4(c('o4f'), {...v, routes: v.floor_routes}); pictures.o4(c('o4r'), v); }
        if (c('o5f')) { const end = Math.max(...v.floor_runs.map(r => r[2]));  // one time axis for both, so lengths compare
          pictures.o5(c('o5f'), {...v, runs: v.floor_runs, end}); pictures.o5(c('o5r'), {...v, end}); }
        if (c('o7')) pictures.o7(c('o7'), v);
        paintModel(); scaleFrames(panel);
      };
      draw(); redraws.splice(0, redraws.length, draw);
      if (fam.id === 'o2') stop = player(panel, v);
      const first = mine.find(r => r.cost != null);  // start on the first valid answer, in board order
      if (first && fam.id !== 'o2') pick(first.model);
      if (location.hash !== '#' + fam.id) window.history.replaceState(null, '', '#' + fam.id);
    };
    const tabs = $$('[data-tab]', el);
    tabs.forEach((b, i) => {
      b.addEventListener('click', () => open(b.dataset.tab));
      b.addEventListener('keydown', e => {  // arrow keys, Home and End move between tabs and open them
        const k = {ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1}[e.key];
        if (k === undefined) return;
        e.preventDefault(); const t = tabs[(k + tabs.length) % tabs.length]; t.focus(); open(t.dataset.tab);
      });
    });
    window.addEventListener('hashchange', () => open(location.hash.slice(1)));
    open((location.hash || '#o1').slice(1));
    window.addEventListener('resize', () => redraws.forEach(fn => fn()), {passive: true});
  }
  function player(panel, v) {
    const c = $('[data-player]', panel), turn = $('[data-turn]', panel), pick = $('[data-match]', panel), btn = $('[data-play]', panel);
    let r = v.replays[0], k = 0, playing = false, raf = 0, last = 0;
    const show = () => {
      const fr = r.frames[k]; drawArena(c, {grid: v.grid, bases: v.bases}, fr); turn.value = k;
      const won = fr.hp[1] <= 0 ? r.players[0] : fr.hp[0] <= 0 ? r.players[1] : null;
      $('[data-result]', panel).innerHTML = `Turn <b class="mono">${fr.t}</b>. Base health <b class="mono">${Math.max(0, fr.hp[0])}</b> (${esc(r.players[0])}) vs <b class="mono">${Math.max(0, fr.hp[1])}</b> (${esc(r.players[1])}).${won ? ` <b>${esc(won)} wins.</b>` : ''}`;
    };
    const tick = now => { if (!playing) return; if (now - last > 90) { last = now; if (k < r.frames.length - 1) { k++; show(); } else setPlaying(false); } if (playing) raf = requestAnimationFrame(tick); };
    function setPlaying(on) { playing = on; btn.innerHTML = icon(on ? 'pause' : 'play'); btn.setAttribute('aria-label', on ? 'Pause' : 'Play');
      btn.setAttribute('aria-pressed', String(on)); if (on) raf = requestAnimationFrame(tick); }
    const load = i => { r = v.replays[i]; k = 0; turn.max = r.frames.length - 1; show(); };
    pick.addEventListener('change', () => { load(Number(pick.value)); setPlaying(!reduce); });
    turn.addEventListener('input', () => { k = Number(turn.value); setPlaying(false); show(); });
    btn.addEventListener('click', () => { if (k >= r.frames.length - 1) k = 0; setPlaying(!playing); });
    load(0); setPlaying(!reduce); redraws.splice(0, redraws.length, show);
    return () => { playing = false; cancelAnimationFrame(raf); };
  }

  // ---------- load ----------
  const get = name => fetch('data/' + name + '.json', {cache: 'no-cache'}).then(r => { if (!r.ok) throw new Error(name); return r.json(); });
  const needsPictures = ['home', 'gallery'].includes(document.body.dataset.page);
  Promise.all([get('facts'), needsPictures ? get('visuals') : {}, get('board'), get('gallery').catch(() => ({runs: []}))]).then(([f, vis, b, gal]) => {
    bindFacts(f); history(f); bento(f, vis); calc(f); board(f, b, document.body.dataset.page === 'board'); integrity(f); stats(f);
    arena(vis); families(f); method(f); gallery(f, vis, gal); reveal();
  }).catch(() => {
    $$('[data-bento], [data-board-main], [data-families]').forEach(el => { el.innerHTML = '<div class="empty"><h3>The data did not load.</h3><p>Open this site through a web server, not from a file.</p></div>'; });
  });
})();
