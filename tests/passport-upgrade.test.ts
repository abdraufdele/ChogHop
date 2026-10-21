import { expect,it,vi } from 'vitest';
vi.mock('server-only',()=>({}));
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { applyAction,createRun } from '../src/puzzle/engine';
import { passportView } from '../src/relay/passport.server';

it('upgrades an already-applied slice-4 database and backfills stored contributor fields once',async()=>{
  const db=new PGlite();await db.waitReady;
  try{
    await db.exec('create role anon nologin; create role authenticated nologin; create role service_role nologin;');
    for(const file of ['202610200001_persist_practice.sql','202610200002_guest_permissions.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));
    // Seed only an isolated pre-upgrade fixture, preserving its contributor/date fields.
    const owner=randomUUID(),guest=randomUUID(),run=randomUUID(),permission=randomUUID();
    const wallet=`0x${'11'.repeat(20)}`,friend=`0x${'22'.repeat(20)}`;
    const asset=`test:10143:0x${'44'.repeat(20)}:900:last-lantern/v1`;
    const prepared=applyAction(createRun('last-lantern-01'),0,{type:'prepare',treatment:'direct',mark:{glyph:'star',bearing:'south'}});
    if(!prepared.ok)throw new Error('Invalid fixture');
    const completed=applyAction(prepared.run,1,{type:'restore',mark:{glyph:'star',bearing:'south'}});
    if(!completed.ok)throw new Error('Invalid fixture');
    await db.query('insert into choghop_private.relay_assets(id,cursor,owner_wallet) values($1,10,$2)',[asset,wallet]);
    await db.query('insert into choghop_private.relay_runs(id,actor_id,owner_wallet,asset_id,generation,environment,revision,state) values($1,$2,$3,$4,0,$5,2,$6)',[run,owner,wallet,asset,'test',JSON.stringify(completed.run)]);
    await db.query("insert into choghop_private.relay_permissions(id,run_id,asset_id,scope,guest_wallet,revision,generation,status,expires_at) values($1,$2,$3,$4,$5,1,0,'redeemed',clock_timestamp())",[permission,run,asset,JSON.stringify({nonce:`0x${'55'.repeat(32)}`}),friend]);
    await db.query("insert into choghop_private.relay_completions(run_id,asset_id,permission_id,owner_actor,guest_actor,owner_wallet,guest_wallet,state,completed_at) values($1,$2,$3,$4,$5,$6,$7,$8,'2026-10-20T12:00:00Z')",[run,asset,permission,owner,guest,wallet,friend,JSON.stringify(completed.run)]);
    await db.exec(await readFile(new URL('../supabase/migrations/202610210003_passport_and_followup.sql',import.meta.url),'utf8'));
    const invoke=()=>db.transaction(async tx=>{
      await tx.exec('set local role service_role');
      const result=await tx.query<{result:unknown}>('select public.choghop_relay($1,$2,$3,$4) as result',['passport',owner,wallet,JSON.stringify({run,environment:'test'})]);
      return passportView(result.rows[0]!.result);
    });
    const first=await invoke(),again=await invoke();
    expect(first.entries).toHaveLength(1);expect(again.entries).toEqual(first.entries);
    expect(first.receipt).toMatchObject({owner:wallet,guest:friend,keeperChoice:'direct',signal:{glyph:'sun',bearing:'west'}});
    expect(Date.parse(first.receipt!.completedAt)).toBe(Date.parse('2026-10-20T12:00:00Z'));
    expect((await db.query<{name:string|null}>("select to_regprocedure('public.choghop_relay_v1(text,uuid,text,jsonb)')::text as name")).rows[0]!.name).toBeNull();
  }finally{await db.close();}
},30_000);
