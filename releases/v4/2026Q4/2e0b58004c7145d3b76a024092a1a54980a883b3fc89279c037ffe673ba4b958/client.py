#!/usr/bin/env python3
"""DEADLINE 4 public client: raw API, immutable resumes, metering and ZIP intake."""
import argparse
import copy
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import time
import urllib.request
import urllib.error
from urllib.parse import urlsplit
import uuid
import zipfile

ROOT=Path(__file__).resolve().parent
VERSION='deadline-4.0'
ID=re.compile(r'(?:d[1-5]|c[1-4])_0[1-8]_wave\d{4}Q[1-4]')


def sha(text):return hashlib.sha256(text.encode()).hexdigest()
def canonical(x):return json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False)
def save(path,data):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    pending=path.with_name(path.name+'.tmp-'+uuid.uuid4().hex)
    pending.write_text(canonical(data)+'\n',encoding='utf-8');pending.replace(path)


def load_suite(root=ROOT,lane='api'):
    root=Path(root)
    m=json.loads((root/'manifest.json').read_text(encoding='utf-8-sig'))
    if m.get('benchmark_version')!=VERSION or lane not in ('api','agent') or m.get('task_count')!=len(m.get('tasks',[])):
        raise ValueError('Invalid wave/lane manifest')
    prompts={}
    for name, expected in m.get('public_hashes', {}).items():
        path=(root/name).resolve()
        if not path.is_relative_to(root.resolve()) or not path.is_file():raise ValueError('Invalid public artifact path')
        if hashlib.sha256(path.read_bytes()).hexdigest()!=expected:raise ValueError('Public artifact changed: '+name)
    for t in m['tasks']:
        name=t['id']
        if not ID.fullmatch(name) or name in prompts:raise ValueError('Invalid/duplicate task ID')
        text=(root/'prompts'/lane/(name+'.md')).read_text(encoding='utf-8')
        if sha(text)!=t['prompt_sha256'][lane]:raise ValueError('Prompt hash differs: '+name)
        prompts[name]=text
        for filename in t.get('project_files',[]):
            path=(root/'projects'/name/filename).resolve()
            if not path.is_relative_to((root/'projects'/name).resolve()):raise ValueError('Project path escapes task')
            if not path.is_file():raise ValueError('Missing public project file')
    return m,prompts


def public_module(name):
    path=ROOT/(name+'.py')
    spec=importlib.util.spec_from_file_location('deadline_public_'+name,path)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module


def read_submission(path):
    path=Path(path)
    if path.stat().st_size>64*1024*1024:raise ValueError('Submission exceeds 64 MiB')
    if path.suffix.lower()=='.zip':
        with zipfile.ZipFile(path) as archive:
            files=[i for i in archive.infolist() if not i.is_dir()]
            if len(files)!=1 or not files[0].filename.endswith('.json') or files[0].file_size>64*1024*1024:
                raise ValueError('ZIP must contain one JSON submission <=64 MiB')
            raw=archive.read(files[0])
    else:raw=path.read_bytes()
    data=json.loads(raw.decode('utf-8-sig'))
    if type(data) is not dict or type(data.get('replies')) is not dict:raise ValueError('Not a submission')
    return data,raw


def validate(sub,m,prompts):
    problems=[];transport=public_module('transport')
    if sub.get('benchmark_version')!=VERSION or sub.get('suite_hash')!=m['suite_hash']:problems.append('Version/suite mismatch')
    lane=sub.get('lane')
    if lane not in ('api','agent'):problems.append('Explicit lane missing')
    if lane=='api' and sub.get('surface')!='raw-api':problems.append('API lane cannot use agent CLIs')
    if lane=='agent' and sub.get('surface') not in ('codex-cli','claude-code-cli','antigravity-cli','agent-other'):problems.append('Agent surface missing')
    if not isinstance(sub.get('run_id'),str) or not sub['run_id']:problems.append('Run ID missing')
    if not isinstance(sub.get('model'),str) or not sub['model']:problems.append('Model missing')
    if not isinstance(sub.get('settings'),dict) or sub['settings'].get('model')!=sub.get('model'):problems.append('Model settings missing/mismatched')
    if type(sub.get('meta')) is not dict:return problems+['Task metadata missing']
    if set(sub['meta'])-set(prompts):problems.append('Unknown metadata task IDs')
    if set(sub['replies'])-set(prompts):problems.append('Unknown task IDs')
    for t in m['tasks']:
        name=t['id'];meta=sub.get('meta',{}).get(name,{})
        if not isinstance(meta,dict):problems.append(name+': invalid metadata');continue
        if not transport.has_answer(sub['replies'].get(name)):problems.append(name+': blank/missing')
        if meta.get('incomplete') or transport.is_truncated(meta):problems.append(name+': truncated/incomplete')
        if type(meta.get('tokens_out')) is not int or meta['tokens_out']<=0:problems.append(name+': output tokens missing')
        if type(meta.get('tokens_in')) is not int or meta['tokens_in']<0:problems.append(name+': input tokens missing')
        if meta.get('prompt_sha256')!=t['prompt_sha256'].get(lane):problems.append(name+': original prompt not pinned')
        if lane=='api' and meta.get('generation_attempts',1)!=1:problems.append(name+': multiple/ambiguous generations; not one-shot')
        if type(meta.get('seconds')) not in (int,float) or not math.isfinite(meta['seconds']) or meta['seconds']<=0:problems.append(name+': elapsed time missing')
        for key in ('cached_input_tokens','cache_write_input_tokens'):
            val=meta.get(key,0)
            if type(val) is not int or val<0 or (type(meta.get('tokens_in')) is int and val>meta['tokens_in']):problems.append(name+': invalid '+key)
        tin,tout=meta.get('tokens_in'),meta.get('tokens_out')
        if type(tin) is int and type(tout) is int and meta.get('total_tokens',tin+tout)!=tin+tout:problems.append(name+': total tokens disagree')
        cached,written=meta.get('cached_input_tokens',0),meta.get('cache_write_input_tokens',0)
        if all(type(v) is int for v in (tin,cached,written)) and cached+written>tin:problems.append(name+': cached token classes exceed gross input')
        if meta.get('cost') is not None and (type(meta['cost']) not in (int,float) or not math.isfinite(meta['cost']) or meta['cost']<0):problems.append(name+': invalid cost')
        if lane=='agent':
            if meta.get('input_token_accounting')!='gross including cached input; cache counted once':problems.append(name+': token accounting missing')
            if not meta.get('receipt_sha256') or not meta.get('transcript_sha256'):problems.append(name+': agent evidence missing')
            if meta.get('budgets_printed_before_run') is not True:problems.append(name+': printed limits missing')
    return problems


def package(path):
    sub,raw=read_submission(path);digest=hashlib.sha256(raw).hexdigest()
    target=Path(path).with_name(Path(path).stem+'-submission.zip')
    with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED) as archive:archive.writestr('submission.json',raw)
    body={'benchmark_version':sub.get('benchmark_version'),'wave':sub.get('wave'),'suite_hash':sub.get('suite_hash'),
          'model':sub.get('model'),'lane':sub.get('lane'),'surface':sub.get('surface'),'sha256':digest,'attachment':target.name}
    save(target.with_suffix('.metadata.json'),body)
    return target


