import contextlib
import hashlib
import http.client
import io
import json
import urllib.error
import zipfile
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import deadline_client as client


def response(text, finish_reason="stop", tokens=20):
    return {"id": "response-123", "model": "test-model",
            "choices": [{"message": {"content": text}, "finish_reason": finish_reason}],
            "usage": {"prompt_tokens": 10, "completion_tokens": tokens}}


def anthropic_response(text, stop_reason="end_turn"):
    return {"id": "anthropic-response", "model": "test-model",
            "content": [{"type": "text", "text": text}], "stop_reason": stop_reason,
            "usage": {"input_tokens": 10, "output_tokens": 20}}


def gemini_response(text, finish_reason="STOP"):
    return {"candidates": [{"content": {"parts": [{"text": text}]},
                            "finishReason": finish_reason}],
            "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 20},
            "modelVersion": "test-model", "responseId": "gemini-response"}


def http_response(data):
    return io.BytesIO(json.dumps(data).encode("utf8"))


class ClientTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="deadline-client-test-")
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.prompts = self.root / "prompts"
        self.prompts.mkdir()
        self.names = ["01_one", "02_two", "03_three"]
        for name in self.names:
            (self.prompts / (name + ".md")).write_text(name, encoding="utf8")
        self.output = self.root / "submission.json"
        self.partial = self.root / "submission.json.partial"
        self.prices = self.root / "prices.json"
        self.receipt = {"tokens_in": 11, "tokens_out": 23490,
                        "seconds": 1589.68, "model_echo": "test-model"}
        self.settings = {"type": "openai", "model": "test-model",
                         "base_url": "https://api.openai.com/v1",
                         "effort": "default", "params": {}}

    def saved(self, replies, target=None):
        data = {"client": 2, "model": "test-model", "replies": replies,
                "meta": {name: dict(self.receipt) for name in replies}}
        (target or self.partial).write_text(json.dumps(data), encoding="utf8")
        return data

    def finished(self, name="finished.json", **overrides):
        """A complete submission as this client writes them."""
        data = {"client": client.CLIENT_VERSION, "model": "test-model",
                "effort": "default", "settings": dict(self.settings),
                "prompt_set_sha256": "f" * 64, "tokens_in": 33, "tokens_out": 66,
                "seconds": 9.0,
                "meta": {task: {"tokens_in": 11, "tokens_out": 22, "seconds": 3.0,
                                "model_echo": "test-model",
                                "prompt_sha256": client.sha256_text(task)}
                         for task in self.names},
                "replies": {task: f"```python\n# {task}\n```" for task in self.names}}
        data.update(overrides)
        path = self.root / name
        path.write_text(json.dumps(data), encoding="utf8")
        return path, data

    def price_list(self, dollars_per_million=1000.0):
        self.prices.write_text(json.dumps(
            {"test-model": {"in": dollars_per_million, "out": dollars_per_million}}),
            encoding="utf8")

    def test_36_selection_is_explicit_and_dry_run_makes_no_calls(self):
        folder=self.root/'prompts/v3.6';folder.mkdir()
        (folder/'28_new.md').write_text('new prompt',encoding='utf8')
        with patch.object(client,'SITE_ROOT',self.root), patch.object(client,'BENCHMARK_VERSION','3.5'):
            request,_,log=self.run_client([],extra=('--benchmark-version','3.6','--dry-run'))
        request.assert_not_called()
        self.assertIn('28_new',log)
        self.assertNotIn('01_one',log)

    def test_all_saved_attempts_use_their_own_cache_prices(self):
        meta={'t':{'tokens_in':1000000,'cached_input_tokens':800000,'tokens_out':100000,
             'pricing_snapshot':{'rates':{'in':5,'cached_in':.5,'out':20}},
             'previous_attempts':[{'reply':'','receipt':{'tokens_in':1000000,'tokens_out':100000,
                 'pricing_snapshot':{'rates':{'in':2,'out':10}}}}]}}
        self.assertEqual(client.usage_totals(meta),(2000000,200000))
        self.assertAlmostEqual(client.spent_so_far(meta,{'in':999,'out':999}),6.4)

    def run_client(self, responses, *, provider="openai", error=None, extra=(),
                   model="test-model", out=True, code=None):
        args = ["deadline_client.py"]
        if provider:
            args += ["--type", provider]
        if model:
            args += ["--model", model]
        if out:
            args += ["--out", str(self.output)]
        args += list(extra)
        log = io.StringIO()
        with patch.object(client, "PROMPTS_DIR", self.prompts), \
             patch.object(client, "PRICES_FILES", [self.prices]), \
             patch.object(client.sys, "argv", args), \
             patch.object(client.urllib.request, "urlopen", side_effect=responses) as request, \
             patch.object(client.time, "sleep") as sleep, contextlib.redirect_stdout(log):
            if error:
                with self.assertRaisesRegex(SystemExit, error):
                    client.main()
            elif code is not None:
                with self.assertRaises(SystemExit) as caught:
                    client.main()
                self.assertEqual(caught.exception.code, code)
            else:
                client.main()
        return request, sleep, log.getvalue()

    def read(self, path):
        return json.loads(path.read_text(encoding="utf8"))

    def test_blank_reply_stops_without_final_submission(self):
        for text in (None, "", " ", "\r\n\t", "```python\n \n```", "```js\n```"):
            with self.subTest(text=text):
                self.partial.unlink(missing_ok=True)
                request, sleep, _ = self.run_client(
                    [http_response(response(text, "length"))], error="Run INCOMPLETE")
                request.assert_called_once()
                sleep.assert_not_called()
                self.assertFalse(self.output.exists())
                saved = self.read(self.partial)
                self.assertEqual(saved["replies"], {})
                receipt = saved["meta"]["01_one"]
                self.assertEqual(receipt["response_status"], "truncated")
                self.assertEqual(receipt["finish_reason"], "length")
                self.assertEqual(receipt["response_id"], "response-123")
                self.assertEqual(receipt['previous_attempts'][0]['receipt']["tokens_out"], 20)

    def test_connection_drop_then_blank_does_not_complete_task(self):
        original = self.saved({"01_one": "# SKIP"})
        request, sleep, _ = self.run_client(
            [http.client.IncompleteRead(b"partial", 100), http_response(response(" "))],
            error="02_two.*INCOMPLETE")
        self.assertEqual(request.call_count, 2)
        self.assertEqual(request.call_args_list[0].args[0].data,
                         request.call_args_list[1].args[0].data)
        sleep.assert_called_once_with(5)
        saved = self.read(self.partial)
        self.assertEqual(saved["replies"], {"01_one": "# SKIP", "02_two": " "})
        self.assertEqual(saved["meta"]["01_one"], original["meta"]["01_one"])
        self.assertEqual(saved["meta"]["02_two"]["request_attempts"], 2)
        self.assertEqual(saved["meta"]["02_two"]["transport_errors"], [{"error": "IncompleteRead"}])
        self.assertFalse(self.output.exists())

    def test_transport_retry_budget_remains_bounded_and_progress_survives(self):
        self.saved({"01_one": "def solve(): return 1"})
        before = self.partial.read_bytes()
        request, sleep, _ = self.run_client(
            [http.client.IncompleteRead(b"", 100) for _ in range(4)],
            error="Connection kept failing")
        self.assertEqual(request.call_count, 4)
        self.assertEqual([c.args[0] for c in sleep.call_args_list], [5, 15, 30])
        self.assertEqual(len({c.args[0].data for c in request.call_args_list}), 1)
        self.assertEqual(self.partial.read_bytes(), before)
        self.assertFalse(self.output.exists())

    def test_rate_limit_honors_retry_after_with_own_budget_then_saves(self):
        self.saved({"01_one": "def solve(): return 1"})
        limited = [urllib.error.HTTPError("url", 429, "rate", {"Retry-After": "42"},
                                          io.BytesIO(b"slow down"))
                   for _ in range(len(client.RATE_LIMIT_WAITS) + 1)]
        request, sleep, _ = self.run_client(limited, error="Rate limit persisted")
        self.assertEqual(request.call_count, len(client.RATE_LIMIT_WAITS) + 1)
        self.assertEqual([c.args[0] for c in sleep.call_args_list],
                         [42] * len(client.RATE_LIMIT_WAITS))
        self.assertFalse(self.output.exists())

    def test_rate_limit_without_retry_after_uses_growing_waits(self):
        self.saved({"01_one": "def solve(): return 1"})
        responses = [urllib.error.HTTPError("url", 429, "rate", {}, io.BytesIO(b"")),
                     urllib.error.HTTPError("url", 429, "rate", {}, io.BytesIO(b"")),
                     http_response(response("def solve(): return 2")),
                     http_response(response("def solve(): return 3"))]
        request, sleep, _ = self.run_client(responses)
        self.assertEqual([c.args[0] for c in sleep.call_args_list],
                         client.RATE_LIMIT_WAITS[:2])
        self.assertTrue(self.output.exists())

    def test_resume_retries_blank_and_keeps_answers_and_skip(self):
        original = self.saved({"01_one": "def solve(): return 1", "02_two": " ",
                               "03_three": "```python\n# SKIP\n```"})
        reply = "\n```python\ndef solve(): return 2\n```\n"
        request, _, log = self.run_client([http_response(response(reply))])
        request.assert_called_once()
        self.assertIn("02_two", request.call_args.args[0].data.decode())
        self.assertIn("2/3 task(s) already answered", log)
        result = self.read(self.output)
        self.assertEqual(result["client"], 3)
        self.assertEqual(result["replies"], {**original["replies"], "02_two": reply})
        self.assertEqual(result["meta"]["02_two"]["previous_attempts"],
                         [{"reply": " ", "receipt": self.receipt}])
        self.assertEqual(result["meta"]["01_one"], original["meta"]["01_one"])
        self.assertEqual(result["tokens_out"], 23490 * 3 + 20)
        self.assertFalse(self.partial.exists())

    def test_repeated_blank_resumes_preserve_each_attempt(self):
        self.saved({"01_one": "# SKIP", "03_three": "// SKIP"})
        for text in (" ", "\n"):
            self.run_client([http_response(response(text))], error="Run INCOMPLETE")
        self.run_client([http_response(response("def solve(): return 2"))])
        history = self.read(self.output)["meta"]["02_two"]["previous_attempts"]
        self.assertEqual([a["reply"] for a in history], [" ", "\n"])
        self.assertTrue(all(a["receipt"]["response_status"] == "unresolved_blank" for a in history))

    def test_legacy_final_with_blank_can_resume_and_original_is_backed_up(self):
        self.saved({"01_one": "# SKIP", "02_two": " ", "03_three": "# SKIP"}, self.output)
        before = self.output.read_bytes()
        request, _, _ = self.run_client([http_response(response("def solve(): return 2"))])
        request.assert_called_once()
        backups = list(self.root.glob("submission.json.before-resume-*"))
        self.assertEqual(len(backups), 1)
        self.assertEqual(backups[0].read_bytes(), before)
        self.assertEqual(self.read(self.output)["meta"]["02_two"]["previous_attempts"][0]["reply"], " ")

    def test_failed_repair_leaves_original_final_file_untouched(self):
        self.saved({"01_one": "# SKIP", "02_two": " ", "03_three": "# SKIP"}, self.output)
        before = self.output.read_bytes()
        self.run_client([http_response(response(None))], error="Run INCOMPLETE")
        self.assertEqual(self.output.read_bytes(), before)
        self.assertIsNone(self.read(self.partial)["replies"]["02_two"])

    def test_complete_final_makes_no_requests_and_is_not_rewritten(self):
        self.saved({name: "# SKIP" for name in self.names}, self.output)
        before = self.output.read_bytes()
        request, _, log = self.run_client([])
        request.assert_not_called()
        self.assertIn("already complete", log)
        self.assertEqual(self.output.read_bytes(), before)

    def test_partial_takes_precedence_over_older_final(self):
        self.saved({name: "# SKIP" for name in self.names}, self.output)
        self.saved({"01_one": "# SKIP", "02_two": " ", "03_three": "# SKIP"})
        request, _, _ = self.run_client([http_response(response("def solve(): return 2"))])
        request.assert_called_once()
        self.assertEqual(self.read(self.output)["replies"]["02_two"], "def solve(): return 2")

    def test_fresh_run_preserves_nonblank_wrong_answers_and_explicit_skips(self):
        replies = ["not valid code", "```python\n# SKIP\n```", "// SKIP"]
        self.run_client([http_response(response(text)) for text in replies])
        self.assertEqual(self.read(self.output)["replies"], dict(zip(self.names, replies)))

    def test_gemini_missing_answer_is_saved_with_completion_reason(self):
        data = {"candidates": [{"finishReason": "MAX_TOKENS"}],
                "usageMetadata": {"promptTokenCount": 10, "thoughtsTokenCount": 20},
                "modelVersion": "test-model", "responseId": "gemini-response"}
        self.run_client([http_response(data)], provider="gemini", error="Run INCOMPLETE")
        receipt = self.read(self.partial)["meta"]["01_one"]
        self.assertEqual(receipt["finish_reason"], "MAX_TOKENS")
        self.assertEqual(receipt['previous_attempts'][0]['receipt']["tokens_out"], 20)

    def test_new_run_records_settings_and_per_task_prompt_hashes(self):
        self.run_client([http_response(response(f"```python\n# {n}\n```"))
                         for n in self.names])
        result = self.read(self.output)
        self.assertEqual(result["settings"], self.settings)
        self.assertEqual(result["meta"]["01_one"]["prompt_sha256"],
                         client.sha256_text("01_one"))
        self.assertEqual(result["meta"]["01_one"]["request_prompt_sha256"],
                         client.sha256_text(client.PROMPT_HEADER + "01_one"))
        self.assertEqual(result["prompt_set_sha256"],
                         client.prompt_set_fingerprint([(n, n) for n in self.names]))
        self.assertIn("excludes pauses between sessions", result["timing_source"])
        self.assertNotIn("top_up", result)

    # --- --validate ------------------------------------------------------

    def test_validate_clean_submission_reports_headline_available(self):
        path, _ = self.finished()
        request, _, log = self.run_client([], extra=["--validate", str(path)],
                                          provider=None, model=None, out=False)
        request.assert_not_called()
        self.assertIn("ready for private grading", log)
        self.assertIn("Answers have not been tested", log)
        self.assertNotIn("NOT READY", log)

    def test_validate_reports_unmetered_task_and_exits_nonzero(self):
        path, data = self.finished()
        data["meta"]["02_two"].pop("tokens_out")
        data["meta"]["03_three"]["tokens_out"] = 0
        path.write_text(json.dumps(data), encoding="utf8")
        _, _, log = self.run_client([], extra=["--validate", str(path)],
                                    provider=None, model=None, out=False, code=1)
        self.assertIn("task 02_two unmetered - headline will be absent", log)
        self.assertIn("task 03_three unmetered - headline will be absent", log)
        self.assertNotIn("grades complete", log)

    def test_validate_reports_blank_missing_and_unrecorded_settings(self):
        path, data = self.finished()
        data["replies"]["02_two"] = "```python\n \n```"
        data["replies"].pop("03_three")
        data.pop("settings")
        path.write_text(json.dumps(data), encoding="utf8")
        _, _, log = self.run_client([], extra=["--validate", str(path)],
                                    provider=None, model=None, out=False, code=1)
        self.assertIn("task 02_two blank - run will grade incomplete", log)
        self.assertIn("task 03_three missing - run will grade incomplete", log)
        self.assertIn("settings not recorded", log)

    def test_validate_rejects_a_checkpoint_holding_a_truncated_task(self):
        self.price_list()
        self.run_client([http_response(response("```python\ndef solve():", "length"))],
                        error="token limit")
        _, _, log = self.run_client([], extra=["--validate", str(self.partial)],
                                    provider=None, model=None, out=False, code=1)
        self.assertIn("task 01_one truncated - run will grade incomplete", log)

    # --- truncation ------------------------------------------------------

    def test_truncated_reply_is_never_stored_as_the_answer(self):
        self.saved({"01_one": "def solve(): return 1"})
        cut = "```python\ndef solve():\n    return 'unfinis"
        self.run_client([http_response(response(cut, "length"))], error="token limit")
        saved = self.read(self.partial)
        self.assertNotIn("02_two", saved["replies"])
        self.assertEqual(saved["replies"]["01_one"], "def solve(): return 1")
        record = saved["meta"]["02_two"]
        self.assertEqual(record["response_status"], "truncated")
        self.assertEqual([a["reply"] for a in record["previous_attempts"]], [cut])
        self.assertEqual(record["previous_attempts"][0]["receipt"]["response_status"],
                         "truncated")
        self.assertEqual(record["previous_attempts"][0]["receipt"]["finish_reason"],
                         "length")
        self.assertFalse(self.output.exists())

    def test_resume_after_truncation_keeps_prior_work_and_the_cut_attempt(self):
        cut = "```python\ndef solve():"
        self.saved({"01_one": "def solve(): return 1"})
        self.run_client([http_response(response(cut, "length"))], error="token limit")
        request,_,_=self.run_client([],error='cannot be regenerated')
        request.assert_not_called()
        result = self.read(self.partial)
        self.assertEqual(result["replies"]["01_one"], "def solve(): return 1")
        self.assertNotIn('02_two',result['replies'])
        self.assertEqual([a["reply"] for a in result["meta"]["02_two"]["previous_attempts"]],
                         [cut])
        self.assertEqual(result["meta"]["02_two"]["response_status"], "truncated")
        self.assertEqual(client.usage_totals(result['meta'])[1],23490+20)
        self.assertFalse(self.output.exists())

    def test_truncation_is_detected_on_every_provider_path(self):
        cases = [("openai", response("```python\ndef f():", "length")),
                 ("anthropic", anthropic_response("```python\ndef f():", "max_tokens")),
                 ("gemini", gemini_response("```python\ndef f():", "MAX_TOKENS"))]
        for provider, payload in cases:
            with self.subTest(provider=provider):
                self.partial.unlink(missing_ok=True)
                self.run_client([http_response(payload)], provider=provider,
                                error="stopped mid-reply at the output token limit")
                saved = self.read(self.partial)
                self.assertNotIn("01_one", saved["replies"])
                self.assertEqual(saved["meta"]["01_one"]["response_status"], "truncated")

    def test_normal_finish_reasons_are_not_treated_as_truncation(self):
        for provider, payload in [("openai", response("```python\n# ok\n```", "stop")),
                                  ("anthropic", anthropic_response("```python\n# ok\n```")),
                                  ("gemini", gemini_response("```python\n# ok\n```"))]:
            with self.subTest(provider=provider):
                self.output.unlink(missing_ok=True)
                self.partial.unlink(missing_ok=True)
                self.run_client([http_response(payload) for _ in range(3)], provider=provider)
                self.assertEqual(len(self.read(self.output)["replies"]), 3)

    # --- cost controls ---------------------------------------------------

    def test_dry_run_makes_no_calls_and_prices_the_task_set(self):
        self.price_list()
        request, _, log = self.run_client([], extra=["--dry-run"])
        request.assert_not_called()
        self.assertIn("Dry run", log)
        self.assertIn("tasks   : 3", log)
        self.assertIn("estimated cost: $", log)
        self.assertFalse(self.output.exists())
        self.assertFalse(self.partial.exists())

    def test_dry_run_without_prices_degrades_to_token_estimates(self):
        request, _, log = self.run_client([], extra=["--dry-run"])
        request.assert_not_called()
        self.assertIn("estimated prompt tokens", log)
        self.assertIn("no price entry", log)

    def test_progress_line_reports_running_spend_when_prices_are_known(self):
        self.price_list()  # $1000/M in and out: 30 tokens a task = $0.03
        _, _, log = self.run_client([http_response(response(f"```python\n# {n}\n```"))
                                     for n in self.names])
        self.assertIn("spent ~$0.03", log)
        self.assertIn("spent ~$0.09", log)

    def test_max_spend_checkpoints_and_stops_with_a_resume_hint(self):
        self.price_list()
        request, _, log = self.run_client(
            [http_response(response(f"```python\n# {n}\n```")) for n in self.names],
            extra=["--max-spend", "0.05"])
        self.assertEqual(request.call_count, 0)
        self.assertIn("Stopping at the spend cap", log)
        self.assertIn("reserves", log)
        self.assertFalse(self.output.exists())
        saved = self.read(self.partial)
        self.assertEqual(sorted(saved["replies"]), [])
        # Resuming with a bigger cap finishes the run and keeps the earlier work.
        self.run_client([http_response(response(f"```python\n# {n}\n```")) for n in self.names],
                        extra=["--max-spend", "100"])
        result = self.read(self.output)
        self.assertEqual(sorted(result["replies"]), self.names)
        self.assertEqual(result["tokens_out"], 60)

    def test_max_spend_refuses_when_the_model_has_no_price(self):
        self.run_client([], extra=["--max-spend", "1"],
                        error="--max-spend needs a price")

    # --- honesty and error taxonomy --------------------------------------

    def test_effort_without_params_warns_once_that_it_is_a_label(self):
        _, _, log = self.run_client(
            [http_response(response(f"```python\n# {n}\n```")) for n in self.names],
            extra=["--effort", "high"])
        self.assertEqual(log.count("label only"), 1)
        self.assertEqual(self.read(self.output)["effort"], "high")

    def test_params_are_sent_and_recorded_and_silence_the_effort_warning(self):
        _, _, log = self.run_client(
            [http_response(response(f"```python\n# {n}\n```")) for n in self.names],
            extra=["--effort", "high", "--params", '{"reasoning_effort": "high"}'])
        self.assertNotIn("label only", log)
        result = self.read(self.output)
        self.assertEqual(result["settings"]["params"], {"reasoning_effort": "high"})

    def test_provider_errors_map_to_actionable_messages(self):
        cases = {401: "Authentication was refused", 403: "Authentication was refused",
                 402: "cannot pay for this request",
                 404: "does not recognise the request target"}
        for status, expected in cases.items():
            with self.subTest(status=status):
                self.partial.unlink(missing_ok=True)
                self.run_client([urllib.error.HTTPError("url", status, "no", {},
                                                        io.BytesIO(b"denied"))],
                                error=expected)

    # --- --package -------------------------------------------------------

    def test_package_zips_only_the_json_and_pins_it_by_hash(self):
        secret = "```python\ndef solve(): return 'do-not-print-me'\n```"
        path, _ = self.finished(replies={name: secret + name for name in self.names})
        request, _, log = self.run_client([], extra=["--package", str(path)],
                                          provider=None, model=None, out=False)
        request.assert_not_called()
        archive = path.with_name(path.name + ".zip")
        with zipfile.ZipFile(archive) as zf:
            self.assertEqual(zf.namelist(), ["finished.json"])
            contained = zf.read("finished.json")
        self.assertEqual(contained, path.read_bytes())
        self.assertIn(hashlib.sha256(contained).hexdigest(), log)
        self.assertNotIn("do-not-print-me", log)
        self.assertIn("attached to this issue", log)
        self.assertIn("matches the hash above", log)
        self.assertIn("test-model", log)

    def test_package_body_carries_metadata_only(self):
        path, data = self.finished()
        _, _, log = self.run_client([], extra=["--package", str(path)],
                                    provider=None, model=None, out=False)
        body = log[log.index("### Verified benchmark submission"):]
        self.assertIn(f"- prompt set: `{data['prompt_set_sha256']}`", body)
        self.assertIn("- tasks answered: `3`", body)
        self.assertIn("- tokens: `33` in / `66` out", body)
        for reply in data["replies"].values():
            self.assertNotIn(reply, body)

    # --- --extend (top-up runs) ------------------------------------------

    def extendable(self):
        path, data = self.finished(
            name="old.json",
            meta={"01_one": {**self.receipt, "prompt_sha256": client.sha256_text("01_one"),
                             'request_prompt_sha256':client.sha256_text(client.PROMPT_HEADER+'01_one')},
                  "02_two": {**self.receipt, "prompt_sha256": "0" * 64},
                  "03_three": dict(self.receipt)},
            replies={name: f"```python\n# old {name}\n```" for name in self.names})
        return path, data

    def test_extend_carries_only_tasks_whose_prompt_hash_still_matches(self):
        old, data = self.extendable()
        request, _, log = self.run_client(
            [http_response(response("```python\n# new 02\n```")),
             http_response(response("```python\n# new 03\n```"))],
            extra=["--extend", str(old)])
        self.assertEqual(request.call_count, 2)
        self.assertIn("1/3 task(s) carried over", log)
        result = self.read(self.output)
        self.assertTrue(result["top_up"])
        self.assertEqual(result["carried_tasks"], ["01_one"])
        self.assertEqual(result["fresh_tasks"], ["02_two", "03_three"])
        self.assertEqual(result["replies"]["01_one"], data["replies"]["01_one"])
        self.assertEqual(result["replies"]["02_two"], "```python\n# new 02\n```")
        self.assertEqual(result["meta"]["01_one"]["carried_from"],
                         hashlib.sha256(old.read_bytes()).hexdigest())
        self.assertNotIn("carried_from", result["meta"]["02_two"])
        self.assertEqual(result["extended_from"]["file"], "old.json")
        # Usage sums across both sessions; timing says so.
        self.assertEqual(result["tokens_out"], 23490 + 20 + 20)
        self.assertEqual(result["tokens_in"], 11 + 10 + 10)
        self.assertIn("top-up session", result["timing_source"])

    def test_extend_keeps_the_sample_count_of_the_run_it_extends(self):
        old, _ = self.extendable()
        data = self.read(old)
        data["samples"] = 1
        old.write_text(json.dumps(data), encoding="utf8")
        _, _, log = self.run_client(
            [http_response(response("```python\n# new 02\n```")),
             http_response(response("```python\n# new 03\n```"))],
            extra=["--extend", str(old)])
        self.assertEqual(self.read(self.output)["samples"], 1)
        self.assertIn("Sample count is unchanged", log)

    def test_36_top_up_preserves_legacy_python_and_js_requests(self):
        texts = {name: name for name in self.names}
        texts['03_three'] = 'Export solve using module.exports.'
        records = {}
        with patch.object(client, 'BENCHMARK_VERSION', '3.5'):
            for name, text in texts.items():
                records[name] = {**self.receipt,
                    'prompt_sha256': client.sha256_text(text),
                    'request_prompt_sha256': client.sha256_text(client.prompt_header(text) + text)}
        old, original = self.finished(name='old-35.json', meta=records,
                                      benchmark_version='3.5', samples=1)
        folder = self.prompts / 'v3.6'; folder.mkdir()
        for name, text in {**texts, '28_new': 'A new task.'}.items():
            (folder / (name + '.md')).write_text(text, encoding='utf8')
        with patch.object(client, 'SITE_ROOT', self.root), \
             patch.object(client, 'BENCHMARK_VERSION', '3.5'):
            request, _, _ = self.run_client(
                [http_response(response('```python\n# new answer\n```'))],
                extra=['--benchmark-version', '3.6', '--extend', str(old)])
        self.assertEqual(request.call_count, 1)
        result = self.read(self.output)
        self.assertEqual(result['carried_tasks'], self.names)
        self.assertEqual(result['fresh_tasks'], ['28_new'])
        self.assertEqual(result['samples'], 1)
        for name in self.names:
            self.assertEqual(result['replies'][name], original['replies'][name])
            self.assertEqual(result['meta'][name]['request_prompt_sha256'],
                             records[name]['request_prompt_sha256'])

    def test_extend_refuses_when_the_settings_do_not_match(self):
        old, data = self.extendable()
        data["settings"]["effort"] = "high"
        old.write_text(json.dumps(data), encoding="utf8")
        self.run_client([], extra=["--extend", str(old)],
                        error=r"--extend refused: old.json recorded different provider "
                              r"settings \(effort\)")
        self.assertFalse(self.output.exists())

    def test_extend_refuses_a_different_model(self):
        old, data = self.extendable()
        data["model"] = "other-model"
        old.write_text(json.dumps(data), encoding="utf8")
        self.run_client([], extra=["--extend", str(old)],
                        error="was generated with model 'other-model'")

    def test_extend_resumes_a_partial_top_up_without_recarrying(self):
        old, _ = self.extendable()
        self.run_client([http_response(response(" "))],
                        extra=["--extend", str(old)], error="Run INCOMPLETE")
        self.assertEqual(sorted(self.read(self.partial)["replies"]), ["01_one", "02_two"])
        _, _, log = self.run_client(
            [http_response(response("```python\n# new 02\n```")),
             http_response(response("```python\n# new 03\n```"))],
            extra=["--extend", str(old)])
        self.assertIn("continuing the top-up", log)
        result = self.read(self.output)
        self.assertTrue(result["top_up"])
        self.assertEqual(result["carried_tasks"], ["01_one"])

    def test_anthropic_empty_answer_is_saved_with_completion_reason(self):
        data = {"content": [], "stop_reason": "max_tokens", "id": "anthropic-response",
                "model": "test-model", "usage": {"input_tokens": 10, "output_tokens": 20}}
        self.run_client([http_response(data)], provider="anthropic", error="Run INCOMPLETE")
        receipt = self.read(self.partial)["meta"]["01_one"]
        self.assertEqual(receipt["finish_reason"], "max_tokens")
        self.assertEqual(receipt["response_id"], "anthropic-response")


if __name__ == "__main__":
    unittest.main()
