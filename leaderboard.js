"use strict";
/* DEADLINE public results page. Vanilla JS + inline SVG only; no frameworks, no external requests.
   Every entry-provided string passes through esc() before it reaches innerHTML. */

const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtScore = n => Number.isFinite(n) ? n.toFixed(2) : "—";
const EMPTY_BOARD = '<p class="empty">No graded results match these filters.</p>';

/* ---- local brand marks; source and license in logos/README.md ---- */
const PROVIDERS = {
  anthropic: {logo: "anthropic", color: "var(--c-anthropic)"},
  claude: {logo: "claude", color: "var(--c-anthropic)", multicolor: true},
  openai: {logo: "openai", color: "var(--c-openai)"},
  google: {logo: "google", color: "var(--c-google)"},
  gemini: {logo: "gemini", color: "var(--c-google)", multicolor: true},
  deepseek: {logo: "deepseek", color: "var(--c-deepseek)", multicolor: true},
  minimax: {logo: "minimax", color: "var(--c-minimax)", multicolor: true},
  meta: {logo: "meta", color: "var(--c-meta)"},
  "meta-llama": {logo: "meta", color: "var(--c-meta)"},
  mistral: {logo: "mistral", color: "var(--c-mistral)"},
  mistralai: {logo: "mistral", color: "var(--c-mistral)"},
  qwen: {logo: "qwen", color: "var(--c-qwen)"},
  alibaba: {logo: "qwen", color: "var(--c-qwen)"},
  xai: {logo: "xai", color: "var(--c-xai)"},
  "x-ai": {logo: "xai", color: "var(--c-xai)"},
};
const GENERIC = {logo: "generic", color: "var(--c-other)"};
function providerOf(model) {
  const parts = String(model || "").trim().toLowerCase().split("/");
  const name = parts.at(-1), prefix = parts[0];
  if (/^claude/.test(name)) return PROVIDERS.claude;
  if (/^gemini/.test(name)) return PROVIDERS.gemini;
  if (PROVIDERS[prefix]) return PROVIDERS[prefix];
  if (/^(gpt|o\d)/.test(prefix)) return PROVIDERS.openai;
  if (/^gemma/.test(prefix)) return PROVIDERS.google;
  if (/^deepseek/.test(prefix)) return PROVIDERS.deepseek;
  if (/^minimax/.test(prefix)) return PROVIDERS.minimax;
  return GENERIC;
}
function logoHTML(model) {
  const p = providerOf(model);
  const url = "logos/" + p.logo + ".svg?v=2";
  if (p.multicolor) return `<img class="plogo" src="${url}" width="18" height="18" alt="" aria-hidden="true">`;
  return `<span class="plogo" style="background:${p.color};-webkit-mask-image:url('${url}');mask-image:url('${url}')" aria-hidden="true"></span>`;
}

/* ---- provenance cohorts: official/community x api/agent, never mixed ---- */
const COHORTS = ["official/api", "official/agent", "community/api", "community/agent"];
const COHORT_LABEL = {
  "official/api": "Official / API", "official/agent": "Official / Agent",
  "community/api": "Community / API", "community/agent": "Community / Agent",
};
const cohortOf = r => (r.official ? "official" : "community") + "/" + (["agent", "sub"].includes(modeOf(r)) ? "agent" : "api");

const preciseScore = r => r.score_analysis?.score_unrounded ?? r.score;
const fmtCount = n => new Intl.NumberFormat("en", {notation:"compact", maximumFractionDigits:1}).format(n);
function modeOf(r) { return r.mode || (r.tokens_out || r.cost_usd != null ? "api" : "sub"); }
function runCost(r) {
  if (Number.isFinite(r.cost_usd)) return r.cost_usd;
  const p = PRICES[r.model];
  if (!p || (!r.tokens_in && !r.tokens_out)) return null;
  const cost = (r.tokens_in || 0) / 1e6 * p.in + (r.tokens_out || 0) / 1e6 * p.out;
  return Number.isFinite(cost) ? cost : null;
}
/* ---- sortable score columns ---- */
const SORTS = {
  score: {label: "Correctness", get: preciseScore},
  dscore: {label: "Token DL", get: r => Number.isFinite(r.dscore) ? r.dscore : null},
  tdl: {label: "TIME-DL", get: r => Number.isFinite(r.tdl_score) ? (r.tdl_score_unrounded ?? r.tdl_score) : null},
};