def settings_for(args):
    if args.lane!='api':raise ValueError('API runner requires --lane api; use agent.py prepare/collect for agent runs')
    if not isinstance(args.params,dict) or set(args.params)&{'model','models','route','messages','contents','tools','tool_choice','functions','function_call','stream','system','web_search_options','plugins','modalities','audio','images','input','instructions','background','best_of'}:
        raise ValueError('Parameters may not replace the task or enable tools/streaming')
    if args.params.get('n',1)!=1 or args.params.get('generationConfig',{}).get('candidateCount',1)!=1:
        raise ValueError('Exactly one generated candidate per request is required')
    if args.params.get('service_tier','default') not in ('default','auto'):
        raise ValueError('Nonstandard service tiers require a separately priced transport')
    if args.effort!='default':
        if args.params.get('reasoning',{}).get('enabled') is False:raise ValueError('Requested reasoning cannot be disabled')
        configured=args.params.get('reasoning',{}).get('effort') or args.params.get('reasoning_effort') or args.params.get('output_config',{}).get('effort')
        gemini=args.params.get('generationConfig',{}).get('thinkingConfig',{}).get('thinkingLevel','').lower()
        if args.effort not in (configured,gemini):raise ValueError('Effort label must match an actual request setting')
    return {'type':args.type,'model':args.model,'base_url':args.base_url,'effort':args.effort,'params':args.params,
            'transport_sha256':hashlib.sha256((ROOT/'transport.py').read_bytes()).hexdigest()}


def extend(old,m,prompts,settings):
    if old.get('lane')!='api' or old.get('surface')!='raw-api' or old.get('settings')!=settings:raise ValueError('Extension surface/settings differ')
    if old.get('benchmark_version')!=VERSION:raise ValueError('Cannot carry older benchmark answers into version 4')
    replies={};meta={}
    for name,text in prompts.items():
        prior=old.get('meta',{}).get(name,{})
        if name in old['replies'] and prior.get('prompt_sha256')==sha(text) and prior.get('request_sha256')==sha(canonical({'prompt':text,'settings':settings})):
            replies[name]=old['replies'][name];meta[name]=dict(prior)
    return replies,meta


