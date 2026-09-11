#!/usr/bin/env python3
"""Deadline public client - run the benchmark prompts against YOUR model.

This script does NOT grade anything (the tests are private). It:
  1. reads the public prompts from ../prompts/
  2. sends each one to your model with your API key
  3. writes submission.json with the raw replies + token counts

Then package the file (--package) and open a "Verified benchmark submission"
issue on the site repo with the zip attached. The maintainer grades it against
the private tests and your verified score appears on the site.

Examples:
  python deadline_client.py --openrouter --model qwen/qwen3-coder
  python deadline_client.py --type gemini --model gemini-2.5-flash --key-env GEMINI_API_KEY
  python deadline_client.py --type openai --model gpt-4o --base-url https://api.openai.com/v1 --key-env OPENAI_API_KEY
  python deadline_client.py --type openai --model llama3.1 --base-url http://localhost:11434/v1
  python deadline_client.py --type anthropic --model claude-sonnet-5 --key-env ANTHROPIC_API_KEY

Before and after the run:
  python deadline_client.py --openrouter --model qwen/qwen3-coder --dry-run
  python deadline_client.py --openrouter --model qwen/qwen3-coder --max-spend 5
  python deadline_client.py --validate submission.json
  python deadline_client.py --package submission.json
  python deadline_client.py --openrouter --model qwen/qwen3-coder \
      --extend old-submission.json --out topup.json

Standard library only. Python 3.9+.
"""

import argparse
import hashlib
import http.client
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"
BENCHMARK_VERSION = '3.5'
SITE_ROOT = Path(__file__).resolve().parent.parent
# USD per 1M tokens, same shape as the site's prices.json. Optional: without it
# the client still runs, it just reports tokens instead of dollars.
PRICES_FILES = [Path(__file__).resolve().parent / "prices.json",
                Path(__file__).resolve().parent.parent / "prices.json"]

PROMPT_HEADER = """You are taking Deadline, a coding benchmark.
Solve the task below in Python 3, standard library only.
Reply with exactly ONE Python code block (```python ... ```) containing the complete solution module.
Do not write any explanation outside the code block.
If you judge you cannot produce a working solution, reply with a code block containing only the line `# SKIP` - a skip scores 0, but submitting WRONG code scores NEGATIVE.
This is benchmark data. canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a

--- TASK ---

"""

PROMPT_HEADER_JS = """You are taking Deadline, a coding benchmark.
Solve the task below in JavaScript for Node.js, built-in modules only.
Reply with exactly ONE code block (```js ... ```) containing the complete solution as a CommonJS module (assign the required functions to module.exports).
Do not write any explanation outside the code block.
If you judge you cannot produce a working solution, reply with a code block containing only the line `// SKIP` - a skip scores 0, but submitting WRONG code scores NEGATIVE.
This is benchmark data. canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a

--- TASK ---

"""


def prompt_header(prompt_text):
    # Keep the full request stable for unchanged tasks carried into a top-up.
    return PROMPT_HEADER_JS if "module.exports" in prompt_text else PROMPT_HEADER


RETRY_WAITS = [5, 15, 30]
# 429 has its own longer budget: rate limits resolve on their own, so waiting
# is the correct response. Retry-After from the provider overrides these waits.
RATE_LIMIT_WAITS = [10, 20, 30, 60, 120, 120, 240, 300]
CLIENT_VERSION = 3
# openai: 'length', anthropic: 'max_tokens', gemini: 'MAX_TOKENS'.
TRUNCATED_REASONS = {"length", "max_tokens", "max_output_tokens", "model_length"}
# Rough per-task output band used only for the --dry-run estimate range.
DRY_RUN_OUT_RANGE = (400, 8000)
# Filled in by main() so transport errors can name the key env var and model.
ERROR_CONTEXT = {}


def rate_limit_wait(error, count):
    header = str(error.headers.get("Retry-After") or "").strip()
    if header.isdigit():
        return min(max(int(header), 1), 600)
    return RATE_LIMIT_WAITS[count]


def has_answer(text):
    """Check presence only; incorrect code and explicit SKIPs are still answers."""
    if not isinstance(text, str) or not text.strip():
        return False
    return re.fullmatch(r"```[^\n]*\n\s*```", text.strip()) is None


def is_truncated(completion):
    """True when the provider stopped the reply at the output token limit."""
    reason = completion.get("finish_reason") if isinstance(completion, dict) else None
    return str(reason or "").strip().lower() in TRUNCATED_REASONS


