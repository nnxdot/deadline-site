"""Provider transport for Deadline 4; the caller makes exactly one generation request."""
import json
import math
import re
import sys
import urllib.request
TRUNCATED_REASONS = {"length", "max_tokens", "max_output_tokens", "model_length"}

def post_json(*args, **kwargs):
    raise RuntimeError("Use client.py; generation requires its checkpoint and budget controller")

def has_answer(text):
    """Check presence only; incorrect code and explicit SKIPs are still answers."""
    if not isinstance(text, str) or not text.strip():
        return False
    return re.fullmatch(r"```[^\n]*\n\s*```", text.strip()) is None

def is_truncated(completion):
    """True when the provider stopped the reply at the output token limit."""
    reason = completion.get("finish_reason") if isinstance(completion, dict) else None
    return str(reason or "").strip().lower() in TRUNCATED_REASONS

def token_count(value):
    """Usage numbers only count when they are finite and positive."""
    if type(value) is not int:
        return 0
    if not math.isfinite(value) or value <= 0:
        return 0
    return value

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
