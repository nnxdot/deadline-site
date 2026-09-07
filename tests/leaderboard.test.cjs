// DOM-free regression checks for public score rendering. No browser or network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'leaderboard.js'), 'utf8');

class Element {
  constructor(id) { this.id = id; this.value = id === 'f-effort' ? 'all' : ''; this.listeners = {}; }
  set innerHTML(value) {
    this.html = value;
    if (['f-cohort'].includes(this.id)) this.value = value.match(/value="([^"]*)"/)?.[1] || '';
  }
  get innerHTML() { return this.html || ''; }
  addEventListener(event, callback) { this.listeners[event] = callback; }
  setAttribute(name, value) { (this.attributes ||= {})[name] = value; }
  appendChild() {}
  querySelectorAll() { return []; }
}

(async () => {
  const elements = new Map();
  const context = vm.createContext({
    document: {
      getElementById(id) { if (!elements.has(id)) elements.set(id, new Element(id)); return elements.get(id); },
      createElement() { return new Element(); },
      querySelectorAll() { return []; },
    },
    fetch: async file => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')) }),
    Intl, console,
  });
  vm.runInContext(script, context);
  await vm.runInContext("ready", context);
  const evaluate = code => vm.runInContext(code, context);
  const currentResults = ['official', 'community'].flatMap(name =>
    JSON.parse(fs.readFileSync(path.join(root, `data/${name}.json`), 'utf8')));
  assert.equal(evaluate('selectedVersion'), '3.5', 'new version is the default');
  assert.equal(evaluate('JSON.stringify(results)'), JSON.stringify(currentResults));
  assert.equal(evaluate('displayed().length'), 11);
  assert.equal(evaluate('manifest.tasks.filter(t => t.scored !== false).length'), 24);
  assert.equal(evaluate('manifest.tasks.reduce((sum, t) => sum + t.points, 0)'), 1050);
  assert.equal(evaluate('grouped(displayed()).find(([key]) => key === "official/agent")[1][0].model'), 'gpt-6-astra');
  assert.ok(elements.get('leaderboard').innerHTML.includes('≈56.68'));
  assert.ok(elements.get('leaderboard').innerHTML.includes('87.21'));
  assert.ok(elements.get('leaderboard').innerHTML.includes('unmetered'));
  assert.ok(elements.get('leaderboard').innerHTML.includes('99.63'));
  assert.equal((elements.get('leaderboard').innerHTML.match(/class="score-track"/g) || []).length, 11, 'unmetered results keep a correctness bar');
  for (const task of ['19_redacted_machine', '22_sql_traces_xl', '24_js_machine_traces']) {
    assert.ok(!elements.get('hardest').innerHTML.includes(task));
  }
  evaluate('metric="seconds"; renderFrontier()');
  assert.equal((elements.get('c-frontier').innerHTML.match(/class="pt"/g) || []).length, 11, 'correctness chart retains unmetered results');
  assert.ok(elements.get('scoring-method').innerHTML.includes('q⁴'));
  assert.ok(elements.get('benchmark-version').innerHTML.includes('v3.4'));
  evaluate('selectVersion("3.4")');
  const sourceResults = ['official', 'community'].flatMap(name =>
    JSON.parse(fs.readFileSync(path.join(root, `data/v3.4/${name}.json`), 'utf8')));
  assert.equal(evaluate('selectedVersion'), '3.4');
  assert.ok(elements.get('scoring-method').innerHTML.includes('q²'));
  assert.equal(elements.get('official-download').attributes.href, 'data/v3.4/official.json');
  assert.equal(evaluate('JSON.stringify(results)'), JSON.stringify(sourceResults), 'load saved results without rewriting or regrading');
  assert.equal(evaluate('displayed().length'), 11, 'include the nine maintainer results and both community results');
  assert.equal(evaluate('manifest.tasks.length'), 27);
  assert.equal(evaluate('manifest.tasks.filter(t => t.scored !== false).length'), 26);
  assert.equal(evaluate('manifest.tasks.reduce((sum, t) => sum + t.points, 0)'), 1205);
  assert.ok(elements.get('suite-line').textContent.startsWith('9 families.'));
  assert.ok(elements.get('task-table').innerHTML.includes('UNSCORED'));
  assert.ok(!elements.get('hardest').innerHTML.includes('24_js_machine_traces'), 'unscored task is not a hardest-task failure');
  for (const r of sourceResults) {
    context.savedResult = r;
    const detail = evaluate('detailHTML(savedResult, 10)');
    assert.ok(detail.includes(evaluate('esc(savedResult.analysis)')));
    assert.ok(detail.includes(evaluate('esc(savedResult.commentary)')));
    assert.equal((detail.match(/class="td-row"/g) || []).length, 27);
    assert.equal((detail.match(/>UNSCORED</g) || []).length, 1);
    for (const [id, task] of Object.entries(r.task_detail)) {
      assert.ok(detail.includes(id));
      assert.ok(detail.includes(`${task.contribution.toFixed(2)} /100`));
    }
  }
  assert.equal(evaluate('METRICS.tokens.get(results.find(r => r.mode === "sub"))'), null, 'unmetered zero placeholders must not appear as measured zero usage');
  assert.equal(evaluate('providerOf("deepseek-v4-flash-0731").logo'), 'deepseek');
  assert.equal(evaluate('providerOf("gpt-5.6-sol").logo'), 'openai');
  assert.equal(evaluate('providerOf("claude-sonnet-5").logo'), 'claude');
  assert.equal(evaluate('providerOf("anthropic/claude-opus-5").logo'), 'claude');
  assert.equal(evaluate('providerOf("google/gemini-3.8-flash").logo'), 'gemini');
  assert.equal(evaluate('providerOf("minimax-m3").logo'), 'minimax');
  assert.equal(evaluate('providerOf("minimax/minimax-m3:free").logo'), 'minimax');
  for (const name of ['cost', 'tokens', 'seconds', 'tdl', 'eff']) {
    context.chartMetric = name;
    evaluate('metric = chartMetric; renderFrontier()');
    assert.ok(elements.get('c-frontier').innerHTML.includes('<svg'));
    assert.ok(!/NaN|Infinity/.test(elements.get('c-frontier').innerHTML));
  }
  context.labelPoints = Array.from({length: 8}, (_, i) => ({x: 850 + i % 2, y: 27 + i / 10, width: 175, height: 22}));
  const originalPoints = JSON.stringify(context.labelPoints);
  const placed = JSON.parse(evaluate('JSON.stringify(placeChartLabels(labelPoints, {left:54,right:972,top:8,bottom:386}))'));
  assert.equal(placed.length, context.labelPoints.length, 'keep every label for coincident and near-coincident results');
  assert.equal(JSON.stringify(context.labelPoints), originalPoints, 'label placement must not change the plotted values');
  for (let i = 0; i < placed.length; i++) {
    const a = placed[i];
    assert.ok(a.x >= 54 && a.x + a.width <= 972 && a.y >= 8 && a.y + a.height <= 386, 'labels stay inside the chart');
    for (const b of placed.slice(i + 1)) {
      assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, 'near-equal scores must have separate labels');
    }
  }
  evaluate('metric = "cost"; renderFrontier()');
  elements.get('task-search').value = '24_js_machine';
  evaluate('renderTasks()');
  assert.equal(elements.get('task-count').textContent, '1 / 27 tasks');
  assert.ok(elements.get('task-table').innerHTML.includes('UNSCORED'));
  elements.get('task-search').value = '';
  elements.get('task-level').value = 'nightmare';
  evaluate('renderTasks()');
  assert.ok(!elements.get('task-table').innerHTML.includes('01_cipher_d2'));
  elements.get('task-level').value = '';
  evaluate('renderTasks()');
  assert.ok(!/Version 4|DEADLINE 4|deadline-v4|v4\//i.test(html + script));
  assert.ok(html.includes('<title>Deadline</title>'));
  const minimax = evaluate('results.find(r => r.model === "minimax-m3")');
  assert.ok(minimax && !minimax.official && minimax.verified);
  assert.equal(minimax.score, 38.44);
  assert.equal(minimax.dscore, 28.64);
  assert.equal(minimax.strict_score, 29.88);
  assert.equal(minimax.passed, 11);
  assert.equal(minimax.total, 26);
  assert.equal(minimax.samples, 1);
  assert.equal(minimax.seconds, 5274);
  assert.equal(minimax.tokens_in, 46181);
  assert.equal(minimax.tokens_out, 486006);
  assert.equal(minimax.cost_estimated, true);
  assert.equal(minimax.cost_estimate.model, "MiniMax-M3");
  assert.equal(minimax.cost_estimate.original_requested_model, "minimax/minimax-m3:free");
  assert.equal(minimax.cost_estimate.estimate_type, "hypothetical_paid");
  assert.equal(minimax.cost_estimate.pricing_source, "https://platform.minimax.io/docs/guides/pricing-paygo");
  assert.equal(minimax.published_source.requested_model, "minimax/minimax-m3:free");
  assert.equal(evaluate('runCost(results.find(r => r.model === "minimax-m3"))'), 0.5970615);
  assert.equal(minimax.published_source.extraction_correction.policy, 'last-language-block-v1');
  assert.equal(minimax.published_source.extraction_correction.new_model_calls, 0);
  assert.equal(minimax.published_source.extraction_correction.existing_published_entries_changed, 0);
  assert.equal(minimax.task_detail['12_eval_traces'].credit, 0.989231106072);
  assert.equal(minimax.task_detail['21_sql_traces'].credit, 0.929272992277);
  assert.ok(minimax.analysis.includes('correcting code-block extraction'));
  assert.ok(elements.get('leaderboard').innerHTML.includes('5274s'));
  assert.ok(elements.get('leaderboard').innerHTML.includes('$0.5971'));
  assert.ok(elements.get('leaderboard').innerHTML.includes('486,006'));
  assert.ok(elements.get('c-frontier').innerHTML.includes('minimax-m3'));
  const community = evaluate('results.find(r => r.model === "deepseek-v4-flash-0731")');
  assert.ok(community && !community.official && community.verified);
  assert.equal(community.score, 65.36);
  assert.equal(community.dscore, 31.31);
  assert.equal(community.samples, 1);
  assert.equal(community.seconds, 13362.43);
  assert.equal(community.cost_estimated, true);
  assert.equal(community.cost_estimate.model, community.model);
  assert.equal(community.cost_estimate.pricing_source, "https://api-docs.deepseek.com/quick_start/pricing/");
  assert.equal(community.cost_estimate.estimate_type, "hypothetical_first_party");
  assert.equal(community.cost_estimate.input_usd_per_million, 0.22);
  assert.equal(community.cost_estimate.output_usd_per_million, 0.66);
  assert.equal(community.cost_estimate.advertised_discount_percent, 50);
  assert.equal(evaluate('runCost(results.find(r => r.model === "deepseek-v4-flash-0731"))'), 0.70174962);
  assert.ok(elements.get('leaderboard').innerHTML.includes('$0.7017'));
  assert.ok(elements.get('leaderboard').innerHTML.includes('13362s'));
  assert.ok(elements.get('leaderboard').innerHTML.includes('deepseek-v4-flash-0731'));
  assert.ok(elements.get('leaderboard').innerHTML.includes('class="td-analysis"'));
  assert.ok(!elements.get('leaderboard').innerHTML.includes('<th>Source</th>'));
  assert.ok(!elements.get('leaderboard').innerHTML.includes('class="stamp'));
  assert.equal((elements.get('leaderboard').innerHTML.match(/class="score-track"/g) || []).length, 11);
  assert.ok(elements.get('leaderboard').innerHTML.includes('colspan="10"'));
  assert.ok(!elements.get('leaderboard').innerHTML.includes('colspan="11"'));
  assert.ok(evaluate('scoreCellHTML({model:"test", score:125})').includes('width:100%'));
  assert.ok(evaluate('scoreCellHTML({model:"test", score:-5})').includes('width:0%'));
  assert.ok(evaluate('scoreCellHTML({model:"test", score:-5})').includes('-5.00'));
  assert.ok(!evaluate('scoreCellHTML({model:"test", score:null})').includes('score-track'));
  assert.ok(evaluate('scoreCellHTML({model:"test", score:86.20, score_analysis:{score_unrounded:86.204}})').includes('width:86.204%'));
  assert.ok(elements.get('c-frontier').innerHTML.includes('<svg'));
  assert.ok(elements.get('c-frontier').innerHTML.includes('deepseek-v4-flash-0731'));
  assert.ok(!elements.get('c-frontier').innerHTML.includes('NaN'));
  evaluate('metric = "tokens"; renderBoards()');
  assert.ok(elements.get('c-frontier').innerHTML.includes('<svg'));
  assert.ok(elements.get('c-frontier').innerHTML.includes('deepseek-v4-flash-0731'));
  assert.ok(!elements.get('c-frontier').innerHTML.includes('NaN'));
  evaluate('cohort = "community"; renderBoards()');
  assert.equal(evaluate('displayed().length'), 2);
  evaluate('cohort = "all"; metric = "cost"; renderBoards()');
  assert.ok(elements.get('leaderboard').innerHTML.includes('settings not independently verified'));
  assert.ok(elements.get('leaderboard').innerHTML.includes('>TIME-DL</button>'));
  assert.ok(!elements.get('leaderboard').innerHTML.includes('Time-DL (unverified)'));
  assert.ok(!html.includes('class="measurement-note"'));
  assert.ok(elements.get('leaderboard').innerHTML.includes('Full-pass points'));
  const astra = evaluate('results.find(r => r.model === "gpt-6-astra")');
  assert.ok(astra && astra.official && astra.verified);
  assert.equal(astra.mode, 'sub');
  assert.equal(astra.effort, 'xhigh');
  assert.equal(astra.samples, 1);
  assert.equal(astra.certified, false);
  assert.equal(astra.score, 93.65);
  assert.equal(astra.dscore, 82.33);
  assert.equal(astra.passed, 24);
  assert.equal(astra.total, 26);
  assert.equal(astra.task_detail['24_js_machine_traces'].scored, false);
  assert.equal(astra.task_detail['25_js_eval_traces'].credit, 1);
  assert.equal(astra.tokens_in, 2620725);
  assert.equal(astra.tokens_out, 110960);
  assert.equal(astra.usage.cached_input_tokens, 2086656);
  assert.equal(astra.cost_estimated, true);
  assert.ok(Math.abs(astra.cost_usd - ((astra.tokens_in - astra.usage.cached_input_tokens) * 10 + astra.usage.cached_input_tokens + astra.tokens_out * 50) / 1e6) < 1e-12, 'cached input is discounted, and reasoning output is not billed twice');
  assert.equal(astra.cost_estimate.flex_applied, false);
  assert.equal(astra.cost_estimate.alternative_flex_cost_usd, astra.cost_usd / 2);
  assert.equal(evaluate('cohortOf(results.find(r => r.model === "gpt-6-astra"))'), 'official/agent');
  assert.equal(evaluate('grouped(displayed()).find(([key]) => key === "official/agent")[1][0].model'), 'claude-fable-5');
  assert.equal(evaluate('grouped(displayed()).find(([key]) => key === "official/agent")[1][1].model'), 'gpt-6-astra');
  const fable = evaluate('results.find(r => r.model === "claude-fable-5")');
  assert.equal(fable.score, 97.32);
  assert.equal(fable.dscore, 54.77);
  assert.equal(fable.dscore_estimated, true);
  assert.equal(fable.metering_complete, false);
  assert.equal(fable.tokens_out, 443229);
  assert.equal(fable.recorded_usage.output_tokens, 433769);
  assert.equal(fable.cost_is_lower_bound, true);
  assert.equal(fable.certified, false);
  assert.equal(fable.task_detail['24_js_machine_traces'].scored, false);
  assert.equal(fable.task_detail['23_js_cipher_traces'].credit, 1);
  assert.equal(fable.passed, 24);
  assert.equal(fable.total, 26);
  assert.ok(evaluate('SORTS.correctness.get(results.find(r => r.model === "claude-fable-5"))') > 97, 'pre-3.5 rows expose their published score as correctness');
  assert.equal(evaluate('headlineOf(results.find(r => r.model === "claude-fable-5"))'), evaluate('preciseScore(results.find(r => r.model === "claude-fable-5"))'), 'pre-3.5 headline stays the published correctness');
  assert.equal(evaluate('headlineOf({benchmark_version:"deadline-3.5", score: null, correctness: 80})'), null, '3.5 headline absent without token measurements');
  assert.ok(evaluate('scoreCellHTML({benchmark_version:"deadline-3.5", score: null, correctness: 80})').includes('unmetered'));
  assert.equal(evaluate('correctnessOf({benchmark_version:"deadline-3.5", score: 61.2, correctness: 88.4})'), 88.4);
  assert.ok(evaluate('tokenScoreCellHTML(results.find(r => r.model === "claude-fable-5"))').includes('≈54.77'));
  assert.ok(!evaluate('tokenScoreCellHTML({dscore:null,dscore_estimated:true})').includes('≈'));
  assert.ok(elements.get('leaderboard').innerHTML.includes('≈443,229'));
  assert.ok(elements.get('leaderboard').innerHTML.includes('≥$41.6780'));
  assert.ok(elements.get('leaderboard').innerHTML.includes('54.72–54.78'));
  assert.ok(elements.get('leaderboard').innerHTML.includes('$12.9753'));
  assert.ok(elements.get('leaderboard').innerHTML.includes('110,960'));
  const rendered = elements.get('leaderboard').innerHTML;
  assert.ok(rendered.indexOf('class="td-analysis"') < rendered.indexOf('class="td-meta"'));
  assert.ok(rendered.includes('class="td-meta"'));
  assert.ok(!rendered.includes('score-summary'));
  assert.ok(!html.includes('Scores by task family'));
  assert.ok(!html.includes('Compare saved answers'));
  assert.ok(!elements.get('leaderboard').innerHTML.includes('NaN'));
  assert.match(elements.get('leaderboard').innerHTML, /class="score-v"[^>]*>\d+\.\d{2}</);
  assert.ok(elements.get('leaderboard').innerHTML.includes('aria-expanded="false"'));
  const initialCount = evaluate('displayed().length');
  assert.ok(initialCount > 1);
  const mediumCount = evaluate('displayed().filter(r => r.effort === "medium").length');
  evaluate('results.push({...results[0], id:"old", suite_hash:"older", score:100})');
  assert.equal(evaluate('displayed().length'), initialCount, 'different suite hashes must not mix');
  evaluate('results.push({...results[0], benchmark_version:"deadline-4", score:100}, {...results[0], measurement_status:"incomplete"}, {...results[0], pilot:true})');
  assert.equal(evaluate('displayed().length'), initialCount, 'exclude other versions, incomplete answers and development pilots');
  assert.ok(evaluate('compareEntries({score:50,score_analysis:{score_unrounded:50.004}}, {score:50,score_analysis:{score_unrounded:50.001}})') < 0, 'sort using unrounded scores');
  elements.get('f-effort').value = 'medium';
  assert.equal(evaluate('displayed().length'), mediumCount);
  elements.get('f-effort').value = 'all';
  assert.equal(evaluate('fmtScore(null)'), '\u2014');
  assert.equal(evaluate('fmtScore(86.2)'), '86.20');
  context.escapeProbe = '<script>"&';
  assert.equal(evaluate('esc(escapeProbe)'), '&lt;script&gt;&quot;&amp;');
  evaluate('selectVersion("3.5")');
  assert.equal(evaluate('JSON.stringify(results)'), JSON.stringify(currentResults), 'switching versions never mutates either dataset');
  assert.equal(evaluate('displayed().length'), 11);
  assert.equal(elements.get('official-download').attributes.href, 'data/official.json');
  assert.equal(evaluate('headlineOf(results.find(r => r.model === "claude-opus-5"))'), null);
  assert.equal(evaluate('correctnessOf(results.find(r => r.model === "claude-fable-5"))'), evaluate('results.find(r => r.model === "claude-fable-5").score_analysis.score_unrounded'));
  evaluate('selectVersion("unknown")');
  assert.equal(evaluate('selectedVersion'), '3.5');
  console.log('Leaderboard rendering, precision, cohort isolation, effort filters, score bars and escaping: PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });
