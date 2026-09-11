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
/* Version-aware fields: from deadline-3.5 the entry's `score` is the
   token-discounted headline (absent without complete token measurements) and
   `correctness` is the undiscounted score. Earlier versions used correctness
   as the headline. */
const isV35 = r => ["deadline-3.5", "deadline-3.6"].includes(r.benchmark_version);
const isV4 = r => r?.benchmark_version === "deadline-4.0";
const tokenScored = r => isV35(r) || isV4(r);
const headlineOf = r => isV4(r) ? (r.score_unrounded ?? r.score) : isV35(r) ? (Number.isFinite(r.score) ? r.score : null) : preciseScore(r);
const correctnessOf = r => isV4(r) ? (r.correctness_unrounded ?? r.correctness) : isV35(r) ? (r.score_analysis?.score_unrounded ?? r.correctness) : preciseScore(r);
const rankKey = r => headlineOf(r);
const fmtCount = n => new Intl.NumberFormat("en", {notation:"compact", maximumFractionDigits:1}).format(n);
function modeOf(r) { return r.mode || (r.tokens_out || r.cost_usd != null ? "api" : "sub"); }
/* Four rates per model; absent cache rates fall back to in x 0.1 / in x 1.25. */
function priceOf(model) {
  const p = PRICES[model];
  if (!p || !Number.isFinite(p.in) || !Number.isFinite(p.out)) return null;
  return {in: p.in, out: p.out,
    cached_in: Number.isFinite(p.cached_in) ? p.cached_in : p.in * 0.1,
    cache_write: Number.isFinite(p.cache_write) ? p.cache_write : p.in * 1.25};
}
/* Provider receipt first, then the harness/stamped figure, then list pricing. */
function runCost(r) {
  if (r.cost_basis === "billed" && Number.isFinite(r.billed_cost_usd)) return r.billed_cost_usd;
  if (Number.isFinite(r.cost_usd)) return r.cost_usd;
  if (Number.isFinite(r.cost_lower_bound_usd)) return r.cost_lower_bound_usd;
  const p = r.pricing_snapshot?.prices?.[r.model] || r.pricing_snapshot?.rates || priceOf(r.model);
  if (!p || (!r.tokens_in && !r.tokens_out)) return null;
  const u = r.usage || {};
  const cached = Number(u.cached_input_tokens ?? u.cached_in ?? 0) || 0;
  const written = Number(u.cache_write_input_tokens ?? u.cache_write_in ?? 0) || 0;
  const fresh = Math.max(0, (r.tokens_in || 0) - cached - written);
  const cost = (fresh * p.in + cached * (p.cached_in ?? p.in) + written * (p.cache_write ?? p.in) +
                (r.tokens_out || 0) * p.out) / 1e6;
  return Number.isFinite(cost) ? cost : null;
}
/* ---- cost provenance ladder, worst to best ---- */
const COST_BASES = {
  "lower-bound": {label: "≥ LOWER BOUND", tip: "Token classes are missing, so the amount is a floor, not the cost."},
  estimated: {label: "ESTIMATED", tip: "Estimated API cost; source and assumptions are in the post-mortem."},
  computed: {label: "COMPUTED", tip: "Harness-recorded tokens priced with the run's stamped price table."},
  billed: {label: "BILLED", tip: "Provider receipt: the amount actually billed for the run."},
};
function costBasisOf(r) {
  const declared = String(r.cost_basis || "").toLowerCase();
  if (COST_BASES[declared]) return declared;
  if (r.cost_is_lower_bound) return "lower-bound";
  if (Number.isFinite(r.cost_lower_bound_usd) && !Number.isFinite(r.cost_usd)) return "lower-bound";
  if (runCost(r) == null) return null;
  return "estimated";
}
function costChipHTML(r) {
  const key = costBasisOf(r);
  if (!key) return "";
  return `<span class="mchip costchip cb-${key}" title="${COST_BASES[key].tip}">${COST_BASES[key].label}</span>`;
}
/* ---- sortable score columns ---- */
const SORTS = {
  score: {label: "Score", get: headlineOf},
  correctness: {label: "Correctness", get: correctnessOf},
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
  eff: {label: "output tokens per correctness point", get: r => r.tokens_out && correctnessOf(r) > 0 ? r.tokens_out / correctnessOf(r) : null,
        fmt: v => v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0), invert: true},
  ppp: {label: "dollars per correctness point", get: r => {
          const cost = runCost(r), score = correctnessOf(r);
          return cost != null && Number.isFinite(score) && score > 0 ? cost / score : null;
        },
        fmt: v => "$" + v.toFixed(v < 0.1 ? 3 : 2) + "/pt", invert: true},
  tdl: {label: "TIME-DL", get: r => Number.isFinite(r.tdl_score) ? r.tdl_score : null,
        fmt: v => v.toFixed(0), invert: false},
};