/* ---- frontier chart axes ---- */
const METRICS = {
  cost: {label: "cost per run", get: runCost,
         fmt: v => "$" + v.toFixed(v < 0.1 ? 3 : 2), invert: true},
  tokens: {label: "output tokens", get: r => Number.isFinite(r.tokens_out) && (modeOf(r) === "api" || r.metering_source) ? r.tokens_out : null,
           fmt: v => v >= 1000 ? (v / 1000).toFixed(0) + "k" : String(Math.round(v)), invert: true},
  seconds: {label: "run time", get: r => Number.isFinite(r.seconds) ? r.seconds : null,
            fmt: v => Math.round(v) + "s", invert: true},
  eff: {label: "output tokens per point", get: r => r.tokens_out && r.score > 0 ? r.tokens_out / r.score : null,
        fmt: v => v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0), invert: true},
  tdl: {label: "TIME-DL", get: r => Number.isFinite(r.tdl_score) ? r.tdl_score : null,
        fmt: v => v.toFixed(0), invert: false},
};

let manifest = null, results = [], PRICES = {}, cohort = "all", metric = "cost", sortKey = "score", sortAsc = false;

/* suite guard: entries graded against a different version or suite hash never mix in */
function displayed() {
  if (!manifest || !Array.isArray(results)) return [];
  const effort = document.getElementById("f-effort").value;
  return results.filter(r => r && r.benchmark_version === manifest.benchmark_version &&
    r.suite_hash === manifest.suite_hash && r.measurement_status !== "incomplete" &&
    r.complete !== false && r.pilot !== true && r.leaderboard_eligible !== false &&
    Number.isFinite(r.score) &&
    (cohort === "all" || cohortOf(r) === cohort || cohortOf(r).startsWith(cohort + "/")) &&
    (effort === "all" || r.effort === effort));
}

function compareEntries(a, b) {
  const get = SORTS[sortKey].get, va = get(a), vb = get(b);
  if (va == null && vb == null) return 0;
  if (va == null) return 1;   /* nulls last regardless of direction */
  if (vb == null) return -1;
  return sortAsc ? va - vb : vb - va;
}
function grouped(rows) {
  const groups = [];
  for (const key of COHORTS) {
    const members = rows.filter(r => cohortOf(r) === key).sort(compareEntries);
    if (members.length) groups.push([key, members]);
  }
  return groups;
}

function scoreCellHTML(r) {
  if (!Number.isFinite(r.score)) {
    return '<span class="score-v null">—</span>';
  }
  const err = Number.isFinite(r.score_err) ? `<span class="err">±${r.score_err}</span>` : "";
  const value = Number.isFinite(preciseScore(r)) ? preciseScore(r) : r.score;
  const fill = Math.max(0, Math.min(100, value));
  return `<span class="score-gauge" style="--score-color:${providerOf(r.model).color}"><span class="score-number"><span class="score-v" title="Unrounded: ${value}">${fmtScore(r.score)}</span>${err}</span><span class="score-track" aria-hidden="true"><span class="score-fill" style="width:${fill}%"></span></span></span>`;
}

function tokenScoreCellHTML(r) {
  const estimated = Number.isFinite(r.dscore) && r.dscore_estimated === true;
  return `<span class="score-v alt"${estimated ? ' title="Estimated Token DL; assumptions in the post-mortem"' : ""}>${estimated ? "≈" : ""}${fmtScore(r.dscore)}</span>`;
}