def run(args,m,prompts):
    settings_for(args);transport=public_module('transport')
    key=os.environ.get(args.key_env or '', '')
    if args.key_env and not key:raise ValueError('Missing environment variable '+args.key_env)
    if m.get('status')!='validated' and m.get('release_status')!='public' and not args.allow_development:raise ValueError('Development suite requires --allow-development')
    prices=json.loads(Path(args.rates).read_text(encoding='utf-8-sig')) if args.rates else None
    rates=transport.price_for(prices,args.model) if prices else None
    if not rates or not rates.get('source'):raise ValueError('Pinned provider rates with source attribution required')
    ceilings={key:max(rates[key],rates.get('long_context',{}).get(key,rates[key])) for key in ('in','out')}
    if urlsplit(args.base_url).hostname=='openrouter.ai':
        # Server-side endpoint price ceilings complement the local total ledger.
        # Units: USD per million tokens. Reject fallback to a pricier endpoint.
        args.params=copy.deepcopy(args.params)
        provider=args.params.setdefault('provider',{})
        maximum=provider.setdefault('max_price',{})
        for key,value in {'prompt':ceilings['in'],'completion':ceilings['out'],'request':0}.items():
            if key in maximum and (type(maximum[key]) not in (int,float) or not math.isfinite(maximum[key]) or maximum[key]<0):
                raise ValueError('Invalid endpoint price ceiling')
            maximum[key]=min(maximum.get(key,value),value)
    settings=settings_for(args)
    limit=args.params.get('max_completion_tokens') or args.params.get('max_tokens') or args.params.get('generationConfig',{}).get('maxOutputTokens')
    if type(limit) is not int or limit<=0:raise ValueError('Explicit provider output ceiling required for spend reservation')
    budget=public_module('budget').Budget(args.budget_ledger or Path(args.out).with_suffix('.budget.json'),args.max_spend)
    output=Path(args.out)
    if output.exists():
        sub,_=read_submission(output)
        if sub.get('suite_hash')!=m['suite_hash'] or sub.get('settings')!=settings or sub.get('lane')!='api':raise ValueError('Resume settings/suite mismatch')
    else:
        sub={'client':4,'benchmark_version':VERSION,'wave':m['wave'],'suite_hash':m['suite_hash'],'lane':'api','surface':'raw-api',
             'run_id':uuid.uuid4().hex,'model':args.model,'settings':settings,'replies':{},'meta':{}}
        if args.extend:
            old,_=read_submission(args.extend);sub['replies'],sub['meta']=extend(old,m,prompts,settings)
            sub['carried_from']={'run_id':old['run_id'],'suite_hash':old['suite_hash']}
    save(output,sub)
    selected=args.tasks or list(prompts)
    if set(selected)-set(prompts):raise ValueError('Unknown selected task')
    for name in selected:
        # Attempted generations are terminal for this sample, including blanks.
        if name in sub['meta'] or name in sub['replies']:continue
        prompt=prompts[name];request_hash=sha(canonical({'prompt':prompt,'settings':settings}))
        effective=rates;upper_input=len(prompt.encode('utf-8'))+4096
        if rates.get('long_context') and upper_input>rates['long_context']['threshold']:effective=rates['long_context']
        reserved=(upper_input*max(ceilings['in'],rates.get('cache_write',0),rates.get('long_context',{}).get('cache_write',0))+limit*ceilings['out'])/1e6
        attempt=budget.reserve(reserved,args.model+'/'+name);started=time.perf_counter()
        sub['meta'][name]={'prompt_sha256':sha(prompt),'request_sha256':request_hash,'attempt_id':attempt,'incomplete':True,'generation_attempts':1}
        save(output,sub)
        original_post=transport.post_json;raw_response={}
        def single_post(url,payload,headers,failures=None):
            request=urllib.request.Request(url,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json',**headers})
            with urllib.request.urlopen(request,timeout=600) as response:
                data=json.load(response);raw_response.update(data);return data
        transport.post_json=single_post
        try:
            reply,tin,tout,echo,receipt=transport.call_model(args,key,prompt)
            elapsed=time.perf_counter()-started
            incomplete=transport.is_truncated(receipt) or not transport.has_answer(reply)
            billed=receipt.get('billed_cost_usd')
            cost=billed if type(billed) in (int,float) and math.isfinite(billed) and billed>=0 else transport.cost_of(effective,tin,tout,receipt.get('cached_input_tokens',0),receipt.get('cache_write_input_tokens',0))
            metered=type(tin) is int and tin>=0 and type(tout) is int and tout>0
            if not metered:cost=None
            if cost is not None:budget.settle(attempt,cost,'billed' if billed is not None else 'computed')
            response_path=output.parent/(output.stem+'-receipts')/(name+'.json');save(response_path,raw_response)
            sub['replies'][name]=reply
            sub['meta'][name].update(tokens_in=tin,tokens_out=tout,seconds=round(elapsed,6),model_echo=echo,
                incomplete=incomplete,cost=cost,cost_basis='billed' if billed is not None else 'computed' if cost is not None else 'lower-bound',
                pricing_snapshot={'rates':effective,'source':rates['source']},response_sha256=sha(canonical(raw_response)),**receipt)
            save(output,sub)
            print(f'{name}: {tout} output tokens, ${cost:.4f}' if cost is not None else f'{name}: usage incomplete; reservation retained',flush=True)
            if not metered or incomplete:raise RuntimeError('Incomplete response saved. Start a separate fresh sample to try this task again.')
        except urllib.error.HTTPError as error:
            if error.code in (400,401,402,403,404,429):budget.settle(attempt,0,'provider rejected request')
            sub['meta'][name].update(error='HTTP '+str(error.code),seconds=time.perf_counter()-started)
            save(output,sub);raise RuntimeError('Provider rejected call (HTTP '+str(error.code)+'); checkpoint saved') from None
        except BaseException as error:
            sub['meta'][name].setdefault('error',type(error).__name__);save(output,sub);raise
        finally:transport.post_json=original_post
    sub['tokens_in'],sub['tokens_out']=transport.usage_totals(sub['meta'])
    sub['seconds']=sum(v.get('seconds',0) for v in sub['meta'].values());save(output,sub)
    return sub


def openrouter_rates(model,path):
    """Snapshot the requested model's public provider prices before model calls."""
    with urllib.request.urlopen('https://openrouter.ai/api/v1/models',timeout=30) as response:body=json.load(response)
    item=next((r for r in body['data'] if r['id']==model),None)
    if item is None:raise ValueError('Model not listed by OpenRouter: '+model)
    prices=item.get('pricing',{});rates={'source':'https://openrouter.ai/api/v1/models','retrieved_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
    for src,dst in [('prompt','in'),('completion','out'),('input_cache_read','cached_in'),('input_cache_write','cache_write')]:
        if src in prices and prices[src] is not None:
            value=float(prices[src])*1e6
            if not math.isfinite(value) or value<0:raise ValueError('Unusable provider rate')
            rates[dst]=value
    if not {'in','out'}<=rates.keys():raise ValueError('Provider token rates missing')
    if any(float(prices.get(k,0) or 0)>0 for k in ('request','image','web_search','internal_reasoning')):
        raise ValueError('Non-token charges require a manually supplied complete pricing policy')
    save(path,{model:rates});return path


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=ROOT);parser.add_argument('--lane',choices=['api','agent'],default='api')
    parser.add_argument('--validate',type=Path);parser.add_argument('--package',type=Path)
    parser.add_argument('--check-suite',action='store_true');parser.add_argument('--dry-run',action='store_true')
    parser.add_argument('--type',choices=['openai','anthropic','gemini']);parser.add_argument('--openrouter',action='store_true')
    parser.add_argument('--model');parser.add_argument('--effort',default='default');parser.add_argument('--base-url',default='https://api.openai.com/v1')
    parser.add_argument('--key-env');parser.add_argument('--params',default='{}');parser.add_argument('--out',type=Path,default=Path('submission-v4.json'))
    parser.add_argument('--params-file',type=Path)
    parser.add_argument('--extend',type=Path);parser.add_argument('--tasks',nargs='+');parser.add_argument('--allow-development',action='store_true')
    parser.add_argument('--rates',type=Path);parser.add_argument('--max-spend',type=float,default=10);parser.add_argument('--budget-ledger',type=Path)
    args=parser.parse_args()
    if args.check_suite:
        m,_=load_suite(args.root,'api');load_suite(args.root,'agent');print(f"Verified {m['task_count']} public tasks: {m['suite_hash']}");return
    if args.validate or args.package:
        sub,_=read_submission(args.validate or args.package);m,prompts=load_suite(args.root,sub.get('lane','api'))
        problems=validate(sub,m,prompts);print('\n'.join(problems) if problems else 'Complete structure and metering; private grading still required.')
        if args.package and not problems:print(package(args.package))
        raise SystemExit(bool(problems))
    if args.openrouter:args.type='openai';args.base_url='https://openrouter.ai/api/v1';args.key_env=args.key_env or 'OPENROUTER_API_KEY'
    if not args.model or not args.type:parser.error('Model and provider type required')
    if args.params_file and args.params!='{}':parser.error('Use either --params or --params-file')
    args.params=json.loads(args.params_file.read_text(encoding='utf-8-sig') if args.params_file else args.params)
    m,prompts=load_suite(args.root,args.lane)
    if args.dry_run:
        settings_for(args);print(f"No model calls. {len(args.tasks or prompts)} selected tasks; suite {m['suite_hash']}; output {args.out}");return
    if args.openrouter and not args.rates:
        args.rates=args.out.with_suffix('.prices.json')
        if not args.rates.exists():openrouter_rates(args.model,args.rates)
    sub=run(args,m,prompts)
    problems=validate(sub,m,prompts)
    if problems:print('\n'.join(problems));raise SystemExit(1)


if __name__=='__main__':main()
