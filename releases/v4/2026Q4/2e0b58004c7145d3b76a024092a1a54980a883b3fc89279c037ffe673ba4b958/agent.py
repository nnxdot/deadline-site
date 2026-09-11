#!/usr/bin/env python3
"""Prepare public task rooms and collect metered agent answers. No grading or model calls."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import uuid
import client


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def inside(root, name):
    path=(Path(root)/name).resolve()
    if not path.is_relative_to(Path(root).resolve()):raise ValueError('Path leaves the run directory')
    return path


def prepare(root, destination, model, effort, surface, selected=None):
    manifest,prompts=client.load_suite(root,'agent')
    destination=Path(destination).resolve()
    if destination.is_relative_to(Path(root).resolve()):raise ValueError('Put rooms outside the downloaded task package')
    tasks=[t for t in manifest['tasks'] if not selected or t['id'] in selected]
    if selected and set(selected)!={t['id'] for t in tasks}:raise ValueError('Unknown selected tasks')
    destination.mkdir(parents=True,exist_ok=False)
    (destination/'receipts').mkdir();(destination/'transcripts').mkdir()
    record={'run_id':uuid.uuid4().hex,'benchmark_version':client.VERSION,'suite_hash':manifest['suite_hash'],
            'wave':manifest['wave'],'model':model,'effort':effort,'surface':surface,'tasks':[]}
    for task in tasks:
        name=task['id'];room=destination/'rooms'/name;room.mkdir(parents=True)
        (room/'answers').mkdir();(room/'scratch').mkdir()
        (room/'PROMPT.md').write_text(prompts[name],encoding='utf-8',newline='\n')
        for filename in task['project_files']:
            target=inside(room,filename);target.parent.mkdir(parents=True,exist_ok=True)
            shutil.copyfile(Path(root)/'projects'/name/filename,target)
        rules=f'''# DEADLINE 4 agent task

Read the entire PROMPT.md. This is one fresh {model} [{effort}] attempt.
Use local tools and self-tests only in this room. Do not inspect other tasks,
parent directories, old answers, memories, private graders or session histories.
No internet, other models, subagents, external services or package downloads.
Do not alter PROMPT.md, AGENTS.md or RUN_RULES.md. Keep self-tests in scratch/.
Supplied project files are public. Only the replacement specified in the prompt
will be graded; changes to other supplied modules will not carry into grading.

Save the complete final answer in answers/{task['answer_file']}, without Markdown
fences. For diagnosis tasks, save the complete JSON object with fixed_module
containing the repaired source. This changes only the prompt's delivery format.
If deliberately skipping, save # SKIP or // SKIP. Do not invent usage or costs.

Output-token budget: {task['agent_budget']}.
Total-token ceiling: {task['agent_total_ceiling']}.
All reasoning and intermediate model output count. Input includes cached input
once at face value. Exceeding the ceiling forfeits positive task credit; output
beyond its budget discounts positive credit. Wall time is reported, not scored.
These are scoring limits, not forced process termination. Stop after saving.
'''
        for filename in ('AGENTS.md','RUN_RULES.md'):(room/filename).write_text(rules,encoding='utf-8',newline='\n')
        record['tasks'].append({'id':name,'answer_file':task['answer_file'],'protocol_hashes':{
            filename:digest(room/filename) for filename in ('PROMPT.md','AGENTS.md','RUN_RULES.md')}})
    client.save(destination/'run.json',record)
    return destination/'run.json'


def collect(root, run, output):
    manifest,prompts=client.load_suite(root,'agent')
    run=Path(run).resolve();prep=json.loads((run/'run.json').read_text(encoding='utf-8'))
    if prep['suite_hash']!=manifest['suite_hash']:raise ValueError('Run/package suite mismatch')
    ids={t['id'] for t in manifest['tasks']}
    if any(t['id'] not in ids for t in prep['tasks']):raise ValueError('Unknown task in run')
    result={'benchmark_version':client.VERSION,'suite_hash':prep['suite_hash'],'wave':prep['wave'],
            'run_id':prep['run_id'],'model':prep['model'],'lane':'agent','surface':prep['surface'],
            'settings':{'model':prep['model'],'effort':prep['effort'],'method':'agent'},'replies':{},'meta':{}}
    for task in prep['tasks']:
        name=task['id'];room=inside(run,'rooms/'+name)
        for filename,expected in task['protocol_hashes'].items():
            if digest(inside(room,filename))!=expected:raise ValueError('Run protocol changed: '+name)
        if client.sha((room/'PROMPT.md').read_text(encoding='utf-8'))!=client.sha(prompts[name]):raise ValueError('Prompt differs from release')
        answer=inside(room,'answers/'+task['answer_file'])
        receipt=inside(run,'receipts/'+name+'.json');transcript=inside(run,'transcripts/'+name+'.jsonl')
        if not all(p.is_file() for p in (answer,receipt,transcript)):continue
        if transcript.stat().st_size==0:raise ValueError('Empty agent transcript: '+name)
        raw=json.loads(receipt.read_text(encoding='utf-8-sig'));usage=raw.get('usage',{})
        result['replies'][name]=answer.read_text(encoding='utf-8-sig')
        meta={'prompt_sha256':client.sha(prompts[name]),'tokens_in':usage.get('input_tokens'),
              'tokens_out':usage.get('output_tokens'),'cached_input_tokens':usage.get('cached_input_tokens'),
              'seconds':raw.get('wall_seconds'),'incomplete':raw.get('status')!='completed',
              'finish_reason':raw.get('finish_reason'),'receipt_sha256':digest(receipt),
              'transcript_sha256':digest(transcript),'answer_sha256':digest(answer),
              'input_token_accounting':raw.get('input_token_accounting'),
              'budgets_printed_before_run':True,'usage_source':'Submitter-provided dedicated agent receipts; pending review',
              'access_review_status':'pending'}
        if type(meta['tokens_in']) is int and type(meta['tokens_out']) is int:meta['total_tokens']=meta['tokens_in']+meta['tokens_out']
        if raw.get('cost') is not None:meta.update(cost=raw['cost'],cost_basis=raw.get('cost_basis','estimated'))
        result['meta'][name]=meta
    output=Path(output)
    if output.exists():
        old,_=client.read_submission(output)
        if old.get('run_id')!=result['run_id']:raise ValueError('Output belongs to a different run')
        for name,answer in old['replies'].items():
            if result['replies'].get(name)!=answer or result['meta'].get(name)!=old['meta'].get(name):
                raise ValueError('A collected answer or receipt changed; start a separate sample')
    client.save(output,result)
    return client.validate(result,manifest,prompts)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=client.ROOT)
    commands=parser.add_subparsers(dest='action',required=True)
    p=commands.add_parser('prepare');p.add_argument('--destination',type=Path,required=True)
    p.add_argument('--model',required=True);p.add_argument('--effort',required=True)
    p.add_argument('--surface',choices=['codex-cli','claude-code-cli','antigravity-cli','agent-other'],required=True)
    p.add_argument('--tasks',nargs='+')
    p=commands.add_parser('collect');p.add_argument('--run',type=Path,required=True);p.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    if args.action=='prepare':print(prepare(args.root,args.destination,args.model,args.effort,args.surface,args.tasks))
    else:
        problems=collect(args.root,args.run,args.out)
        print('\n'.join(problems) if problems else 'All answers and metering collected. Keep receipts and transcripts for review.')
        raise SystemExit(bool(problems))


if __name__=='__main__':main()