function measurementDetailsHTML(r) {
  return `<p class="td-meta">Full-pass points: ${fmtScore(r.strict_score)}/100. Grader: ${esc(r.benchmark_version || "legacy")} / ${esc((r.suite_hash || "unrecorded").slice(0,12))}.
    ${(r.samples || 1) === 1 ? "Single sample; repeat spread unmeasured." : `${r.samples} attempts per task; spread is repeat standard deviation.`}
    ${r.settings_verified ? (r.settings_verification_basis ? `Generation settings checked: ${esc(r.settings_verification_basis)}.` : "Generation settings verified.") : "Generation settings not independently verified."}</p>` +
    (r.tdl_score != null ? `<p class="td-meta">TIME-DL is a descriptive estimate from saved answer timestamps, not measured latency.${(r.tdl_missing_tasks || []).length ? ` ${(r.tdl_missing_tasks || []).length} task(s) have no usable interval and get no time discount, which can overstate it.` : ""}</p>` : "");
}

function detailHTML(r, cols) {
  if (!r.task_detail) return "";
  const rows = Object.entries(r.task_detail).map(([t, d]) => {
    let v, cls;
    if (d.scored === false) { v = "UNSCORED"; cls = "skip"; }
    else if (d.credit == null) { v = "INCOMPLETE"; cls = "skip"; }
    else if (d.credit >= 1) { v = "PASS"; cls = "ok"; }
    else if (d.credit > 0) { v = `PART ${Math.min(99.99, d.credit * 100).toFixed(2)}%`; cls = "part"; }
    else if (d.credit < 0) { v = `WRONG ${Math.round(d.credit * 1000) / 10}%`; cls = "bad"; }
    else if ((d.note || "").toLowerCase().includes("skip")) { v = "SKIP"; cls = "skip"; }
    else { v = "FAIL"; cls = "bad"; }
    return `<div class="td-row">
      <span class="td-name">${esc(t)}</span>
      <span class="td-diff ${esc(d.difficulty)}">${esc(d.difficulty)}</span>
      <span class="td-pts" title="Task maximum: ${d.points} points">${fmtScore(d.contribution)} /100</span>
      <span class="td-verdict ${cls}">${v}</span>
      <span class="td-note">${esc(d.note || "")}${d.seconds ? ` <i>[${Math.round(d.seconds)}s]</i>` : ""}</span>
    </div>`;
  }).join("");
  return `<tr class="detail-tr" hidden><td colspan="${cols}"><div class="task-detail">
    ${r.analysis ? `<p class="td-analysis">${esc(r.analysis)}</p>` : ""}
    ${r.commentary ? `<p class="td-comm">${esc(r.commentary)}</p>` : ""}
    ${measurementDetailsHTML(r)}${rows}
  </div></td></tr>`;
}


/* ---- leaderboard ---- */
function renderLeaderboard() {
  const host = document.getElementById("leaderboard");
  const rows = displayed();
  if (!rows.length) { host.innerHTML = EMPTY_BOARD; return; }
  const COLS = 10;
  const arrow = k => sortKey === k ? (sortAsc ? " ▴" : " ▾") : "";
  const th = (k, tip) => `<th scope="col" class="num sortable${sortKey === k ? " on" : ""}" data-sort="${k}" aria-sort="${sortKey === k ? (sortAsc ? "ascending" : "descending") : "none"}"><button type="button" class="sort-button" title="${tip} — click to sort">${SORTS[k].label}${arrow(k)}</button></th>`;
  const head = `<thead><tr><th></th><th>Model</th>
    ${th("score", "Correctness using published task points")}
    ${th("dscore", "Separate token-efficiency metric; community usage is client reported")}
    <th class="num">Tasks</th>
    ${th("tdl", "Descriptive time-discounted estimate; timing assumptions in each post-mortem")}<th class="num">Out tok</th><th class="num">Cost</th><th class="num">Time</th><th>Date</th></tr></thead>`;
  let body = "";
  for (const [key, members] of grouped(rows)) {
    if (grouped(rows).length > 1) body += `<tr class="cohort-tr"><td colspan="${COLS}">${COHORT_LABEL[key]} — ranked within this cohort only</td></tr>`;
    members.forEach((r, i) => {
      body += `<tr class="click-row" title="click for the breakdown">
        <td class="rank"><button class="detail-toggle" aria-expanded="false" aria-label="Show details for ${esc(r.model)} ${esc(r.effort || "")}"><span class="chev">▸</span></button>${String(1 + members.filter(other => preciseScore(other) > preciseScore(r) + 1e-10).length).padStart(2, "0")}</td>
        <td class="mname">${logoHTML(r.model)}${esc(r.model)}${r.effort ? `<span class="eff">[${esc(r.effort)}]</span>` : ""}</td>
        <td class="num">${scoreCellHTML(r)}</td>
        <td class="num">${tokenScoreCellHTML(r)}</td>
        <td class="num">${Number(r.passed)}/${Number(r.total)}</td>
        <td class="num"><span class="score-v alt">${fmtScore(r.tdl_score)}</span></td>
        <td class="num">${METRICS.tokens.get(r) != null ? (r.tokens_out_estimated ? '<span title="Estimated output tokens; assumptions in the post-mortem">≈' + r.tokens_out.toLocaleString("en-US") + '</span>' : r.tokens_out.toLocaleString("en-US")) : "—"}</td>
        <td class="num">${runCost(r) != null ? (r.cost_is_lower_bound ? "≥" : "") + "$" + runCost(r).toFixed(4) : "—"}</td>
        <td class="num">${Number.isFinite(r.seconds) ? Math.round(r.seconds) + "s" : "—"}</td>
        <td class="date">${esc((r.when || "").replace(/^(\d{4})(\d{2})(\d{2}).*/, "$1-$2-$3"))}</td></tr>` + detailHTML(r, COLS);
    });
  }
  host.innerHTML = `<table class="leaderboard-table">${head}<tbody>${body}</tbody></table>`;
}