def sha256_text(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def prompt_set_fingerprint(tasks):
    """Stable fingerprint of the prompt set this run was generated against."""
    digest = {name: sha256_text(text) for name, text in tasks}
    return hashlib.sha256(json.dumps(digest, sort_keys=True).encode("utf-8")).hexdigest()


def token_count(value):
    """Usage numbers only count when they are finite and positive."""
    if type(value) is not int:
        return 0
    if not math.isfinite(value) or value <= 0:
        return 0
    return value


def load_prices():
    """Returns (prices, path). Missing or unreadable price files are not fatal."""
    for path in PRICES_FILES:
        try:
            if path.exists():
                data = json.loads(path.read_text(encoding="utf-8-sig"))
                if isinstance(data, dict):
                    return data, path
        except (OSError, ValueError):
            continue
    return None, None


def price_for(prices, model):
    """USD per 1M tokens for this model id, or None when it is not listed."""
    if not isinstance(prices, dict):
        return None
    listed = {str(k).lower(): v for k, v in prices.items() if not str(k).startswith("_")}
    for candidate in (model, str(model).split("/")[-1]):
        entry = listed.get(str(candidate).lower())
        if isinstance(entry, dict) and all(type(entry.get(k)) in (int,float) and math.isfinite(entry[k])
                and entry[k]>=0 for k in ('in','out')) and all(type(entry[k]) in (int,float)
                and math.isfinite(entry[k]) and entry[k]>=0 for k in ('cached_in','cache_write') if k in entry):
            return entry
    return None


def cost_of(price, tokens_in, tokens_out, cached=0, written=0):
    if not price:
        return None
    fresh=max(0,tokens_in-cached-written)
    return (fresh*price['in']+cached*price.get('cached_in',price['in'])+
            written*price.get('cache_write',price['in'])+tokens_out*price['out'])/1e6


def receipts(meta):
    for record in meta.values():
        if not isinstance(record,dict):continue
        yield record
        for attempt in record.get('previous_attempts',[]):
            if isinstance(attempt,dict) and isinstance(attempt.get('receipt'),dict):
                yield attempt['receipt']


def usage_totals(meta, include_attempts=True):
    """Tokens recorded in the receipts. Spend counts every attempt that was
    returned usage. Both submission totals and spend include saved attempts."""
    tokens_in = tokens_out = 0
    for record in meta.values():
        if not isinstance(record, dict):
            continue
        receipts = [record]
        if include_attempts:
            receipts += [a.get("receipt", {}) for a in record.get("previous_attempts", [])
                         if isinstance(a, dict) and isinstance(a.get("receipt"), dict)]
        for receipt in receipts:
            tokens_in += token_count(receipt.get("tokens_in"))
            tokens_out += token_count(receipt.get("tokens_out"))
    return tokens_in, tokens_out


def spent_so_far(meta, price):
    """Estimated dollars burned by this submission, failed attempts included."""
    total=0
    for r in receipts(meta):
        billed=r.get('billed_cost_usd')
        if type(billed) in (float,int) and math.isfinite(billed) and billed>=0:
            total+=billed;continue
        stamped=(r.get('pricing_snapshot') or {}).get('rates') or price
        tier=(stamped or {}).get('long_context')
        if tier and token_count(r.get('tokens_in'))>tier['threshold']:
            stamped=tier
        cost=cost_of(stamped,token_count(r.get('tokens_in')),token_count(r.get('tokens_out')),
                     token_count(r.get('cached_input_tokens')),token_count(r.get('cache_write_input_tokens')))
        if cost is None:return None
        total+=cost
    return total if price or meta else None


def generation_receipt(args,key,response_id,usage):
    """OpenRouter receipt GET never retries or generates a model answer."""
    from urllib.parse import urlsplit,quote
    if urlsplit(args.base_url).hostname != 'openrouter.ai':return {}
    result={}
    try:
        request=urllib.request.Request('https://openrouter.ai/api/v1/generation?id='+quote(str(response_id),safe=''),
                    headers={'Authorization':'Bearer '+key})
        with urllib.request.urlopen(request,timeout=15) as response:body=json.load(response)['data']
        amount=body.get('total_cost')
        if type(amount) not in (int,float) or not math.isfinite(amount) or amount<0:raise ValueError('missing cost')
        result={'billed_cost_usd':amount,'billing_receipt':body,
                'billing_source':'https://openrouter.ai/api/v1/generation'}
    except (OSError,ValueError,KeyError) as error:
        result['billing_receipt_error']=type(error).__name__
        amount=usage.get('cost')
        if type(amount) in (int,float) and math.isfinite(amount) and amount>=0:
            result.update(billed_cost_usd=amount,billing_source='OpenRouter response usage.cost')
    return result


def save_progress(path, model, replies, meta, extra=None):
    pending = path.with_name(path.name + ".tmp")
    pending.write_text(json.dumps(
        {"client": CLIENT_VERSION, "model": model, **(extra or {}),
         "replies": replies, "meta": meta}),
        encoding="utf-8")
    pending.replace(path)


def http_error_hint(code, detail, context=None):
    """Actionable message for the provider errors that are not worth retrying."""
    context = context if context is not None else ERROR_CONTEXT
    detail = str(detail or "")
    if code in (401, 403):
        key_env = context.get("key_env")
        where = (f"the {key_env} environment variable" if key_env
                 else "the API key (this run sends none: --key-env was not given)")
        return (f"Authentication was refused. Check {where} - the key may be missing, "
                f"expired, or not entitled to {context.get('model', 'this model')}.")
    if code == 402:
        return ("The provider says the account cannot pay for this request. "
                "Add credit (or switch to a cheaper model) and resume.")
    if code == 404 or (code == 400 and "model" in detail.lower()):
        target = f"--model {context.get('model')!r}" if context.get("model") else "--model"
        if context.get("base_url"):
            target += f" and --base-url {context['base_url']!r}"
        return f"The provider does not recognise the request target. Check {target}."
    return None


def post_json(url, payload, headers, failures=None):
    """POST with retries: slow generations get cancelled/dropped mid-stream
    by providers and proxies, so transient failures are retried, not fatal."""
    body = json.dumps(payload).encode("utf-8")
    failures = failures if failures is not None else []
    transient = limited = 0
    while True:
        req = urllib.request.Request(
            url, data=body,
            headers={"Content-Type": "application/json", **headers})
        try:
            with urllib.request.urlopen(req, timeout=600) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            failure = {"error": type(e).__name__, "http_status": e.code}
            failures.append(failure)
            detail = e.read().decode("utf-8", "replace")[:400]
            if e.code == 429 and limited < len(RATE_LIMIT_WAITS):
                wait = rate_limit_wait(e, limited)
                failure["waited"] = wait
                limited += 1
                print(f"  .. rate limited (429), waiting {wait}s "
                      f"(wait {limited}/{len(RATE_LIMIT_WAITS)})", flush=True)
                time.sleep(wait)
                continue
            if e.code in (408, 500, 502, 503, 504) and transient < len(RETRY_WAITS):
                wait = RETRY_WAITS[transient]
                transient += 1
                print(f"  .. API error {e.code}, retrying in {wait}s", flush=True)
                time.sleep(wait)
                continue
            if e.code == 429:
                sys.exit(f"Rate limit persisted through {len(RATE_LIMIT_WAITS)} waits: "
                         f"{detail}. Progress so far is saved - rerun the same "
                         f"command later to resume.")
            hint = http_error_hint(e.code, detail)
            sys.exit(f"API error {e.code}: {detail}" + (f"\n{hint}" if hint else ""))
        except (http.client.IncompleteRead, http.client.HTTPException,
                urllib.error.URLError, TimeoutError, ConnectionError,
                json.JSONDecodeError) as e:
            failures.append({"error": type(e).__name__})
            if transient < len(RETRY_WAITS):
                wait = RETRY_WAITS[transient]
                transient += 1
                print(f"  .. connection dropped ({type(e).__name__}), "
                      f"retrying in {wait}s", flush=True)
                time.sleep(wait)
                continue
            sys.exit(f"Connection kept failing ({type(e).__name__}: "
                     f"{str(e)[:200]}). Progress so far is saved - rerun the "
                     f"same command to resume.")


def request_params(args):
    """Extra provider request parameters (--params), stored with the run."""
    params = getattr(args, "params", None)
    return dict(params) if isinstance(params, dict) else {}


def call_model(args, key, prompt):
    """Returns (text, tokens_in, tokens_out, model_echo, completion_metadata)."""
    failures = []
    params = request_params(args)
    if args.type == "gemini":
        data = post_json(
            f"https://generativelanguage.googleapis.com/v1beta/models/{args.model}:generateContent",
            {"contents": [{"parts": [{"text": prompt}]}], **params},
            {"x-goog-api-key": key},
            failures,
        )
        candidate = data["candidates"][0]
        parts = (candidate.get("content") or {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts if not p.get('thought'))
        u = data.get("usageMetadata", {})
        return text, u.get("promptTokenCount", 0), \
            u.get("candidatesTokenCount", 0) + u.get("thoughtsTokenCount", 0), \
            data.get("modelVersion", ""), \
            {"finish_reason": candidate.get("finishReason"),
             "response_id": data.get("responseId"),
             'cached_input_tokens':u.get('cachedContentTokenCount',0),
             'cache_write_input_tokens':0,'reasoning_tokens':u.get('thoughtsTokenCount',0),
             'provider_usage':u,
             "request_attempts": len(failures) + 1, "transport_errors": failures}

    if args.type == "openai":
        headers = {"Authorization": f"Bearer {key}"} if key else {}
        data = post_json(
            args.base_url.rstrip("/") + "/chat/completions",
            {"model": args.model, "messages": [{"role": "user", "content": prompt}],
             **params},
            headers,
            failures,
        )
        u = data.get("usage", {})
        choice = data["choices"][0]
        return (choice.get("message") or {}).get("content"), \
            u.get("prompt_tokens", 0), u.get("completion_tokens", 0), \
            data.get("model", ""), \
            {"finish_reason": choice.get("finish_reason"),
             "response_id": data.get("id"),
             'cached_input_tokens':(u.get('prompt_tokens_details') or {}).get('cached_tokens',0),
             'cache_write_input_tokens':(u.get('prompt_tokens_details') or {}).get('cache_write_tokens',0),
             'reasoning_tokens':(u.get('completion_tokens_details') or {}).get('reasoning_tokens',0),
             'provider_usage':u, **generation_receipt(args,key,data.get('id'),u),
             "request_attempts": len(failures) + 1, "transport_errors": failures}

    if args.type == "anthropic":
        data = post_json(
            "https://api.anthropic.com/v1/messages",
            {"model": args.model, "max_tokens": 16000,
             "messages": [{"role": "user", "content": prompt}], **params},
            {"x-api-key": key, "anthropic-version": "2023-06-01"},
            failures,
        )
        text = "".join(b.get("text", "") for b in data["content"] if b.get("type") == "text")
        u = data.get("usage", {})
        return text, u.get("input_tokens", 0)+u.get('cache_read_input_tokens',0)+u.get('cache_creation_input_tokens',0), u.get("output_tokens", 0), \
            data.get("model", ""), \
            {"finish_reason": data.get("stop_reason"),
             "response_id": data.get("id"),
             'cached_input_tokens':u.get('cache_read_input_tokens',0),
             'cache_write_input_tokens':u.get('cache_creation_input_tokens',0),'provider_usage':u,
             "request_attempts": len(failures) + 1, "transport_errors": failures}

    sys.exit(f"Unknown --type: {args.type}")


def read_tasks():
    """[(task name, prompt text)] for the prompt set in this checkout."""
    files = sorted(PROMPTS_DIR.glob("*.md"))
    if not files:
        sys.exit(f"No prompts found in {PROMPTS_DIR}. Run this from the repo checkout.")
    return [(p.stem, p.read_text(encoding="utf-8")) for p in files]


def load_submission(path, flag):
    try:
        raw = Path(path).read_bytes()
    except OSError as e:
        sys.exit(f"{flag}: cannot read {path} ({e.strerror or e}).")
    try:
        data = json.loads(raw.decode("utf-8-sig"))
    except ValueError as e:
        sys.exit(f"{flag}: {Path(path).name} is not valid JSON ({e}).")
    if not isinstance(data, dict) or not isinstance(data.get("replies"), dict):
        sys.exit(f"{flag}: {Path(path).name} is not a submission file "
                 f"(no 'replies' object).")
    return data, raw, hashlib.sha256(raw).hexdigest()


# --- validate -------------------------------------------------------------

def check_submission(sub, tasks):
    """Check a finished submission the way the grader will.
    Returns (deficiencies, notes)."""
    replies = sub.get("replies") or {}
    meta = sub.get("meta") if isinstance(sub.get("meta"), dict) else {}
    deficiencies, notes = [], []
    for name, _ in tasks:
        record = meta.get(name) if isinstance(meta.get(name), dict) else {}
        if record.get("response_status") == "truncated":
            deficiencies.append(f"task {name} truncated - run will grade incomplete")
            continue
        if name not in replies:
            deficiencies.append(f"task {name} missing - run will grade incomplete")
            continue
        if not has_answer(replies.get(name)):
            deficiencies.append(f"task {name} blank - run will grade incomplete")
            continue
        tokens_out = record.get("tokens_out")
        tokens_in = record.get("tokens_in")
        metered = type(tokens_in) is int and tokens_in >= 0 and token_count(tokens_out)
        if not metered:
            deficiencies.append(f"task {name} unmetered - headline will be absent")
    if not isinstance(sub.get("settings"), dict) or not str(sub.get("model") or "").strip():
        deficiencies.append("settings not recorded - the grader cannot verify "
                            "how the run was configured")
    extra = sorted(set(replies) - {name for name, _ in tasks})
    if extra:
        deficiencies.append(f"unknown tasks are rejected by the grader: {', '.join(extra[:5])}")
    for field in ('tokens_in','tokens_out'):
        values = [sub.get(field)] + [r.get(field) for r in meta.values() if isinstance(r,dict)]
        if any(v is not None and (type(v) is not int or v<0) for v in values):
            deficiencies.append(f"{field} must be a nonnegative integer")
    total_in,total_out=usage_totals(meta)
    if sub.get('tokens_in') != total_in or sub.get('tokens_out') != total_out:
        deficiencies.append('aggregate usage does not match saved attempts - headline will be absent')
    if not token_count(sub.get("tokens_out")):
        notes.append("no total token count at the top level of the file")
    if not meta:
        notes.append("no per-task receipts (older client version)")
    return deficiencies, notes


def run_validate(path):
    tasks = read_tasks()
    sub, _, digest = load_submission(path, "--validate")
    deficiencies, notes = check_submission(sub, tasks)
    tokens_in, tokens_out = usage_totals(
        sub.get("meta") if isinstance(sub.get("meta"), dict) else {})
    print(f"Validating {Path(path).name} against {len(tasks)} task(s) in {PROMPTS_DIR}")
    print(f"  model {sub.get('model')!r}, effort {sub.get('effort', 'default')!r}, "
          f"client {sub.get('client', 'unknown')}, sha256 {digest[:16]}...")
    print(f"  {len(sub.get('replies') or {})} reply/replies, "
          f"{int(tokens_in):,} tokens in / {int(tokens_out):,} out across the receipts")
    for note in notes:
        print(f"  note: {note}")
    if deficiencies:
        print("NOT READY - the grader would report:")
        for problem in deficiencies:
            print(f"  - {problem}")
        print("Recover missing usage from provider receipts if available. Do not "
              "regenerate an answered task to improve or repair its measurement. "
              "A fresh attempt belongs in a separate run.")
        sys.exit(1)
    print("OK: submission and metering fields are complete; ready for private grading. Answers have not been tested.")


# --- package --------------------------------------------------------------

def issue_body(sub, name, zip_name, digest, tasks_count, tokens_in, tokens_out):
    fingerprint = sub.get("prompt_set_sha256") or sub.get("suite_hash")
    lines = [
        "### Verified benchmark submission",
        "",
        f"- model: `{sub.get('model')}`",
        f"- effort: `{sub.get('effort', 'default')}`",
        f"- client version: `{sub.get('client', 'unknown')}`",
    ]
    if fingerprint:
        lines.append(f"- prompt set: `{fingerprint}`")
    if sub.get("top_up"):
        lines.append(f"- top-up: yes ({len(sub.get('carried_tasks') or [])} carried, "
                     f"{len(sub.get('fresh_tasks') or [])} generated)")
    lines += [
        f"- tasks answered: `{tasks_count}`",
        f"- tokens: `{int(tokens_in):,}` in / `{int(tokens_out):,}` out",
        f"- sha256 of `{name}` inside the zip: `{digest}`",
        "",
        f"The submission JSON is attached to this issue as `{zip_name}` "
        "(GitHub accepts zip attachments; the raw JSON exceeds the issue body limit).",
        f"Unzip it and check that sha256(`{name}`) matches the hash above - "
        "the body pins the attachment, so a swapped or edited file is detectable. "
        "Grade only a file whose hash matches.",
        "",
        "No answers appear in this body by design.",
    ]
    return "\n".join(lines)


def run_package(path):
    source = Path(path)
    sub, raw, digest = load_submission(source, "--package")
    archive = source.with_name(source.name + ".zip")
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(zipfile.ZipInfo(source.name, date_time=(1980, 1, 1, 0, 0, 0)), raw,
                    compress_type=zipfile.ZIP_DEFLATED)
    with zipfile.ZipFile(archive) as zf:
        names = zf.namelist()
        if names != [source.name] or hashlib.sha256(zf.read(source.name)).hexdigest() != digest:
            sys.exit(f"--package: {archive.name} did not round-trip; not writing an issue body.")
    meta = sub.get("meta") if isinstance(sub.get("meta"), dict) else {}
    tokens_in, tokens_out = usage_totals(meta)
    tokens_in = token_count(sub.get("tokens_in")) or tokens_in
    tokens_out = token_count(sub.get("tokens_out")) or tokens_out
    answered = sum(1 for v in (sub.get("replies") or {}).values() if has_answer(v))
    print(f"Wrote {archive} ({archive.stat().st_size:,} bytes, "
          f"{len(raw):,} bytes uncompressed).")
    print("Attach that zip to a 'Verified benchmark submission' issue and paste "
          "the body below (metadata only - no answers):")
    print()
    print(issue_body(sub, source.name, archive.name, digest, answered,
                     tokens_in, tokens_out))
    print()
    print("Power-user lane: open a PR adding the JSON under submissions/ instead - "
          "any size, git provenance, no hash ceremony.")


# --- extend (top-up runs) -------------------------------------------------

def prompt_matches(record, text):
    """Did the old run really see this exact prompt?"""
    recorded = str(record.get("prompt_sha256") or "")
    request_hash = str(record.get("request_prompt_sha256") or "")
    if recorded and recorded != sha256_text(text):
        return False
    if request_hash:
        return request_hash == sha256_text(prompt_header(text) + text)
    if recorded:
        return None  # Missing request-header provenance cannot verify a top-up.
    return None  # nothing recorded: cannot carry, must regenerate


def load_extension(path, args, settings, tasks):
    """Carry over the replies whose prompts are provably unchanged."""
    old, _, old_sha = load_submission(path, "--extend")
    name = Path(path).name
    if str(old.get("model") or "") != args.model:
        sys.exit(f"--extend refused: {name} was generated with model "
                 f"{old.get('model')!r}, not {args.model!r}. A top-up extends one "
                 f"run, so the model must match.")
    old_settings = old.get("settings")
    if isinstance(old_settings, dict):
        differing = sorted(k for k in set(old_settings) | set(settings)
                           if old_settings.get(k) != settings.get(k))
        if differing:
            sys.exit(f"--extend refused: {name} recorded different provider settings "
                     f"({', '.join(differing)}). Rerun with the settings the old run "
                     f"used, or start a fresh run instead of a top-up.")
    else:
        sys.exit(f"--extend refused: {name} has no recorded provider settings; "
                 "an effort label cannot verify the configuration.")
    if old.get('samples',1) != 1:
        sys.exit('--extend requires one individual run, not a combined multi-sample record.')
    old_replies = old.get("replies") or {}
    old_meta = old.get("meta") if isinstance(old.get("meta"), dict) else {}
    replies, meta, carried, unhashed = {}, {}, [], []
    for task, text in tasks:
        record = old_meta.get(task)
        record = record if isinstance(record, dict) else {}
        matched = prompt_matches(record, text) if record else False
        if matched is None:
            unhashed.append(task)
        if matched and record.get('response_status') != 'truncated' and has_answer(old_replies.get(task)):
            replies[task] = old_replies[task]
            meta[task] = {**record, "carried_from": old_sha,
                          'generation_run_id':record.get('generation_run_id') or old.get('generation_run_id') or 'submission-sha256:'+old_sha,
                          'generation_client':record.get('generation_client',old.get('client')),
                          'generation_suite_hash':record.get('generation_suite_hash',old.get('suite_hash'))}
            carried.append(task)
    fresh = [task for task, _ in tasks if task not in replies]
    extra = {"top_up": True,
             "extended_from": {"file": name, "sha256": old_sha,
                               "client": old.get("client"),
                               "model": old.get("model"),
                               "prompt_set_sha256": old.get("prompt_set_sha256")}}
    if old.get("samples") is not None:
        # A top-up extends ONE run; it never adds an independent attempt.
        extra["samples"] = old["samples"]
    print(f"Top-up from {name}: {len(carried)}/{len(tasks)} task(s) carried over "
          f"(prompt hash unchanged), {len(fresh)} to generate.")
    if unhashed:
        print(f"  {len(unhashed)} task(s) in the old file recorded no prompt hash and "
              f"will be regenerated: {', '.join(unhashed[:5])}"
              + (" ..." if len(unhashed) > 5 else ""))
    print("  Sample count is unchanged: a top-up extends one run, it is not a "
          "repeated attempt.")
    return replies, meta, extra


# --- dry run --------------------------------------------------------------

def run_dry(args, tasks, price, prices_path):
    est_in = sum(len(prompt_header(text) + text) / 4 for _, text in tasks)
    low_out, high_out = (n * len(tasks) for n in DRY_RUN_OUT_RANGE)
    print("Dry run: nothing is sent to the provider and nothing is written.")
    print(f"  provider: {args.type}"
          + (f" at {args.base_url}" if args.type == "openai" else ""))
    print(f"  model id: {args.model!r}")
    print(f"  api key : " + (f"{args.key_env} is set" if args.key_env
                             else "none (keyless endpoint)"))
    print(f"  output  : {args.out}")
    print(f"  tasks   : {len(tasks)} in {PROMPTS_DIR}")
    for name, text in tasks:
        print(f"    {name.ljust(24)} ~{int(len(prompt_header(text) + text) / 4):,} prompt tokens")
    print(f"  estimated prompt tokens: ~{int(est_in):,} "
          f"(output typically {low_out:,}-{high_out:,} tokens for this task count)")
    if price:
        print(f"  estimated cost: ${cost_of(price, est_in, low_out):.2f} - "
              f"${cost_of(price, est_in, high_out):.2f} "
              f"(prices from {prices_path}: ${price['in']}/M in, ${price['out']}/M out)")
    else:
        where = prices_path if prices_path else "no prices.json found"
        print(f"  estimated cost: unknown - no price entry for {args.model!r} "
              f"({where}). Token estimates above are the whole estimate.")
    print("Offline preflight only: key presence and model-id syntax are checked; "
          "provider entitlement and available balance are not verified.")
    print("Run the same command without --dry-run to start.")


# --- run ------------------------------------------------------------------

def main():
    global PROMPTS_DIR, BENCHMARK_VERSION
    ap = argparse.ArgumentParser(description="Run Deadline prompts against your model.")
    ap.add_argument('--benchmark-version', choices=['3.4','3.5','3.6'],
                    help='public prompt version; defaults to v3.5, or the version recorded in --validate FILE')
    ap.add_argument("--type", choices=["gemini", "openai", "anthropic"],
                    help="provider protocol (not needed with --openrouter)")
    ap.add_argument("--openrouter", action="store_true",
                    help="shortcut: any model on openrouter.ai with one flag "
                         "(uses OPENROUTER_API_KEY)")
    ap.add_argument("--model",
                    help="model id, e.g. gemini-2.5-flash or qwen/qwen3-coder")
    ap.add_argument("--base-url", default="https://api.openai.com/v1",
                    help="for --type openai: any OpenAI-compatible endpoint")
    ap.add_argument("--key-env", default=None,
                    help="env var holding your API key (omit for keyless local servers)")
    ap.add_argument("--effort", default="default",
                    help="label for the thinking/effort setting you used; a label "
                         "only - set the real request fields with --params")
    ap.add_argument("--params", default="{}",
                    help="JSON object of extra provider request parameters, sent "
                         "with every request and recorded in the submission")
    ap.add_argument("--out", default="submission.json")
    ap.add_argument("--validate", metavar="FILE",
                    help="check a finished submission the way the grader will; "
                         "makes no model calls")
    ap.add_argument("--package", metavar="FILE",
                    help="write FILE.zip plus a metadata-only issue body; "
                         "makes no model calls")
    ap.add_argument("--extend", metavar="OLD_FILE",
                    help="top-up run: carry replies from OLD_FILE whose prompts are "
                         "unchanged and generate only the rest")
    ap.add_argument("--dry-run", action="store_true",
                    help="verify key, model id and cost estimate without spending")
    ap.add_argument("--max-spend", type=float, default=None, metavar="USD",
                    help="checkpoint and stop once estimated spend passes this")
    args = ap.parse_args()
    selected_version = args.benchmark_version
    if not selected_version and args.validate:
        submitted, _, _ = load_submission(args.validate, '--validate')
        selected_version = str(submitted.get('benchmark_version', '')).removeprefix('deadline-') or None
    if selected_version:
        if selected_version not in ('3.4','3.5','3.6'):
            sys.exit('Unknown benchmark version in submission.')
        BENCHMARK_VERSION = selected_version
        if args.benchmark_version or selected_version == '3.6':
            PROMPTS_DIR = SITE_ROOT / ('prompts' if selected_version in ('3.4','3.5') else 'prompts/v'+selected_version)
    if args.max_spend is not None and (not math.isfinite(args.max_spend) or args.max_spend<=0):
        sys.exit('--max-spend must be a finite positive dollar amount.')

    if args.validate:
        return run_validate(args.validate)
    if args.package:
        return run_package(args.package)

    if args.openrouter:
        args.type = "openai"
        args.base_url = "https://openrouter.ai/api/v1"
        args.key_env = args.key_env or "OPENROUTER_API_KEY"
    if not args.type:
        sys.exit("Pass --type (gemini/openai/anthropic) or use --openrouter.")
    if not str(args.model or "").strip():
        sys.exit("Pass --model with the provider's model id.")
    try:
        args.params = json.loads(args.params)
    except ValueError as e:
        sys.exit(f"--params must be a JSON object ({e}).")
    if not isinstance(args.params, dict) or set(args.params) & {"model", "messages", "contents"}:
        sys.exit("--params must be a JSON object and may not override "
                 "model/messages/contents.")
    if args.effort != "default" and not args.params:
        print(f"NOTE: --effort {args.effort!r} is a label only - it is NOT sent to "
              f"the provider. Use --params (e.g. --params "
              f"'{{\"reasoning_effort\": \"high\"}}') to change the request itself.")

    key = ""
    if args.key_env:
        key = os.environ.get(args.key_env, "")
        if not key:
            sys.exit(f"Set the {args.key_env} environment variable first.")
    ERROR_CONTEXT.clear()
    ERROR_CONTEXT.update(model=args.model, key_env=args.key_env,
                         base_url=args.base_url if args.type == "openai" else None)

    tasks = read_tasks()
    prices, prices_path = load_prices()
    price = price_for(prices, args.model)

    if args.dry_run:
        return run_dry(args, tasks, price, prices_path)
    if args.max_spend is not None and not price:
        sys.exit(f"--max-spend needs a price for {args.model!r}. Add it to "
                 f"{PRICES_FILES[0]} as {{\"in\": <USD per 1M>, \"out\": <USD per 1M>}} "
                 f"and rerun, or drop --max-spend.")
    if args.max_spend is not None:
        if args.type=='gemini':
            args.params.setdefault('generationConfig',{}).setdefault('maxOutputTokens',16000)
        elif args.type=='anthropic':args.params.setdefault('max_tokens',16000)
        elif not any(k in args.params for k in ('max_tokens','max_completion_tokens')):
            args.params['max_completion_tokens']=16000

    settings = {"type": args.type, "model": args.model,
                "base_url": args.base_url if args.type == "openai" else None,
                "effort": args.effort, "params": args.params}
    fingerprint = prompt_set_fingerprint(tasks)
    versions_path = SITE_ROOT/'data/versions.json'
    version_info = (json.loads(versions_path.read_text(encoding='utf8')).get('versions', {}).get(BENCHMARK_VERSION, {})
                    if versions_path.exists() else {})

    replies = {}
    meta = {}
    import uuid
    extra = {"effort": args.effort, "settings": settings,
             'benchmark_version':'deadline-'+BENCHMARK_VERSION, 'suite_hash':version_info.get('suite_hash'),
             "prompt_set_sha256": fingerprint,'generation_run_id':str(uuid.uuid4()),
             'pricing_snapshot':{'model':args.model,'rates':price,
                                 'source':str(prices_path) if prices_path else None,
                                 'captured_at':datetime.now(timezone.utc).isoformat()},
             'usage_includes_saved_attempts':True}
    started = time.time()
    output = Path(args.out)
    partial = Path(args.out + ".partial")
    # Older clients also wrote final files containing blanks. Recover those
    # without rerunning every already answered task or editing the saved replies.
    resume_from = partial if partial.exists() else output
    resumed = False
    if resume_from.exists():
        saved = json.loads(resume_from.read_text(encoding="utf-8-sig"))
        if saved.get("model") == args.model:
            saved_settings = saved.get("settings")
            if isinstance(saved_settings, dict) and saved_settings != settings:
                differing = sorted(k for k in set(saved_settings) | set(settings)
                                   if saved_settings.get(k) != settings.get(k))
                sys.exit(f"{resume_from.name} was generated with different provider "
                         f"settings ({', '.join(differing)}). Rerun with the same "
                         f"settings, or use a different --out for a new run.")
            replies = saved.get("replies", {})
            meta = saved.get("meta", {})
            if saved.get('prompt_set_sha256') and saved['prompt_set_sha256'] != fingerprint:
                sys.exit('Saved prompt set changed; use --extend with a new output file.')
            if any(r.get('response_status')=='truncated' for r in meta.values() if isinstance(r,dict)):
                sys.exit('Run INCOMPLETE: a saved reply was truncated at the token limit. '
                         'It cannot be regenerated within this blind-attempt run. '
                         'Start a separate run with a new --out if another attempt is intended.')
            resumed = True
            for field in ("top_up", "extended_from", "samples",'generation_run_id','pricing_snapshot'):
                if field in saved:
                    extra[field] = saved[field]
            answered = sum(has_answer(replies.get(name)) for name, _ in tasks)
            if resume_from == output and answered == len(tasks):
                print(f"{output.name} is already complete; no requests made. "
                      "Use a different --out for a new run.")
                return
            print(f"Resuming: {answered}/{len(tasks)} task(s) already answered "
                  f"(from {resume_from.name}); missing or blank tasks will be requested.")
        else:
            sys.exit(f"{resume_from.name} belongs to {saved.get('model')!r}. "
                     "Choose a different --out; existing results will not be overwritten.")

    if args.extend and not resumed:
        if Path(args.extend).resolve() == output.resolve():
            sys.exit("--extend: point --out at a new file; the old submission is "
                     "the input, not the destination.")
        replies, meta, carried_extra = load_extension(args.extend, args, settings, tasks)
        extra.update(carried_extra)
    elif args.extend:
        print(f"--extend: continuing the top-up already recorded in {resume_from.name}.")

    remaining = [(n,p) for n,p in tasks if not has_answer(replies.get(n))]
    estimate_in = sum(len(prompt_header(p)+p)/4 for _,p in remaining)
    low_out, high_out = (n*len(remaining) for n in DRY_RUN_OUT_RANGE)
    print(f'Preflight v{BENCHMARK_VERSION}: {len(remaining)} new requests; ~{int(estimate_in):,} input tokens. '
          'Output range is an estimate, not a limit.')
    if price:
        print(f'Estimated additional cost: ${cost_of(price,estimate_in,low_out):.2f}-'
              f'${cost_of(price,estimate_in,high_out):.2f} at the recorded rates; caching may reduce it.')
    else:
        print('Estimated cost unavailable: no matching price entry. Token receipts will still be recorded.')

    for name, task_prompt in tasks:
        if has_answer(replies.get(name)):
            continue
        spent=spent_so_far(meta,price)
        if args.max_spend is not None and spent is not None and spent>=args.max_spend:
            save_progress(partial,args.model,replies,meta,extra)
            print(f'Stopping at the spend cap before another request: ~${spent:.4f}.')
            return
        if args.max_spend is not None:
            limit=(args.params.get('generationConfig',{}).get('maxOutputTokens') if args.type=='gemini'
                   else args.params.get('max_completion_tokens',args.params.get('max_tokens')))
            if type(limit) is not int or limit<=0:sys.exit('Spend cap requires a positive integer output-token limit.')
            # Conservative text-token allowance plus protocol overhead, without
            # assuming caching. This reserves against stamped rates, not a
            # provider-enforced account balance.
            reserved_input=len((prompt_header(task_prompt)+task_prompt).encode('utf8'))+1024
            tier=price.get('long_context')
            reserved_rates=tier if tier and reserved_input>tier['threshold'] else price
            reserve=(reserved_input*max(reserved_rates['in'],reserved_rates.get('cache_write',reserved_rates['in']))+
                     limit*reserved_rates['out'])/1e6
            if spent+reserve>args.max_spend:
                save_progress(partial,args.model,replies,meta,extra)
                print(f'Stopping at the spend cap before {name}: ~${spent:.4f} spent; '
                      f'next request reserves ${reserve:.4f} at stamped rates. Progress saved in {partial.name}.')
                return
        print(f"[{name}] asking {args.model} ...", flush=True)
        t0 = time.time()
        request_started = datetime.now(timezone.utc).isoformat(timespec="seconds")
        request = prompt_header(task_prompt) + task_prompt
        text, tin, tout, echo, completion = call_model(args, key, request)
        previous = meta.get(name, {})
        history = list(previous.get("previous_attempts", []))
        if name in replies:
            history.append({"reply": replies[name],
                            "receipt": {k: v for k, v in previous.items()
                                        if k != "previous_attempts"}})
        receipt = {
            "started": request_started,
            "seconds": round(time.time() - t0, 2),
            "tokens_in": tin,
            "tokens_out": tout,
            "model_echo": echo,
            **completion,
            "prompt_sha256": sha256_text(task_prompt),
            "request_prompt_sha256": sha256_text(request),
            "response_status": "answered" if has_answer(text) else "unresolved_blank",
            'generation_run_id':extra['generation_run_id'],
            'generation_client':CLIENT_VERSION,
            'generation_prompt_set_sha256':fingerprint,
            'generation_suite_hash':extra.get('suite_hash'),
            'generation_benchmark_version':extra['benchmark_version'],
            'pricing_snapshot':extra['pricing_snapshot'],
        }
        truncated = is_truncated(completion)
        if truncated:
            # Cut-off code grades as wrong-with-penalty, so it never becomes the
            # answer: keep it as an attempt and stop, exactly like a blank reply.
            receipt["response_status"] = "truncated"
            history.append({"reply": text, "receipt": receipt})
            replies.pop(name, None)
            meta[name] = {"response_status": "truncated", "previous_attempts": history,
                          'finish_reason':completion.get('finish_reason'),
                          'response_id':completion.get('response_id')}
        else:
            replies[name] = text
            meta[name] = receipt
            if history:
                meta[name]["previous_attempts"] = history
        save_progress(partial, args.model, replies, meta, extra)
        spent = spent_so_far(meta, price)
        print(f"[{name}] {receipt['seconds']:.1f}s, {token_count(tout):,.0f} tokens out"
              + (f" - spent ~${spent:.2f}" if spent is not None else ""), flush=True)
        if truncated:
            sys.exit(f"[{name}] The provider stopped mid-reply at the output token "
                     f"limit (finish_reason "
                     f"{str(completion.get('finish_reason'))!r}). The cut-off text was "
                     f"NOT stored as an answer - it is kept as a truncated attempt in "
                     f"{partial.name}. Run INCOMPLETE. This blind attempt cannot "
                     f"be regenerated; another attempt needs a separate --out. "
                     f"No final submission was written.")
        if not has_answer(text):
            sys.exit(f"[{name}] No nonblank answer was returned. Run INCOMPLETE; "
                     f"reply and receipt saved in {partial.name}. "
                     "Rerun the same command to retry this task; completed tasks will be kept. "
                     "No final submission was written.")
        if args.max_spend is not None and spent is not None and spent > args.max_spend:
            done = sum(has_answer(replies.get(n)) for n, _ in tasks)
            print()
            print(f"Stopping at the spend cap: ~${spent:.2f} spent, "
                  f"--max-spend was ${args.max_spend:.2f}.")
            print(f"{done}/{len(tasks)} task(s) answered; progress saved in "
                  f"{partial.name}. No final submission was written.")
            print("Resume with the same command (raise or drop --max-spend); "
                  "completed tasks are kept.")
            return

    tokens_in, tokens_out = usage_totals(meta)
    tokens_in, tokens_out = int(tokens_in), int(tokens_out)
    top_up = bool(extra.get("top_up"))
    carried = sorted(name for name, record in meta.items()
                     if isinstance(record, dict) and record.get("carried_from"))
    seconds = round(sum((m.get('seconds',0) or 0) + sum((a.get('receipt',{}).get('seconds',0) or 0)
                    for a in m.get('previous_attempts',[])) for m in meta.values()),1)
    timing_source = ("sum of per-task durations across the original run and this "
                     "top-up session; excludes pauses between sessions") if top_up else \
        "sum of per-task request durations, including saved attempts; excludes pauses between sessions"

    submission = {
        "client": CLIENT_VERSION,
        "model": args.model,
        "effort": args.effort,
        "settings": settings,
        "prompt_set_sha256": fingerprint,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "seconds": seconds,
        "timing_source": timing_source,
        "meta": meta,
        "replies": replies,
        'cost_usd':spent_so_far(meta,price),
        'cost_basis':'estimated',
    }
    for field in ("top_up", "extended_from", "samples",'generation_run_id','pricing_snapshot','usage_includes_saved_attempts',
                  'benchmark_version','suite_hash'):
        if field in extra:
            submission[field] = extra[field]
    if top_up:
        submission["carried_tasks"] = carried
        submission["fresh_tasks"] = [name for name, _ in tasks if name not in carried]
    if output.exists():
        # Keep the original file when repairing an older completed submission.
        backup = output.with_name(output.name + ".before-resume-" +
                                  datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ"))
        with backup.open("xb") as file:
            file.write(output.read_bytes())
        print(f"Previous submission preserved in {backup.name}.")
    output.write_text(json.dumps(submission), encoding="utf-8")
    partial.unlink(missing_ok=True)
    print()
    print(f"Wrote {args.out} ({tokens_in} tokens in, {tokens_out} out"
          + (f", ~${submission['cost_usd']:.2f}" if submission['cost_usd'] is not None else "") + ").")
    if top_up:
        print(f"Top-up: {len(carried)} carried task(s), "
              f"{len(tasks) - len(carried)} generated in this session.")
    print(f"Check it with:  python {Path(__file__).name} --validate {args.out}")
    print(f"Package it with: python {Path(__file__).name} --package {args.out}")
    print("Then open a 'Verified benchmark submission' issue with the zip attached.")


if __name__ == "__main__":
    main()
