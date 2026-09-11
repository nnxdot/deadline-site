# Deadline 4.0 — public tasks and submission client

Wave 2026Q4 contains 72 tasks across nine families and five languages. The task
package is public; the grading code, hidden cases and solutions are private.
Calibration is ongoing. The published Astra result retains its original run
history in its post-mortem. Downloading this package does not certify a new run.

Extract the whole ZIP and open a terminal in the extracted folder. Python 3.10+
is required. No dependencies are needed for the API client.

```powershell
python client.py --check-suite
```

The suite hash in `manifest.json` pins the exact task prompts and budgets.
`checksums.json` covers every package file. Do not change task files or budgets.

## Raw API runs

Use one independent response per task with no tools. Set the real model ID and
your own provider key. The key is read from the environment and is not saved in
the submission. Do not put credentials inside the request parameters.

For OpenRouter, edit `params.example.json` with the provider's supported output
ceiling and reasoning setting, then run:

```powershell
python client.py --openrouter --model YOUR-MODEL-ID --params-file params.example.json --max-spend 10 --dry-run
python client.py --openrouter --model YOUR-MODEL-ID --params-file params.example.json --max-spend 10 --out submission-v4.json
```

Set `OPENROUTER_API_KEY` before the second command. OpenRouter's current model
prices are saved to `submission-v4.prices.json` before any generation. You can
instead supply `--rates provider-rates.json` to pin reviewed prices. Special
long-context pricing needs a supplied rate table with the applicable tiers.

`--effort high` (or another effort) must match the actual setting in the params
file. The label alone does not configure reasoning. Leave it at `default` when
you have not explicitly configured an effort. The provider output ceiling is
separate from the task's scoring budget; an exhausted generation is incomplete.

Other providers use `--type openai`, `--type anthropic`, or `--type gemini`, with
`--model`, `--key-env`, provider-specific `--params-file`, and `--rates`.
OpenAI-compatible endpoints also accept `--base-url`. `rates.example.json` is
only a schema example: replace its model, null rates and source with actual
provider values. Rates are dollars per million tokens. Optional `cached_in`
and `cache_write` rates describe the provider's cache pricing. Without those
rates the estimate conservatively charges input at the normal rate.

`--max-spend` caps reserved request costs, not benchmark scoring. The client
reserves each request before sending and retains ambiguous charges. Use
`--budget-ledger shared-budget.json` to share one cap across sample files.
The rate table and cap must cover the selected provider and any special tiers.

Resume with the exact same command and output file. Only never-attempted tasks
are requested. Blanks, truncations and ambiguous failed requests remain recorded;
they are not silently replaced. A fresh attempt requires a separate sample file.
`--tasks TASK-ID ...` is useful for exploratory subsets, but a full submission
must contain all 72 tasks. Preserve every attempt; do not select the best answers.

## Agent runs

Agent runs use the same tasks in separate public rooms, with local tools and
self-tests allowed. They are a separate leaderboard lane from raw API runs.
The helper prepares and collects rooms; you launch your chosen agent yourself.

```powershell
python agent.py prepare --destination ../my-v4-run --model YOUR-MODEL-ID --effort high --surface agent-other
```

Use `codex-cli`, `claude-code-cli`, `antigravity-cli` or `agent-other` for the
actual surface. Run one fresh agent session per folder in `my-v4-run/rooms/`.
Give it that room as its workspace and have it read `AGENTS.md` and `PROMPT.md`.
Configure the actual model and effort in your agent. The agent saves the answer
under the room's `answers/` directory. Diagnosis tasks require the specified
JSON object, including the complete repaired module.

Before starting, enable the agent's transcript and token-usage recording.
Save each dedicated task transcript as `transcripts/TASK-ID.jsonl` outside the
solver room. Save `receipts/TASK-ID.json` with the following shape, copying the
numbers from the task's actual CLI/provider receipt:

```json
{
  "status": "completed",
  "finish_reason": "stop",
  "wall_seconds": 123.45,
  "input_token_accounting": "gross including cached input; cache counted once",
  "usage": {
    "input_tokens": 10000,
    "cached_input_tokens": 8000,
    "output_tokens": 2000
  }
}
```

These numbers illustrate the format; never use them as measured usage. Output
must include all reasoning and intermediate model output during tool use.
Input is gross input, including cache reads exactly once. If your tool omits
these measurements, the run cannot receive a measured headline score. Keep
original receipts for review; optional `cost` and `cost_basis` must be supported
by billing or an explicit estimate. Do not let the solver invent its own receipt.

Then collect, validate and package:

```powershell
python agent.py collect --run ../my-v4-run --out submission-v4-agent.json
python client.py --validate submission-v4-agent.json
python client.py --package submission-v4-agent.json
```

Collection may be repeated as tasks finish. Already collected answers and
receipts cannot be changed in the same sample. Room separation alone is not
OS-level isolation. Keep sessions confined to their room; no old solutions,
private tests, other tasks, internet, other models, subagents or downloads.

## Upload a result

For an API run:

```powershell
python client.py --validate submission-v4.json
python client.py --package submission-v4.json
```

Open a [Deadline 4.0 submission issue](https://github.com/violetweather/deadline-site/issues/new?template=submission-v4.yml).
Attach the generated `*-submission.zip` and paste its `*.metadata.json` contents.
The archive contains your answers and token measurements. It does not upload
anything automatically. Do not paste API keys or unrelated personal transcripts.
Retain the dedicated raw API receipts or agent receipts/transcripts for review.

The maintainer validates the pinned suite and grades the submitted answers in
the private Docker grader. Community model/effort/usage attribution remains
submitter-reported until evidence is reviewed. You cannot self-report a score.
A single complete community sample can be submitted; new certified API entries
require three independent samples, and certified agent entries require one
fresh full sample under printed limits plus completed release calibration.

## Scoring

All 72 tasks score, totaling 800 points: 60% debugging/maintenance and 40%
inference, exactness, specification compliance and SQL. Semantic areas are
equally weighted within each task. Correctness credit is
`q^4 - 0.15 * (1-q)^2`; full credit requires all cases to pass. Invalid execution
receives -15%, deliberate skips zero, and blank/truncated answers stay incomplete.

Positive credit is discounted by `min(1, output budget / output tokens)`.
For agents, exceeding the printed total-token ceiling forfeits positive credit.
Penalties are unchanged. Correctness is reported separately, without discounts.
Agent wall time is reported, never scored. API TIME-DL remains a separate
diagnostic. Budgets are scoring rules, not forced generation cutoffs.

Agent ranking prioritizes a full correctness sweep without ceiling forfeitures,
then deadline score, then correctness. Difficulty names are design targets,
not empirically established hardness. Published suite versions remain separate.
Future budget revisions receive new suite hashes; do not change this package
mid-run. Neither a new label nor a regrade creates a new independent sample.