/* Labels may move; data points always retain their exact chart coordinates. */
function placeChartLabels(points, bounds) {
  const gap = 6, placed = [];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const overlaps = (a, b) => a.x < b.x + b.width + gap && a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
  const coversPoint = (box, p) => Math.hypot(p.x - clamp(p.x, box.x, box.x + box.width),
    p.y - clamp(p.y, box.y, box.y + box.height)) < 15;
  const crossesLabel = (ax, ay, bx, by, box) => {
    let enter = 0, leave = 1;
    for (const [start, delta, min, max] of [[ax, bx - ax, box.x - 2, box.x + box.width + 2],
      [ay, by - ay, box.y - 2, box.y + box.height + 2]]) {
      if (Math.abs(delta) < 1e-8) { if (start < min || start > max) return false; }
      else {
        const a = (min - start) / delta, b = (max - start) / delta;
        enter = Math.max(enter, Math.min(a, b)); leave = Math.min(leave, Math.max(a, b));
        if (enter > leave) return false;
      }
    }
    return true;
  };
  // Place from top to bottom, retaining stable order for coincident results.
  const ordered = points.map((p, i) => ({...p, index: i})).sort((a, b) => a.y - b.y || a.x - b.x || a.index - b.index);
  for (const p of ordered) {
    let best = null, bestCost = Infinity;
    const consider = (x, y) => {
      const box = {x, y, width: p.width, height: p.height};
      if (x < bounds.left || x + p.width > bounds.right || y < bounds.top || y + p.height > bounds.bottom ||
          placed.some(other => overlaps(box, other)) || points.some(point => coversPoint(box, point))) return;
      const edgeX = clamp(p.x, x, x + p.width), edgeY = clamp(p.y, y, y + p.height);
      const dx = edgeX - p.x, dy = edgeY - p.y, length = Math.hypot(dx, dy);
      const crossing = placed.some(other => crossesLabel(p.x, p.y, edgeX, edgeY, other) ||
        crossesLabel(points[other.index].x, points[other.index].y, other.edgeX, other.edgeY, box));
      const crossesPoint = length > 24 && points.some(point => {
        if (Math.hypot(point.x - p.x, point.y - p.y) < 1) return false;
        const t = clamp(((point.x - p.x) * dx + (point.y - p.y) * dy) / (length * length), 10 / length, 1);
        return Math.hypot(point.x - p.x - t * dx, point.y - p.y - t * dy) < 13;
      });
      const cost = length + Math.abs(y + p.height / 2 - p.y) * .15 + (crossing || crossesPoint ? 10000 : 0);
      if (cost < bestCost) { best = {...box, index: p.index, edgeX, edgeY}; bestCost = cost; }
    };
    const targetY = clamp(p.y - p.height / 2, bounds.top, bounds.bottom - p.height);
    for (let distance = 0; distance <= bounds.bottom - bounds.top; distance += 6) {
      for (const dy of distance ? [-distance, distance] : [0]) {
        const y = clamp(targetY + dy, bounds.top, bounds.bottom - p.height);
        for (let offset = 0; offset <= 144; offset += 24) {
          consider(p.x + 17 + offset, y);
          consider(p.x - 17 - p.width - offset, y);
        }
        consider(clamp(p.x - p.width / 2, bounds.left, bounds.right - p.width), y);
      }
    }
    // Dense clusters may need horizontal displacement as well as vertical spacing.
    if (!best || bestCost >= 10000) {
      for (let y = bounds.top; y + p.height <= bounds.bottom; y += 2)
        for (let x = bounds.left; x + p.width <= bounds.right; x += 4) consider(x, y);
    }
    if (!best) return null;
    placed.push(best);
  }
  return placed.sort((a, b) => a.index - b.index);
}