let manifest = null, results = [], PRICES = {}, cohort = "all", metric = "cost", sortKey = "score", sortAsc = false;
/* Chart Y-axis measure. Score (discounted headline) is primary; Correctness
   stays selectable — on saturated cohorts correctness is flat at 100 while
   the score still separates entries. */
const MEASURES = {
  score: {label: "Score", get: headlineOf},
  correctness: {label: "Correctness", get: correctnessOf},
};
let chartMeasure = "score";
let versions = {}, datasets = {}, selectedVersion = "4.0";

/* suite guard: entries graded against a different version or suite hash never mix in */
function displayed() {
  if (!manifest || manifest.info_only || !Array.isArray(results)) return [];
  const effort = document.getElementById("f-effort").value;
  const publishedV4 = r => isV4(r) && manifest.published_run_ids?.includes(r.id) && r.publication_override?.ranked === true;
  return results.filter(r => r && r.benchmark_version === manifest.benchmark_version &&
    r.suite_hash === manifest.suite_hash && r.measurement_status !== "incomplete" &&
    r.complete !== false && (publishedV4(r) || (r.pilot !== true && r.calibration_only !== true && r.calibration_regrade !== true && r.leaderboard_eligible !== false)) &&
    (Number.isFinite(r.score) || Number.isFinite(r.correctness)) &&
    (cohort === "all" || cohortOf(r) === cohort || cohortOf(r).startsWith(cohort + "/")) &&
    (effort === "all" || r.effort === effort));
}

function compareEntries(a, b) {
  if (isV4(a) && isV4(b) && sortKey === 'score' && !sortAsc) return compareV4Rank(a, b);
  const get = SORTS[sortKey].get, va = get(a), vb = get(b);
  if (va == null && vb == null) return (correctnessOf(b) ?? -1) - (correctnessOf(a) ?? -1);
  if (va == null) return 1;   /* nulls last regardless of direction */
  if (vb == null) return -1;
  return sortAsc ? va - vb : vb - va;
}
function compareV4Rank(a, b) {
  return Number(b.swept === true) - Number(a.swept === true) ||
    headlineOf(b) - headlineOf(a) || correctnessOf(b) - correctnessOf(a);
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
    return tokenScored(r)
      ? '<span class="score-v null" title="Headline is token-discounted; this run lacks complete token measurements">unmetered</span>'
      : '<span class="score-v null">—</span>';
  }
  const err = Number.isFinite(r.score_err) ? `<span class="err">±${r.score_err}</span>` : "";
  const value = isV4(r) ? headlineOf(r) : isV35(r) ? r.score : (Number.isFinite(preciseScore(r)) ? preciseScore(r) : r.score);
  const fill = Math.max(0, Math.min(100, value));
  const estimated = isV35(r) && r.score_estimated;
  return `<span class="score-gauge" style="--score-color:${providerOf(r.model).color}"><span class="score-number"><span class="score-v" title="${estimated ? 'Estimated from recorded usage and reconstructed interrupted output; details in the post-mortem' : 'Unrounded: ' + value}">${estimated ? '≈' : ''}${fmtScore(r.score)}</span>${err}</span><span class="score-track" aria-hidden="true"><span class="score-fill" style="width:${fill}%"></span></span></span>`;
}

function tokenScoreCellHTML(r) {
  const estimated = Number.isFinite(r.dscore) && r.dscore_estimated === true;
  return `<span class="score-v alt"${estimated ? ' title="Estimated Token DL; assumptions in the post-mortem"' : ""}>${estimated ? "≈" : ""}${fmtScore(r.dscore)}</span>`;
}

function measurementDetailsHTML(r) {
  const measured = r.measurement || {}, spread = measured.correctness, calibration = measured.calibration;
  const evidence = (spread?.samples > 1 ? `<p class="td-meta">Observed correctness range: ${fmtScore(spread.minimum)}–${fmtScore(spread.maximum)} across ${spread.samples} independent samples. This is sample spread, not a confidence interval.</p>` : "") +
    (calibration ? `<p class="td-meta">${calibration.skips} declared skips; ${calibration.incorrect_submissions} incorrect submissions (partial answers included), across ${calibration.resolved} resolved task attempts. These are observed choices, not confidence estimates.</p>` : "");
  return `<p class="td-meta">Full-pass points: ${fmtScore(r.strict_score)}/100. Grader: ${esc(r.benchmark_version || "legacy")} / ${esc((r.suite_hash || "unrecorded").slice(0,12))}.
    ${(r.samples || 1) === 1 ? "Single sample; repeat spread unmeasured." : `${r.samples} attempts per task; spread is repeat standard deviation.`}
    ${r.settings_verified ? (r.settings_verification_basis ? `Generation settings checked: ${esc(r.settings_verification_basis)}.` : "Generation settings verified.") : "Generation settings not independently verified."}</p>` +
    evidence + (r.tdl_score != null ? `<p class="td-meta">${r.timing_source === "harness_wall_clock" && r.timing_verified ? "TIME-DL uses harness-measured task wall time, including the agent's tool calls." : "TIME-DL is a descriptive estimate from saved answer timestamps, not measured latency."}${(r.tdl_missing_tasks || []).length ? ` ${(r.tdl_missing_tasks || []).length} task(s) have no usable interval and get no time discount, which can overstate it.` : ""}</p>` : "");
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
  const calibrationColumn = manifest.benchmark_version === 'deadline-3.6';
  const COLS = calibrationColumn ? 11 : 10;
  const arrow = k => sortKey === k ? (sortAsc ? " ▴" : " ▾") : "";
  const th = (k, tip) => `<th scope="col" class="num sortable${sortKey === k ? " on" : ""}" data-sort="${k}" aria-sort="${sortKey === k ? (sortAsc ? "ascending" : "descending") : "none"}"><button type="button" class="sort-button" title="${tip} — click to sort">${SORTS[k].label}${arrow(k)}</button></th>`;
  const head = `<thead><tr><th></th><th>Model</th>
    ${th("score", "Headline: token-discounted correctness from 3.5; earlier versions list correctness here")}
    ${tokenScored(manifest) ? th("correctness", "Undiscounted correctness using published task points") : th("dscore", "Correctness discounted by output-token usage")}
    <th class="num">Tasks</th>
    ${calibrationColumn ? '<th class="num" title="Declared skips / incorrect submissions, including partial answers. Counts cover all samples.">Skip / wrong</th>' : ''}
    ${th("tdl", "Descriptive time-discounted estimate; timing assumptions in each post-mortem")}<th class="num">Out tok</th><th class="num">Cost</th><th class="num">Time</th><th>Date</th></tr></thead>`;
  let body = "";
  for (const [key, members] of grouped(rows)) {
    if (grouped(rows).length > 1) body += `<tr class="cohort-tr"><td colspan="${COLS}">${COHORT_LABEL[key]} — ranked within this cohort only</td></tr>`;
    members.forEach((r, i) => {
      body += `<tr class="click-row" title="click for the breakdown">
        <td class="rank"><button class="detail-toggle" aria-expanded="false" aria-label="Show details for ${esc(r.model)} ${esc(r.effort || "")}"><span class="chev">▸</span></button>${rankKey(r) == null ? '—' : String(1 + members.filter(other => rankKey(other) != null && (isV4(r) ? compareV4Rank(other, r) < 0 : rankKey(other) > rankKey(r) + 1e-10)).length).padStart(2, "0")}</td>
        <td class="mname">${logoHTML(r.model)}${esc(r.model)}${r.effort ? `<span class="eff">[${esc(r.effort)}]</span>` : ""}</td>
        <td class="num">${scoreCellHTML(r)}</td>
        <td class="num">${tokenScored(r) ? (headlineOf(r) == null ? scoreCellHTML({model:r.model,score:r.correctness}) : '<span class="score-v alt">' + fmtScore(r.correctness) + '</span>') : tokenScoreCellHTML(r)}</td>
        <td class="num">${Number(r.passed)}/${Number(r.total)}</td>
        ${calibrationColumn ? `<td class="num">${r.measurement?.calibration ? r.measurement.calibration.skips + ' / ' + r.measurement.calibration.incorrect_submissions : '—'}</td>` : ''}
        <td class="num"><span class="score-v alt">${fmtScore(r.tdl_score)}</span></td>
        <td class="num">${METRICS.tokens.get(r) != null ? (r.tokens_out_estimated ? '<span title="Estimated output tokens; assumptions in the post-mortem">≈' + r.tokens_out.toLocaleString("en-US") + '</span>' : r.tokens_out.toLocaleString("en-US")) : "—"}</td>
        <td class="num">${runCost(r) != null ? (costBasisOf(r) === "lower-bound" ? "≥" : "") + "$" + runCost(r).toFixed(4) : "—"}${costChipHTML(r)}</td>
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
  const Y = MEASURES[chartMeasure];
  document.getElementById("metric-name").textContent = M.label;
  const measureName = document.getElementById("measure-name");
  if (measureName) measureName.textContent = Y.label;
  const rows = displayed().filter(r => Number.isFinite(Y.get(r)) && M.get(r) != null);
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
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${Y.label} versus ${M.label}">`;
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
    const p = providerOf(r.model), v = M.get(r), sc = Y.get(r);
    const px = x(v), py = y(sc);
    const tip = `${esc(r.model)}${r.effort ? " [" + esc(r.effort) + "]" : ""} — ${COHORT_LABEL[cohortOf(r)]}
${Y.label} ${fmtScore(sc)} · ${M.label} ${["cost", "ppp"].includes(metric) && costBasisOf(r) === "lower-bound" ? "≥" : ["tokens", "eff"].includes(metric) && r.tokens_out_estimated ? "≈" : ""}${M.fmt(v)}`;
    svg += `<g class="pt" data-x="${px}" data-y="${py}"><title>${tip}</title><path class="label-leader" fill="none" stroke="${p.color}" stroke-width="1" opacity=".45" pointer-events="none"/>`;
    const correctSpread = isV35(r) ? r.correctness_err : r.score_err;
    if ((r.samples || 0) >= 3 && Number.isFinite(correctSpread) && correctSpread > 0) {
      const yTop = y(sc + correctSpread), yBot = y(sc - correctSpread);
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
  const v4 = isV4(manifest);
  const family = document.getElementById("task-family").value;
  const level = document.getElementById("task-level").value;
  const query = (document.getElementById("task-search")?.value || "").trim().toLowerCase();
  const all = manifest.tasks || [];
  const tasks = all.filter(t => (!family || t.family === family) && (!level || t.difficulty === level) &&
    (!query || `${t.id} ${t.title} ${t.family} ${t.language}`.toLowerCase().includes(query)));
  document.getElementById("task-count").textContent = `${tasks.length} / ${all.length} tasks`;
  const body = tasks.map(t => `<tr><td class="task-no">${esc(v4 ? t.id.replace(/_wave.*$/, '') : String(t.id).split("_")[0])}</td>
    <td>${manifest.info_only || manifest.task_info_only ? esc(t.title) : `<a href="${manifest.prompts || 'prompts'}/${encodeURIComponent(t.id)}.md">${esc(t.title)}</a>`}</td>
    <td>${esc(t.family)}</td><td>${esc(t.difficulty)}</td><td>${esc(t.language)}</td>
    <td class="num" title="${esc(t.unscored_reason || "Published task points")}">${t.scored === false ? "UNSCORED" : Number(t.points)}</td><td class="num">${v4 ? `Agent ${Number(t.budget).toLocaleString('en-US')} / API ${Number(t.api_budget).toLocaleString('en-US')}` : Number(t.budget).toLocaleString("en-US")}</td><td class="num">${v4 ? Number(t.agent_total_ceiling).toLocaleString('en-US') : Number(t.time_budget) + 's'}</td></tr>`).join("");
  document.getElementById("task-table").innerHTML =
    `<caption class="visually-hidden">Task information and budgets</caption><thead><tr><th>#</th><th>Task</th><th>Family</th><th>Level</th><th>Lang</th><th class="num">Points</th><th class="num">${v4 ? 'Output budgets' : 'Token budget'}</th><th class="num">${v4 ? 'Agent total ceiling' : 'Time budget'}</th></tr></thead><tbody>` +
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
  const unscored = tasks.filter(t => t.scored === false).map(t => Number(t.id.slice(0, 2)));
  if (line) line.textContent = `${families} families. ${tasks.filter(t => t.scored !== false).length} scored tasks, totaling ${tasks.reduce((sum, t) => sum + t.points, 0).toLocaleString("en-US")} points. ${unscored.length ? `${unscored.length === 1 ? 'Task' : 'Tasks'} ${unscored.join(', ')} unscored.` : 'All tasks scored. Difficulty labels are design targets.'}`;
}

function renderStudies() {
  const host=document.getElementById('measurement-studies');
  const data=datasets[selectedVersion]?.studies || {};
  const curves=(data.effort_curves || []).filter(r => r.suite_hash===manifest.suite_hash);
  const deltas=(data.cohort_deltas || []).filter(r => r.suite_hash===manifest.suite_hash);
  host.hidden=!curves.length && !deltas.length;
  if (host.hidden) { host.innerHTML=''; return; }
  let body='<div class="section-heading"><h3>Controlled measurements</h3></div><p class="meta-line">Observed runs on matching task and settings configurations. Single samples do not establish superiority.</p>';
  for (const c of curves) {
    const points=c.points.filter(p=>Number.isFinite(p.tokens_out)&&Number.isFinite(p.score));
    if (!points.length) continue;
    const max=Math.max(1,...points.map(p=>p.tokens_out));
    const coords=points.map(p=>`${40+420*p.tokens_out/max},${135-1.1*p.score}`).join(' ');
    body+=`<div class="study-card"><h4>${esc(c.model)} · ${esc(c.mode)} · effort</h4><svg viewBox="0 0 500 170" role="img" aria-label="Headline score versus output tokens"><path d="M40 20V135H470" fill="none" stroke="var(--border)"/><polyline points="${coords}" fill="none" stroke="var(--red)" stroke-width="2"/>${points.map(p=>`<circle cx="${40+420*p.tokens_out/max}" cy="${135-1.1*p.score}" r="4" fill="var(--red)"><title>${esc(p.effort)}: ${fmtScore(p.score)} score; ${p.tokens_out} output tokens</title></circle>`).join('')}<text x="40" y="160" fill="var(--muted)">0</text><text x="460" y="160" text-anchor="end" fill="var(--muted)">${fmtCount(max)} output tokens</text><text x="10" y="28" fill="var(--muted)">100</text><text x="20" y="138" fill="var(--muted)">0</text></svg><table><thead><tr><th>Effort</th><th>Score</th><th>Output tokens</th><th>$ / correctness point</th><th>Samples</th></tr></thead><tbody>${points.map(p=>`<tr><td>${esc(p.effort)}</td><td>${fmtScore(p.score)}</td><td>${p.tokens_out.toLocaleString('en-US')}</td><td>${Number.isFinite(p.cost_per_point)?'$'+p.cost_per_point.toFixed(4):'—'}</td><td>${Number(p.samples)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  if (deltas.length) body+=`<div class="study-card"><h4>Agent minus API</h4><table><thead><tr><th>Model</th><th>Effort</th><th>Correctness difference</th><th>Headline difference</th><th>Samples per condition</th></tr></thead><tbody>${deltas.map(r=>`<tr><td>${esc(r.model)}</td><td>${esc(r.effort)}</td><td>${fmtScore(r.correctness_delta)}</td><td>${fmtScore(r.headline_delta)}</td><td>${Number(r.samples)}</td></tr>`).join('')}</tbody></table></div>`;
  host.innerHTML=body;
}
function renderBoards() { renderLeaderboard(); renderFrontier(); renderHardest(); renderStudies(); }
function renderAll() { renderStats(); renderTasks(); renderBoards(); }

function wire() {
  document.getElementById("benchmark-version").addEventListener("change", e => selectVersion(e.target.value, true));
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
  const measureChips = document.getElementById("measure-chips");
  if (measureChips) measureChips.addEventListener("click", e => {
    const chip = e.target.closest && e.target.closest(".chip");
    if (!chip || !chip.dataset.measure) return;
    chartMeasure = chip.dataset.measure;
    document.querySelectorAll("#measure-chips .chip").forEach(c => { c.classList.toggle("on", c === chip); c.setAttribute("aria-pressed", String(c === chip)); });
    renderFrontier();
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

const SCORING_COPY = {
  "4.0": `<p>Deadline 4.0 is a separate 72-task suite across nine families and five languages. The 800 task points weight debugging and maintenance at 60%, and inference, exactness, specification compliance and SQL at 40%. API and agent runs are separate lanes.</p><p>Partial credit is q⁴ − 0.15(1 − q)², with q balanced across semantic areas. Every case must pass for full credit. Invalid execution receives −15%; skips earn zero; missing or truncated answers remain incomplete.</p><p>For agents, positive credit is multiplied by min(1, output-token budget / output tokens). Exceeding a task's total-token ceiling forfeits positive credit; negative penalties stay unchanged. Input includes cached reads counted once at face value. Wall time is reported, never scored.</p><p>Output deadlines derive from two thirds of the cheapest observed fully correct solve, rounded up to 250 tokens with a 1,000-token floor. Total ceilings derive from ten times that solve's total tokens, rounded up to 25,000 with a 100,000 floor. Existing limits can only tighten for unchanged tasks. A task without a correct solve starts with no output discount and a payload-based total ceiling; that ceiling also persists under the ratchet.</p><p>Official agent rankings put complete sweeps without ceiling forfeitures first, then deadline score, then correctness. Raw API runs keep a separate output-token scoring regime. Release requires completed calibration, followed by fresh attempts with limits printed beforehand: one full agent sample or three independent API samples. The published Astra entry uses saved calibration answers; its generation and certification details are in the post-mortem.</p>`,
  "3.6": `<p>The headline <b>Score</b> keeps the 3.5 token-discounted scoring rule. Correctness remains visible alongside it. The draft has 45 public tasks, 42 scored, with 18 new tasks requiring fresh answers.</p><p>Credit remains q⁴ − 0.15(1 − q)², balanced across semantic areas and functions. Every private case must pass for full credit. Invalid execution receives −15%; declared skips earn zero; missing and truncated attempts remain incomplete. Token discounts affect positive credit only.</p><p>Tasks 19, 22 and 24 stay unscored. Their successors are new tasks with complete or provably identifiable contracts. New official entries require three independent samples. Calibration subsets are private development evidence and are not leaderboard results.</p>`,
  "3.5": `<p>The headline <b>Score</b> is correctness discounted by output-token usage. Undiscounted Correctness stays visible. Runs without complete usage show “unmetered”; reconstructed estimates are marked ≈.</p><p>The 24 scored tasks total <b>1,050 points</b>. Completed answers earn q⁴ − 0.15(1 − q)² credit, with q balanced across semantic areas and functions. A 90% matched fraction earns 65.46% task credit. Every case must pass for full credit. Invalid execution receives −15%; skips earn zero; unresolved answers remain incomplete.</p><p>Tasks 19, 22 and 24 remain available but unscored. Token discounts affect positive credit only. TIME-DL stays a separate descriptive estimate from archived intervals.</p>`,
  "3.4": `<p>The headline <b>Correctness</b> uses 26 scored tasks totaling <b>1,205 points</b>. Completed answers earn q² − 0.15(1 − q)² credit, with q balanced across semantic areas and functions. Every case must pass for full credit. Invalid execution receives −15%; skips earn zero; unresolved answers remain incomplete.</p><p>Task 24 is unscored. Token DL separately discounts positive credit by output-token usage; TIME-DL uses archived intervals. The historical results and original 3.4 scoring are preserved.</p>`,
};

function selectVersion(version, updateURL = false) {
  if (!datasets[version]) return;
  selectedVersion = version;
  const data = datasets[version], config = versions[version];
  const timeBudgets = {medium:60, hard:120, brutal:240, nightmare:450};
  const languageNames = {py:'Python', js:'JavaScript', ts:'TypeScript', go:'Go', sql:'SQL'};
  manifest = {...config, tasks: Object.entries(data.tasks).map(([id, task]) => ({...task, id, title:task.title || id,
    language: isV4(config) ? languageNames[task.language] : id.includes("_js_") ? "JavaScript" : id.includes("_sql_") ? "SQL" : "Python",
    time_budget: timeBudgets[task.difficulty]}))};
  const v4 = isV4(manifest);
  /* Chart default per version: Score on 4.0 (correctness is flat at the top
     there); Correctness on older boards, where most entries are unmetered
     and a Score axis would hide them. The chip can always override. */
  chartMeasure = v4 ? "score" : "correctness";
  document.querySelectorAll("#measure-chips .chip").forEach(c => {
    const on = c.dataset && c.dataset.measure === chartMeasure;
    c.classList.toggle("on", on); c.setAttribute("aria-pressed", String(on));
  });
  results = [...data.official, ...data.community];
  sortKey = "score"; sortAsc = false;
  SORTS.score.label = isV35(manifest) || v4 ? "Score" : "Correctness";
  document.getElementById("benchmark-version").value = version;
  document.getElementById("task-family").innerHTML = '<option value="">All families</option>' +
    [...new Set(manifest.tasks.map(t => t.family))].sort().map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join("");
  document.getElementById("task-family").value = "";
  document.getElementById('task-level').innerHTML = '<option value="">All levels</option>' +
    (v4 ? ['baseline','hard','stress'] : ['medium','hard','brutal','nightmare']).map(level => `<option>${level}</option>`).join('');
  document.getElementById('task-level').value = '';
  const effort = document.getElementById("f-effort").value;
  const efforts = [...new Set(results.map(r => r.effort).filter(Boolean))].sort();
  document.getElementById("f-effort").innerHTML = '<option value="all">All efforts</option>' +
    efforts.map(e => `<option value="${esc(e)}">${esc(e)}</option>`).join("");
  document.getElementById("f-effort").value = efforts.includes(effort) ? effort : "all";
  const count = manifest.tasks.filter(t => t.scored !== false).length;
  document.getElementById("release-status").textContent = `${config.label} · ${manifest.tasks.length} ${v4 ? 'tasks' : 'public tasks'} · ${count} scored · ${v4 ? 'Public submissions open; run details in each post-mortem.' : config.status === 'draft' ? 'Calibration in progress; no certified results yet.' : isV35(manifest) ? 'Saved answers regraded in Docker.' : 'Historical results and scoring preserved.'}`;
  document.getElementById('hero-description').innerHTML = v4
    ? '<span id="task-total">72</span> coding tasks across nine families. Debugging, maintenance and exact reasoning. Private, machine-graded results.'
    : '<span id="task-total">27</span> public coding tasks. Hidden systems to reverse-engineer. Private, machine-graded results.';
  document.getElementById("hero-score-note").textContent = v4
    ? 'Agent token deadlines and total-token ceilings. Correctness alongside the score. Private machine grading.' : isV35(manifest)
    ? "Token-discounted score. Correctness alongside it. Continuous partial credit. No judge model."
    : "Correctness out of 100. Continuous partial credit. Token efficiency measured separately. No judge model.";
  document.getElementById("scoring-method").innerHTML = SCORING_COPY[version];
  const taskDownload = document.getElementById('task-download'), runnerDownload = document.getElementById('runner-download');
  taskDownload.setAttribute('href', config.archive || 'deadline.zip');
  taskDownload.innerHTML = `Download all tasks <span aria-hidden="true">↗</span>`;
  runnerDownload.setAttribute('href', config.archive || 'deadline.zip');
  runnerDownload.innerHTML = `Download runner <span aria-hidden="true">↗</span>`;
  runnerDownload.setAttribute('download', '');
  document.getElementById('hero-submit').setAttribute('href', v4 ? 'submit.html#deadline4' : 'submit.html');
  document.getElementById('hero-submit').innerHTML = `${v4 ? '4.0 submissions' : 'Submit a result'} <span aria-hidden="true">↗</span>`;
  document.getElementById('task-scope').textContent = v4
    ? '72 tasks: eight per family. Python, JavaScript, TypeScript, Go and SQLite SQL. Families cover repository debugging, regression finding, behavior-preserving refactoring, diagnosis, performance, inference, exactness, specification compliance and SQL.' : version === '3.6'
    ? '45 public Python, JavaScript and SQLite tasks. New tasks combine explicit rule exceptions, interacting clauses, exact optimization, error recovery and inference with finite uniqueness proofs. Three retired tasks remain unscored.'
    : '27 public Python, JavaScript and SQLite tasks. Most infer hidden behavior from observations; two repair generated projects. Retired tasks and scoring rules follow the selected version.';
  document.getElementById('scope-limitations').textContent = v4
    ? 'One attempt per task, per sample. Agents may use local tools and self-tests in a public task room; private graders remain outside it. Raw API attempts use no tools. Design difficulty labels are not empirical difficulty claims. The 4.0 tasks are new and cannot reuse 3.x answers.'
    : 'One blind attempt per task, per sample. This benchmark does not measure dependency wrangling or long agentic projects. Task 24 remains available but unscored because its prompt omits required final-state labels.';
  document.getElementById('method-languages').textContent = v4 ? 'Python, JavaScript, TypeScript, Go and SQL under token constraints.' : 'Exact Python, JavaScript, and SQL, under token deadlines.';
  document.getElementById('catalog-note').innerHTML = v4
    ? 'Public prompts, supplied project files and runner. Private tests and grading. Agent time is not scored. <span>Python · JavaScript · TypeScript · Go · SQL</span>'
    : 'Every prompt is public. Test cases and grading stay private. <span>Python · JavaScript · SQL</span>';
  document.querySelectorAll('.ticker-languages').forEach(el => { el.textContent = v4 ? 'Python, JavaScript, TypeScript, Go, and SQL' : 'Python, JavaScript, and SQL'; });
  document.getElementById("method-headline").textContent = v4
    ? 'Separate API and agent lanes. Private, deterministic grading. Correctness and token efficiency reported together.' : isV35(manifest)
    ? "Public prompts. Private, deterministic grading. Token-discounted correctness is the headline."
    : "Public prompts. Private, deterministic grading. Correctness is the headline score.";
  for (const name of ["official", "community"]) {
    const link = document.getElementById(name + "-download");
    if (link) link.setAttribute("href", config.base + "/" + name + ".json");
  }
  if (updateURL && typeof window !== "undefined") {
    const url = new URL(window.location.href);
    url.searchParams.set("version", version);
    window.history.replaceState(null, "", url);
  }
  renderAll();
}

async function init() {
  const fetchJSON = async path => {
    const response = await fetch(path, {cache:"no-store"});
    if (!response.ok) throw new Error("Unavailable data");
    return response.json();
  };
  const [catalog, prices] = await Promise.all([fetchJSON("data/versions.json"), fetchJSON("prices.json")]);
  versions = catalog.versions; PRICES = prices;
  await Promise.all(Object.entries(versions).map(async ([version, config]) => {
    const [tasks, official, community] = await Promise.all(
      ["tasks", "official", "community"].map(name => fetchJSON(config.base + "/" + name + ".json")));
    if (!tasks || Array.isArray(tasks) || !Object.keys(tasks).length ||
        !Array.isArray(official) || !Array.isArray(community)) throw new Error("Invalid result data");
    const studies=config.studies ? await fetchJSON(config.studies) : null;
    const overview=config.overview ? await fetchJSON(config.overview) : null;
    datasets[version] = {tasks, official, community, studies, overview};
  }));
  document.getElementById("benchmark-version").innerHTML = Object.entries(versions)
    .map(([version, config]) => `<option value="${esc(version)}">${esc(config.label)}</option>`).join("");
  const requested = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("version") : null;
  wire();
  selectVersion(datasets[requested] ? requested : catalog.default);
}
const ready = init().catch(error => {
  document.getElementById("release-status").textContent = "Results could not be loaded. Please reload to try again.";
  for (const id of ["leaderboard", "c-frontier", "hardest"]) document.getElementById(id).innerHTML = '<p class="empty">Results unavailable.</p>';
  throw error;
});
