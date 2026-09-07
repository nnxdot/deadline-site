# Deadline

*Every model meets its Deadline.*

A closed coding benchmark for AI models. 27 MACHINE-GENERATED Python, JavaScript, and SQL tasks (nearly half pure inference from observed behavior) —
hidden cipher pipelines, randomized state machines and formats, scrambled
precedence tables, performance gates, and a generated-semantics interpreter —
graded by hidden, fuzz-tested oracles with semantic-balanced partial credit.
No judge model, no self-reported scores. Every task carries a TOKEN BUDGET
(its deadline). Version **3.5** makes token-discounted correctness the headline,
with undiscounted correctness alongside it. It scores 24 tasks (1,050 points),
using q^4 - 0.15*(1-q)^2 credit; tasks 19, 22 and 24 are unscored.
Missing token measurements remain unmetered, and reconstructed estimates are marked approximately.

The **v3.5 / v3.4 selector** preserves the full historical 3.4 board, its 26 scored
tasks (1,205 points), q^2 partial-credit rule and correctness headline. The raw
3.4 data is preserved unchanged in [`data/v3.4/`](data/v3.4/). Different versions
never rank together. The 3.5 results regrade existing answers; they are not new
model attempts or evidence that correctness saturation has been resolved.

**Scope, honestly:** Deadline measures exact Python 3, JavaScript (Node), and SQLite SQL with
standard libraries only, across 27 machine-generated tasks — most reverse-engineered
from the observed behavior of hidden systems — in one blind attempt against
token deadlines. Two tasks are whole-project bug
hunts across dozens of generated files. It does not measure dependency
wrangling or long agentic sessions. Skill areas (algorithms,
parsing, state, bugfix, refactoring, integration, ...) are tagged per task
in [`data/tasks.json`](data/tasks.json).

**Leaderboard:** https://deadline.nnx.fyi/

## Why the tests are private

Public benchmark answers leak into training data and inflate scores.
Deadline keeps the tests and reference solutions private. Only the prompts
are public (in [`prompts/`](prompts/)), so anyone can run their model against
them - but only the maintainer can grade.

## Submit a verified result

1. Clone this repo.
2. Run the client against your model (your key, your machine, standard library only):

```
python client/deadline_client.py --type gemini --model gemini-2.5-flash --key-env GEMINI_API_KEY
```

   `--type openai` works for any OpenAI-compatible endpoint (OpenAI, OpenRouter,
   Groq, and local servers like Ollama with `--base-url http://localhost:11434/v1`
   and no `--key-env`). `--type anthropic` for Claude. Use `--effort` to label a
   thinking/effort setting.

3. The script writes `submission.json` (raw replies + token counts).
4. [Open a submission issue](../../issues/new?template=submission.yml) and paste
   the full file contents.
5. The maintainer grades your replies against the private tests and posts your
   verified score on the issue. It then appears on the site, marked "community".

Rules: one blind attempt per task, no test peeking (you can't - they're private),
no hand-editing replies. Obviously hand-written "replies" get rejected.

### Interrupted runs and blank replies

Client version 3 stops with **INCOMPLETE** if a provider returns no text,
whitespace, or an empty code block. It saves the reply and receipt in
`submission.json.partial` and does not write a final submission. Connection
failures still use the existing three retries; a returned blank answer requires
an explicit resume instead of silently generating additional answers.

Rerun the same command to resume. Valid saved responses, including explicit
`# SKIP` / `// SKIP` answers, are kept. Missing and blank tasks are requested again.
The client reads the partial checkpoint first, or an existing `--out` file if
there is no checkpoint. This also repairs blank entries saved by older clients.
An already complete output file makes no new requests; use a different `--out`
filename for a new run.