function arrangeFrontierLabels(host, bounds) {
  const groups = [...host.querySelectorAll(".pt")];
  if (!groups.length) return;
  const points = groups.map(group => {
    const label = group.querySelector(".point-label"), box = label.getBBox();
    return {x: Number(group.dataset.x), y: Number(group.dataset.y),
      width: box.width, height: box.height, label, box, leader: group.querySelector(".label-leader")};
  });
  const placements = placeChartLabels(points, bounds);
  if (!placements) return;
  points.forEach((p, i) => {
    const label = placements[i];
    p.label.setAttribute("transform", `translate(${label.x - p.box.x},${label.y - p.box.y})`);
    const length = Math.hypot(label.edgeX - p.x, label.edgeY - p.y);
    const startX = p.x + (label.edgeX - p.x) * 10 / length;
    const startY = p.y + (label.edgeY - p.y) * 10 / length;
    p.leader.setAttribute("d", `M${startX},${startY} L${label.edgeX},${label.edgeY}`);
    p.leader.style.display = length > 24 ? "" : "none";
  });
}

/* ---- frontier chart with axis toggle and error whiskers ---- */
function renderFrontier() {
  const host = document.getElementById("c-frontier");
  const M = METRICS[metric];
  document.getElementById("metric-name").textContent = M.label;
  const rows = displayed().filter(r => Number.isFinite(r.score) && M.get(r) != null);
  if (!rows.length) {
    host.innerHTML = displayed().length
      ? `<div class="empty">No ${M.label} measurements for the displayed entries.</div>`
      : `<div class="chart-empty"><div class="empty-mark" aria-hidden="true"><i></i><i></i><i></i></div>${EMPTY_BOARD}<p>Completed, verified runs will appear here.</p></div>`;
    return;
  }
  const W = 980, H = Math.max(440, rows.length * 30 + 110), L = 50, R = 30, T = 26, B = 48;
  const maxV = Math.max(...rows.map(M.get)) * 1.12 || 1;
  const x = v => L + (W - L - R) * (M.invert ? 1 - v / maxV : v / maxV);
  const y = s => T + (H - T - B) * (1 - Math.max(0, Math.min(100, s)) / 100);
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Score versus ${M.label}">`;
  for (let s = 0; s <= 100; s += 20) {
    svg += `<line x1="${L}" y1="${y(s)}" x2="${W - R}" y2="${y(s)}" stroke="var(--axis)" stroke-width="1" stroke-dasharray="1 6"/>`;
    svg += `<text class="axis-doto" x="${L - 9}" y="${y(s) + 5}" text-anchor="end" fill="var(--muted)">${s}</text>`;
  }
  for (let i = 0; i <= 4; i++) {
    const v = maxV * i / 4;
    svg += `<line x1="${x(v)}" y1="${y(0)}" x2="${x(v)}" y2="${y(0) + 5}" stroke="var(--axis)"/>`;
    svg += `<text class="axis-mono" x="${x(v)}" y="${H - 22}" text-anchor="middle" fill="var(--muted)">${M.fmt(v)}</text>`;
  }
  svg += `<text class="tag" x="${(L + W - R) / 2}" y="${H - 5}" text-anchor="middle" fill="var(--muted)">${M.label.toUpperCase()}${M.invert ? " — RIGHT = LESS" : " — RIGHT = MORE"}</text>`;
  svg += `<line x1="${L}" y1="${y(0)}" x2="${W - R}" y2="${y(0)}" stroke="var(--red)" stroke-width="2"/>`;
  rows.forEach(r => {
    const p = providerOf(r.model), v = M.get(r), sc = r.score;
    const px = x(v), py = y(sc);
    const tip = `${esc(r.model)}${r.effort ? " [" + esc(r.effort) + "]" : ""} — ${COHORT_LABEL[cohortOf(r)]}
Score ${fmtScore(sc)}${Number.isFinite(r.score_err) ? " ±" + r.score_err : ""} · ${M.label} ${metric === "cost" && r.cost_is_lower_bound ? "≥" : ["tokens", "eff"].includes(metric) && r.tokens_out_estimated ? "≈" : ""}${M.fmt(v)}`;
    svg += `<g class="pt" data-x="${px}" data-y="${py}"><title>${tip}</title><path class="label-leader" fill="none" stroke="${p.color}" stroke-width="1" opacity=".45" pointer-events="none"/>`;
    if ((r.samples || 0) >= 3 && Number.isFinite(r.score_err) && r.score_err > 0) {
      const yTop = y(sc + r.score_err), yBot = y(sc - r.score_err);
      svg += `<g class="whisker" stroke="${p.color}" stroke-width="1.5" opacity="0.7">
        <line x1="${px}" y1="${yTop}" x2="${px}" y2="${yBot}"/>
        <line x1="${px - 4}" y1="${yTop}" x2="${px + 4}" y2="${yTop}"/>
        <line x1="${px - 4}" y1="${yBot}" x2="${px + 4}" y2="${yBot}"/></g>`;
    }
    svg += `<circle cx="${px}" cy="${py}" r="12" fill="${p.color}" opacity="0.14"/>`;
    svg += r.official
      ? `<circle cx="${px}" cy="${py}" r="6.5" fill="${p.color}" stroke="var(--surface)" stroke-width="2"/>`
      : `<circle cx="${px}" cy="${py}" r="5.5" fill="var(--surface)" stroke="${p.color}" stroke-width="2.5"/>`;
    const onRight = px > W - 190;
    const labelX = px + (onRight ? -12 : 12);
    svg += `<g class="point-label" transform="translate(${labelX},${py - 4})"><text class="mlabel" x="0" y="0" fill="${p.color}">${esc(String(r.model))}</text>`;
    svg += `<text class="tag" x="0" y="12" fill="var(--muted)">${esc(r.effort || "default").toUpperCase()} / ${COHORT_LABEL[cohortOf(r)].toUpperCase()}</text></g>`;
    svg += `</g>`;
  });
  svg += `</svg>`;
  host.innerHTML = svg;
  const chart = host.firstElementChild;
  const bounds = {left: L + 4, right: W - 8, top: 8, bottom: H - B - 6};
  arrangeFrontierLabels(host, bounds);
  // Web fonts can change text widths after the first render.
  if (document.fonts) document.fonts.ready.then(() => {
    if (host.firstElementChild === chart) arrangeFrontierLabels(host, bounds);
  });
}

