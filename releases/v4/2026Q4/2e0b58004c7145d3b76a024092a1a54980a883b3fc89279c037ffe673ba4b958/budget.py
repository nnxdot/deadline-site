"""Reserve a whole bounded request before sending; unknown charges retain the reserve."""
import json
import math
import os
from pathlib import Path
import uuid
from datetime import datetime,timezone


class Budget:
    def __init__(self,path,cap):
        if not math.isfinite(cap) or cap<=0:raise ValueError('Positive finite spending cap required')
        self.path=Path(path);self.cap=cap
        self.path.parent.mkdir(parents=True,exist_ok=True)
        self.lock=self.path.with_suffix(self.path.suffix+'.lock')
    def transact(self,fn):
        fd=os.open(self.lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY)
        try:
            record=json.loads(self.path.read_text()) if self.path.exists() else {'cap_usd':self.cap,'attempts':{}}
            if record['cap_usd']!=self.cap:raise ValueError('Ledger cap mismatch')
            value=fn(record)
            pending=self.path.with_name(self.path.name+'.tmp')
            pending.write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8');pending.replace(self.path)
            return value
        finally:os.close(fd);self.lock.unlink()
    def reserve(self,amount,label):
        if not math.isfinite(amount) or amount<0:raise ValueError('Unpriced call refused')
        def apply(record):
            used=sum(v.get('charged_usd',v['reserved_usd']) for v in record['attempts'].values())
            if used+amount>self.cap+1e-9:raise RuntimeError(f'Budget cap: ${used:.4f} committed; next call reserves ${amount:.4f}; cap ${self.cap:.2f}')
            key=uuid.uuid4().hex
            record['attempts'][key]={'label':label,'reserved_usd':amount,'state':'pending','started':datetime.now(timezone.utc).isoformat()}
            return key
        return self.transact(apply)
    def settle(self,key,charge,basis):
        def apply(record):
            row=record['attempts'][key]
            if type(charge) not in (int,float) or not math.isfinite(charge) or charge<0:raise ValueError('Invalid charge')
            if charge>row['reserved_usd']+1e-7:raise RuntimeError('Provider charge exceeded reserved bound; halt and reconcile')
            row.update(charged_usd=charge,state='settled',basis=basis)
        return self.transact(apply)