When repairing an existing output file, the client makes a byte-for-byte backup
before replacing it. Earlier blank replies and receipts remain in each task's
`previous_attempts`; new receipts also retain completion reasons, response IDs
when supplied, and transport retry details. A replacement is a new generation,
not recovery of the original answer, and its history must be retained for review.
Top-level token totals describe the retained responses; previous-attempt usage is
recorded separately, and usage from dropped connections may be unknown.

Client regression checks (no API calls):

```powershell
python -m unittest discover -s client -p 'test_*.py' -v
```

## Scores explained

Scores are out of **100**, weighted by task difficulty and depth. The
**DL Score** additionally applies each task's token budget: points decay by
budget÷tokens past the deadline. Measured Token DL requires complete per-task
token data, including for agent runs. Reconstructed estimates are marked ≈,
with assumptions and sensitivity in the post-mortem. Runs without usable
token data get a correctness score only.

- **Official**: maintainer-run generations. New certified runs require at least
  three independent attempts per task. Historical entries may have one attempt;
  regrades retain that count. Repeat standard deviation is not a confidence interval.
- **Community**: submitted answers are graded privately. Only complete, isolated
  results with matching versions are averaged. Model attribution, effort and usage
  remain client reported; multiple submissions do not prove independent attempts.
  Individual submissions and usernames are not displayed.

Costs are computed from token counts using [`prices.json`](prices.json)
(USD per million tokens). Corrections to prices are welcome as PRs.

## Contamination canary

Every prompt carries the canary GUID `d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a`.
If this string ever shows up in a model's unprompted output or a training
corpus, the task set has leaked and will be rotated. Please do not train
on this repository.

## Deadline 3.4 private-grader revision

The public prompts, client version 3 and submission JSON envelope are unchanged.
Saved answers can be regraded without calling the models again. The grader scores
26 tasks (1,205 points); task 24 remains unscored because its prompt omits required
final-state labels. Its answer does not affect the score.

A private controller compares typed returned values against expected answers kept
outside Docker containers. The private suite includes independent expected-result
checks, targeted contract cases, and deterministic generated cases. Deliberately
broken solutions and independent correct alternatives check the grader itself.

Valid completed answers earn q^2 - 0.15 * (1-q)^2 task credit, where q is the matched
fraction balanced across reviewed semantic areas within each function, then across
functions. SQL balances empty/nonempty result classes. Repeated identical inputs
cannot multiply credit. Every case must pass for full credit. This replaces the
old requirement to fully pass a test group before receiving any positive credit.
Invalid execution receives -15%; explicit skips receive zero; unresolved blanks
remain incomplete. Token discounts affect positive credit only.

The headline retains the published task points and displays two decimals.
Expanded rows contain a model-specific post-mortem, full-pass points, measurement
details and task credits. The downloadable result data also contains equal-task,
equal-family and one-family-omission comparisons. These alternatives describe the influence of
task selection, not statistical confidence. The nine families are cipher, state
machine, codec, calendar, expression, pair counting, interpreter, SQL and repository
repair. Equal-family scoring weights each family equally and its tasks equally.

Versioned regrades preserve original provenance and sample counts. Current official
saved answers were generated under their original scoring instructions; regrading
does not simulate new generations under revised scoring incentives. The current
saved generations have n=1; repeat variation is unmeasured. Effort labels and model
settings are not independently verified. A higher score on these tasks is not a
claim about overall model capability. Scores from different versions or hashes
must not be pooled. Expanded rows show each task's contribution.

TIME-DL uses the new task credits and the original saved answer-file intervals.
Time budgets are 60/120/240/450 seconds for medium/hard/brutal/nightmare tasks.
Missing or zero intervals receive no discount, following the original convention;
negative credit is never discounted. File intervals do not establish inference
latency, so TIME-DL remains a descriptive estimate and correctness determines
the agent leaderboard order. Timing coverage is shown inside expanded rows.
Community usage remains client reported. The existing
client's `--effort` flag labels a setting but does not configure it.

Public results rendering checks (no browser, network or model calls):

```powershell
node tests/leaderboard.test.cjs
```