/* ---- hardest tasks board ---- */
function renderHardest() {
  const host = document.getElementById("hardest");
  const rows = displayed().filter(r => r.task_detail && Object.keys(r.task_detail).length);
  if (rows.length < 2) { host.innerHTML = '<p class="empty">Needs at least two graded entries.</p>'; return; }
  const byTask = new Map();
  for (const r of rows) for (const [id, d] of Object.entries(r.task_detail)) {
    if (d.scored === false || !Number.isFinite(d.credit)) continue;
    if (!byTask.has(id)) byTask.set(id, []);
    byTask.get(id).push(Number.isFinite(d.credit) ? d.credit : 0);
  }
  const meta = new Map((manifest.tasks || []).map(t => [t.id, t]));
  const ranked = [...byTask.entries()]
    .filter(([, credits]) => credits.length >= 2)
    .map(([id, credits]) => ({id, n: credits.length, mean: credits.reduce((a, c) => a + c, 0) / credits.length}))
    .sort((a, b) => a.mean - b.mean).slice(0, 10);
  host.innerHTML = ranked.map((t, i) => {
    const m = meta.get(t.id) || {};
    const cls = t.mean < 0 ? "neg" : (t.mean >= 0.995 ? "full" : "part");
    return `<div class="hardest-row">
      <span class="rank">${String(i + 1).padStart(2, "0")}</span>
      <span class="td-name">${esc(m.title || t.id)}</span>
      <span class="mchip famchip">${esc(m.family || "unknown family")}</span>
      <span class="td-diff ${esc(m.difficulty || "")}">${esc(m.difficulty || "")}</span>
      <span class="hm-mean ${cls}">${(t.mean * 100).toFixed(0)}% mean credit · n=${t.n}</span>
    </div>`;
  }).join("");
}

/* ---- task browser (count-agnostic: everything derives from the manifest) ---- */
function renderTasks() {
  const family = document.getElementById("task-family").value;
  const level = document.getElementById("task-level").value;
  const query = (document.getElementById("task-search")?.value || "").trim().toLowerCase();
  const all = manifest.tasks || [];
  const tasks = all.filter(t => (!family || t.family === family) && (!level || t.difficulty === level) &&
    (!query || `${t.id} ${t.title} ${t.family} ${t.language}`.toLowerCase().includes(query)));
  document.getElementById("task-count").textContent = `${tasks.length} / ${all.length} tasks`;
  const body = tasks.map(t => `<tr><td class="task-no">${esc(String(t.id).split("_")[0])}</td>
    <td><a href="prompts/${encodeURIComponent(t.id)}.md">${esc(t.title)}</a></td>
    <td>${esc(t.family)}</td><td>${esc(t.difficulty)}</td><td>${esc(t.language)}</td>
    <td class="num" title="${esc(t.unscored_reason || "Published task points")}">${t.scored === false ? "UNSCORED" : Number(t.points)}</td><td class="num">${Number(t.budget).toLocaleString("en-US")}</td><td class="num">${Number(t.time_budget)}s</td></tr>`).join("");
  document.getElementById("task-table").innerHTML =
    '<caption class="visually-hidden">Public tasks and budgets</caption><thead><tr><th>#</th><th>Task</th><th>Family</th><th>Level</th><th>Lang</th><th class="num">Points</th><th class="num">Token budget</th><th class="num">Time budget</th></tr></thead><tbody>' +
    (body || '<tr><td colspan="8" class="empty">No tasks match these filters.</td></tr>') + "</tbody>";
}

function renderStats() {
  const tasks = manifest.tasks || [];
  const total = document.getElementById("task-total");
  if (total) total.textContent = String(tasks.length);
  const families = new Set(tasks.filter(t => t.scored !== false).map(t => t.family)).size;
  const stats = document.getElementById("hero-stats");
  if (stats) {
    stats.innerHTML = [["Tasks", tasks.length], ["Max score", 100], ["Models", new Set(results.map(r => r.model)).size], ["Runs", results.length], ["Submissions", results.filter(r => !r.official).reduce((sum, r) => sum + (r.samples || 1), 0)]]
      .map(([label, value]) => `<div class="stat"><span class="sl">${label}</span><span class="sv">${value}</span></div>`).join("");
  }
  document.querySelectorAll(".ticker-task-count").forEach(el => { el.textContent = tasks.length; });
  const line = document.getElementById("suite-line");
  if (line) line.textContent = `${families} families. ${tasks.filter(t => t.scored !== false).length} scored tasks, totaling ${tasks.reduce((sum, t) => sum + t.points, 0).toLocaleString("en-US")} points. Task 24 remains unscored.`;
}

function renderBoards() { renderLeaderboard(); renderFrontier(); renderHardest(); }
function renderAll() { renderStats(); renderTasks(); renderBoards(); }

function wire() {
  document.getElementById("f-effort").addEventListener("change", renderBoards);
  for (const id of ["task-family", "task-level"]) document.getElementById(id).addEventListener("change", renderTasks);
  document.getElementById("task-search")?.addEventListener("input", renderTasks);
  document.getElementById("cohort-chips").addEventListener("click", e => {
    const chip = e.target.closest && e.target.closest(".chip");
    if (!chip || !chip.dataset.cohort) return;
    cohort = chip.dataset.cohort;
    document.querySelectorAll("#cohort-chips .chip").forEach(c => { c.classList.toggle("on", c === chip); c.setAttribute("aria-pressed", String(c === chip)); });
    renderBoards();
  });
  document.getElementById("metric-chips").addEventListener("click", e => {
    const chip = e.target.closest && e.target.closest(".chip");
    if (!chip || !chip.dataset.metric) return;
    metric = chip.dataset.metric;
    document.querySelectorAll("#metric-chips .chip").forEach(c => { c.classList.toggle("on", c === chip); c.setAttribute("aria-pressed", String(c === chip)); });
    renderFrontier();
  });
  document.getElementById("leaderboard").addEventListener("click", e => {
    const th = e.target.closest && e.target.closest("th.sortable");
    if (th) {
      const key = th.dataset.sort;
      if (key === sortKey) sortAsc = !sortAsc; else { sortKey = key; sortAsc = false; }
      renderLeaderboard();
      document.querySelector(`#leaderboard th[data-sort="${key}"] button`)?.focus({preventScroll:true});
      return;
    }
    const tr = e.target.closest && e.target.closest("tr.click-row");
    if (tr) {
      const det = tr.nextElementSibling;
      if (det && det.classList.contains("detail-tr")) {
        det.hidden = !det.hidden;
        tr.classList.toggle("open", !det.hidden);
        const btn = tr.querySelector("button");
        if (btn) btn.setAttribute("aria-expanded", String(!det.hidden));
      }
    }
  });
}

async function init() {
  const [tasks, official, community, prices] = await Promise.all(
    ["data/tasks.json", "data/official.json", "data/community.json", "prices.json"].map(async path => {
      const response = await fetch(path, {cache: "no-store"});
      if (!response.ok) throw new Error("Unavailable data");
      return response.json();
    }));
  if (!tasks || Array.isArray(tasks) || !Object.keys(tasks).length ||
      !Array.isArray(official) || !Array.isArray(community)) throw new Error("Invalid result data");
  const timeBudgets = {medium:60, hard:120, brutal:240, nightmare:450};
  manifest = {
    benchmark_version: "deadline-3.4",
    suite_hash: "eecf5b0a714cbb6e5303c666fe78dd49c404fa140c643fe84cf231316a28a1f5",
    tasks: Object.entries(tasks).map(([id, task]) => ({...task, id, title:id,
      language: id.includes("_js_") ? "JavaScript" : id.includes("_sql_") ? "SQL" : "Python",
      time_budget: timeBudgets[task.difficulty]})),
  };
  results = [...official, ...community]; PRICES = prices;
  const families = [...new Set(manifest.tasks.map(t => t.family))].sort();
  document.getElementById("task-family").innerHTML = '<option value="">All families</option>' +
    families.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join("");
  document.getElementById("f-effort").innerHTML = '<option value="all">All efforts</option>' +
    [...new Set(results.map(r => r.effort).filter(Boolean))].sort().map(e => `<option value="${esc(e)}">${esc(e)}</option>`).join("");
  const latest = results.map(r => r.when || "").sort().at(-1);
  document.getElementById("release-status").textContent = "27 public tasks · 26 scored · Saved answers regraded in Docker." +
    (latest ? " Updated " + latest.replace(/^(\d{4})(\d{2})(\d{2}).*/, "$1-$2-$3") + "." : "");
  wire(); renderAll();
}
const ready = init().catch(error => {
  document.getElementById("release-status").textContent = "Results could not be loaded. Please reload to try again.";
  for (const id of ["leaderboard", "c-frontier", "hardest"]) document.getElementById(id).innerHTML = '<p class="empty">Results unavailable.</p>';
  throw error;
});
