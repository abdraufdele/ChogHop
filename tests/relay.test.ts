import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('server-only',()=>({}));
import { randomUUID } from 'node:crypto';
import { privateKeyToAccount } from 'viem/accounts';
import type { Address } from 'viem';
import { openTestPostgres } from '../e2e/support/postgres.mjs';
import { createRelayService, type Actor } from '../src/relay/service.server';
import { permissionData, type Scope } from '../src/relay/permission';
import type { CollectionAdapter } from '../src/chain/collection.server';
import type { CollectionConfig } from '../src/chain/config';
import { walletIdentity } from '../src/auth/identity';
import type { User } from '@supabase/supabase-js';
import { applyAction } from '../src/puzzle/engine';

// Isolated fixture accounts and collection. No claim of a genuine Chog or hosted Auth.
const keeper=privateKeyToAccount(`0x${'11'.repeat(32)}`), runner=privateKeyToAccount(`0x${'22'.repeat(32)}`);
const owner:Actor={id:randomUUID(),wallet:keeper.address},guest:Actor={id:randomUUID(),wallet:runner.address};
const outsider:Actor={id:randomUUID(),wallet:`0x${'33'.repeat(20)}`};
const config:CollectionConfig={chainId:10143,collection:`0x${'44'.repeat(20)}`,rpc:'https://rpc.invalid',deploymentBlock:0n,logSpan:10n};
const mark={glyph:'star',bearing:'south'}, prepare={type:'prepare',mark,treatment:'reflected'};
let database:Awaited<ReturnType<typeof openTestPostgres>>;
let tokenSequence=0;
function fixture() {
  const token=String(++tokenSequence);
  let transfers=1,current:Address=owner.wallet,block=1;
  const adapter:CollectionAdapter={label:'mock',async scan(_token,asset){
    const count=transfers;transfers=0;
    return {expected:String(asset.cursor),cursor:String(block++),hash:`0x${'55'.repeat(32)}`,owner:current.toLowerCase(),transfers:count,complete:true};
  }};
  const service=createRelayService({config,adapter,environment:'test',origin:'https://choghop.test',rpc:database.rpc});
  return {service,token,adapter,transferAwayBack(){transfers+=2;current=owner.wallet;},transferAway(){transfers++;current=outsider.wallet;}};
}
async function prepared(treatment:'direct'|'reflected'='reflected') {
  const f=fixture(),run=await f.service.start(owner,f.token);
  await f.service.prepare(owner,run.runId,0,{...prepare,treatment});
  return {...f,runId:run.runId};
}
async function issued(treatment:'direct'|'reflected'='reflected') {
  const f=await prepared(treatment),challenge=await f.service.challenge(owner,f.runId,guest.wallet);
  const signature=await keeper.signTypedData(permissionData(challenge.scope));
  await f.service.issue(owner,challenge.permissionId,signature);
  return {...f,...challenge};
}
beforeAll(async()=>{database=await openTestPostgres(undefined);},30_000);
afterAll(async()=>{await database?.db.close();});

describe('server-authoritative scoped guest relay (mock chain, real PostgreSQL)',()=>{
  it('restores a prepared run, lets the named guest solve with owner offline, attributes one completion',async()=>{
    const f=await issued();
    const worker=createRelayService({config,adapter:f.adapter,environment:'test',origin:'https://choghop.test',rpc:database.rpc});
    expect(await worker.resume(owner,f.runId)).toMatchObject({stage:'runner',revision:1});
    const view=await worker.guest(guest,f.permissionId);
    expect(view).toMatchObject({status:'active',tokenId:f.token,allowedMove:'Restore one lantern'});
    expect(JSON.stringify(view)).not.toContain('keeperMark');
    expect(JSON.stringify(view)).not.toContain('treatment');
    expect(await worker.redeem(guest,f.permissionId,1,{type:'restore',mark})).toMatchObject({stage:'complete'});
    const rows=await database.db.query<{owner_actor:string;guest_actor:string}>("select owner_actor,guest_actor from choghop_private.relay_completions where run_id=$1",[f.runId]);
    expect(rows.rows).toEqual([{owner_actor:owner.id,guest_actor:guest.id}]);
    expect(await worker.resume(owner,f.runId)).toMatchObject({stage:'complete',revision:2});
  });
  it('rejects incorrect answers and client completion flags without spending the permission',async()=>{
    const f=await issued();
    await expect(f.service.redeem(guest,f.permissionId,1,{type:'complete',completed:true})).rejects.toMatchObject({code:'invalid_action'});
    await expect(f.service.redeem(guest,f.permissionId,1,{type:'restore',mark:{glyph:'sun',bearing:'north'}})).rejects.toMatchObject({code:'incorrect_runner'});
    expect(await f.service.guest(guest,f.permissionId)).toMatchObject({status:'active'});
    await f.service.redeem(guest,f.permissionId,1,{type:'restore',mark});
  });
  it('rejects stale preparation, wrong owner, wrong guest and same-person delegation',async()=>{
    const f=await prepared();
    await expect(f.service.prepare(owner,f.runId,0,prepare)).rejects.toMatchObject({code:'stale_revision'});
    await expect(f.service.prepare(outsider,f.runId,1,prepare)).rejects.toMatchObject({code:'forbidden'});
    await expect(f.service.challenge(owner,f.runId,owner.wallet)).rejects.toMatchObject({code:'different_guest_required'});
    const c=await f.service.challenge(owner,f.runId,guest.wallet);
    await f.service.issue(owner,c.permissionId,await keeper.signTypedData(permissionData(c.scope)));
    await expect(f.service.redeem(outsider,c.permissionId,1,{type:'restore',mark})).rejects.toMatchObject({code:'wrong_guest'});
    await expect(f.service.revoke(guest,c.permissionId)).rejects.toMatchObject({code:'forbidden'});
  });
  it('requires the owner’s scoped signature, rejects altered fields and login signatures',async()=>{
    const f=await prepared(),c=await f.service.challenge(owner,f.runId,guest.wallet);
    await expect(f.service.issue(owner,c.permissionId,await runner.signTypedData(permissionData(c.scope)))).rejects.toMatchObject({code:'invalid_signature'});
    const changes:Partial<Scope>[]=[{guest:outsider.wallet},{chainId:143},{tokenId:'999'},{environment:'production'},{origin:'https://evil.test'},{revision:9},{runId:randomUUID()},{signalHash:`0x${'99'.repeat(32)}`},{generation:99},{expiresAt:c.scope.expiresAt+1}];
    for(const change of changes) await expect(f.service.issue(owner,c.permissionId,await keeper.signTypedData(permissionData({...c.scope,...change})))).rejects.toMatchObject({code:'invalid_signature'});
    await expect(f.service.issue(owner,c.permissionId,await keeper.signMessage({message:'Sign in to ChogHop'}))).rejects.toMatchObject({code:'invalid_signature'});
    const wrongAction=permissionData(c.scope);wrongAction.message.action='other.action';
    await expect(f.service.issue(owner,c.permissionId,await keeper.signTypedData(wrongAction))).rejects.toMatchObject({code:'invalid_signature'});
  });
  it('rejects expired and revoked invitations, challenge replay, and expired signing challenges',async()=>{
    const expired=await issued();
    await database.db.query("update choghop_private.relay_permissions set expires_at=clock_timestamp()-interval '1 second' where id=$1",[expired.permissionId]);
    await expect(expired.service.redeem(guest,expired.permissionId,1,{type:'restore',mark})).rejects.toMatchObject({code:'expired'});
    const revoked=await issued();await revoked.service.revoke(owner,revoked.permissionId);
    await expect(revoked.service.redeem(guest,revoked.permissionId,1,{type:'restore',mark})).rejects.toMatchObject({code:'revoked'});
    const f=await prepared(),c=await f.service.challenge(owner,f.runId,guest.wallet),sig=await keeper.signTypedData(permissionData(c.scope));
    await f.service.issue(owner,c.permissionId,sig);
    await expect(f.service.issue(owner,c.permissionId,sig)).rejects.toMatchObject({code:'active'});
    const c2=await f.service.challenge(owner,f.runId,guest.wallet);
    await database.db.query("update choghop_private.relay_permissions set challenge_until=clock_timestamp()-interval '1 second' where id=$1",[c2.permissionId]);
    await expect(f.service.issue(owner,c2.permissionId,await keeper.signTypedData(permissionData(c2.scope)))).rejects.toMatchObject({code:'challenge_expired'});
  });
  it('changes the signal revision and invalidates every previously signed permission',async()=>{
    const f=await issued();
    await f.service.prepare(owner,f.runId,1,{...prepare,treatment:'direct'});
    await expect(f.service.redeem(guest,f.permissionId,1,{type:'restore',mark})).rejects.toMatchObject({code:'scope_mismatch'});
    expect(await f.service.guest(guest,f.permissionId)).toMatchObject({status:'changed',revision:2});
  });
  it('invalidates transfer away-and-back even when ownerOf is unchanged',async()=>{
    const f=await issued();f.transferAwayBack();
    await expect(f.service.redeem(guest,f.permissionId,1,{type:'restore',mark})).rejects.toMatchObject({code:'ownership_changed'});
    expect(await f.service.guest(guest,f.permissionId)).toMatchObject({status:'changed'});
    const newRun=await f.service.start(owner,f.token);
    expect(newRun.runId).not.toBe(f.runId);
  });
  it('rejects transfer-away and unavailable or incomplete ownership history',async()=>{
    const f=await issued();f.transferAway();
    await expect(f.service.redeem(guest,f.permissionId,1,{type:'restore',mark})).rejects.toMatchObject({code:'ownership_changed'});
    const fresh=fixture();fresh.adapter.scan=async()=>{throw new Error('RPC unavailable');};
    await expect(fresh.service.start(owner,fresh.token)).rejects.toThrow('RPC unavailable');
    const partial=fixture();const scan=partial.adapter.scan;
    partial.adapter.scan=async(...args)=>({...await scan(...args),complete:false});
    await expect(partial.service.start(owner,partial.token)).rejects.toMatchObject({code:'ownership_syncing'});
  });
  it('allows only one redemption across workers, rejects replay and duplicate contribution',async()=>{
    const f=await issued(),worker=createRelayService({config,adapter:f.adapter,environment:'test',origin:'https://choghop.test',rpc:database.rpc});
    const results=await Promise.allSettled([f.service.redeem(guest,f.permissionId,1,{type:'restore',mark}),worker.redeem(guest,f.permissionId,1,{type:'restore',mark})]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    await expect(worker.redeem(guest,f.permissionId,1,{type:'restore',mark})).rejects.toBeDefined();
    const count=await database.db.query<{count:number}>('select count(*)::int as count from choghop_private.relay_completions where run_id=$1',[f.runId]);
    expect(count.rows[0]!.count).toBe(1);
    const events=await database.db.query<{count:number}>("select count(*)::int as count from choghop_private.relay_events where run_id=$1 and name='relay_completed'",[f.runId]);
    expect(events.rows[0]!.count).toBe(1);
  });
  it('serializes competing invitations and allows a replacement after revocation',async()=>{
    const f=await prepared(),a=await f.service.challenge(owner,f.runId,guest.wallet),b=await f.service.challenge(owner,f.runId,outsider.wallet);
    const results=await Promise.allSettled([f.service.issue(owner,a.permissionId,await keeper.signTypedData(permissionData(a.scope))),f.service.issue(owner,b.permissionId,await keeper.signTypedData(permissionData(b.scope)))]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    const winning=results[0]!.status==='fulfilled'?a:b,losing=winning===a?b:a;
    await f.service.revoke(owner,winning.permissionId);
    await f.service.issue(owner,losing.permissionId,await keeper.signTypedData(permissionData(losing.scope)));
  });
  it('locks the redemption transaction itself and rolls back a failed event append',async()=>{
    const f=await issued();
    const rows=await database.db.query<{state:Parameters<typeof applyAction>[0]}>('select state from choghop_private.relay_runs where id=$1',[f.runId]);
    const proposal=applyAction(rows.rows[0]!.state,1,{type:'restore',mark});
    if(!proposal.ok)throw new Error('Fixture must be solvable');
    const args={p_operation:'redeem',p_actor_id:guest.id,p_wallet:guest.wallet.toLowerCase(),p_payload:{permission:f.permissionId,revision:1,environment:'test',state:proposal.run}};
    await database.db.exec("create function choghop_private.fail_relay_event() returns trigger language plpgsql as $$ begin if new.name='relay_completed' then raise exception 'test failure'; end if; return new; end $$; create trigger fail_relay_event before insert on choghop_private.relay_events for each row execute function choghop_private.fail_relay_event();");
    try{await expect(database.rpc('choghop_relay',args)).rejects.toThrow();}
    finally{await database.db.exec('drop trigger fail_relay_event on choghop_private.relay_events; drop function choghop_private.fail_relay_event();');}
    expect(await f.service.guest(guest,f.permissionId)).toMatchObject({status:'active',stage:'runner'});
    const results=await Promise.all([database.rpc('choghop_relay',args),database.rpc('choghop_relay',args)]);
    expect(results.filter((r:unknown)=>!(r as {error?:string}).error)).toHaveLength(1);
    const count=await database.db.query<{count:number}>('select count(*)::int as count from choghop_private.relay_completions where run_id=$1',[f.runId]);
    expect(count.rows[0]!.count).toBe(1);
  });
  it('restores an active owner invitation after refresh and isolates environments',async()=>{
    const f=await issued();
    expect(await f.service.resume(owner,f.runId)).toMatchObject({permissionId:f.permissionId});
    const wrong=createRelayService({config,adapter:f.adapter,environment:'production',origin:'https://choghop.test',rpc:database.rpc});
    await expect(wrong.resume(owner,f.runId)).rejects.toMatchObject({code:'wrong_environment'});
    await expect(wrong.guest(guest,f.permissionId)).rejects.toMatchObject({code:'wrong_environment'});
  });
  it('keeps an earned contribution after transfer and refuses a second contribution for the same NFT',async()=>{
    const f=await issued();await f.service.redeem(guest,f.permissionId,1,{type:'restore',mark});
    f.transferAwayBack();
    const next=await f.service.start(owner,f.token);
    await f.service.prepare(owner,next.runId,0,prepare);
    await expect(f.service.challenge(owner,next.runId,guest.wallet)).rejects.toMatchObject({code:'budget_used'});
    const count=await database.db.query<{count:number}>('select count(*)::int as count from choghop_private.relay_completions where run_id=$1',[f.runId]);
    expect(count.rows[0]!.count).toBe(1);
  });
  it('enforces shared attempt limits and explicit grants/RLS; events and completions are append-only',async()=>{
    const f=await issued();
    for(let i=0;i<12;i++) await expect(f.service.redeem(guest,f.permissionId,1,{type:'restore',mark:{glyph:'sun',bearing:'north'}})).rejects.toMatchObject({code:'incorrect_runner'});
    await expect(f.service.redeem(guest,f.permissionId,1,{type:'restore',mark})).rejects.toMatchObject({code:'too_many_attempts'});
    for(const role of ['anon','authenticated']) await expect(database.db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query('select public.choghop_relay($1,$2,$3,$4)',['load',owner.id,owner.wallet.toLowerCase(),JSON.stringify({run:f.runId})]);})).rejects.toThrow();
    await expect(database.db.transaction(async tx=>{await tx.exec('set local role service_role');await tx.exec('delete from choghop_private.relay_completions');})).rejects.toThrow();
    const events=await database.db.query<{environment:string;mode:string}>('select environment,mode from choghop_private.relay_events');
    expect(events.rows.every(e=>e.environment==='test'&&e.mode==='relay')).toBe(true);
  });
});

it('extracts only the immutable verified Web3 identity, never editable user metadata',()=>{
  const identity={provider:'web3',identity_data:{chain:'ethereum',network:'10143',address:owner.wallet,sub:`web3:ethereum:${owner.wallet}`}};
  const user={id:owner.id,identities:[identity],user_metadata:{address:outsider.wallet}} as unknown as User;
  expect(walletIdentity(user,10143)).toEqual(owner);
  expect(()=>walletIdentity({...user,identities:[]},10143)).toThrow();
  expect(()=>walletIdentity(user,143)).toThrow();
  expect(()=>walletIdentity({...user,identities:[{...identity,provider:'email'}]} as unknown as User,10143)).toThrow();
});

describe('app-managed passport, owner receipt and remembered continuation',()=>{
  it('awards one attributed entry atomically and restores the owner receipt and guest passport',async()=>{
    const f=await issued();
    await expect(f.service.passport(owner,f.runId)).rejects.toMatchObject({code:'passport_not_ready'});
    await f.service.redeem(guest,f.permissionId,1,{type:'restore',mark});
    const ownerView=await f.service.resume(owner,f.runId),guestView=await f.service.guest(guest,f.permissionId);
    expect(ownerView.passport?.receipt).toMatchObject({runId:f.runId,tokenId:f.token,owner:owner.wallet.toLowerCase(),guest:guest.wallet.toLowerCase(),keeperChoice:'reflected',signal:{glyph:'moon',bearing:'south'},restoration:mark});
    expect(guestView.passport?.receipt).toBeNull();
    expect(guestView.passport?.entry).toEqual(ownerView.passport?.entry);
    expect(guestView.passport?.entries).toHaveLength(1);
    expect(ownerView.passport?.entry?.story).toContain('reflected signal');
    await expect(f.service.passport(outsider,f.runId)).rejects.toMatchObject({code:'forbidden'});
  });
  it('handles repeated award delivery and enforces the explicit NFT/run database constraint',async()=>{
    const f=await issued();await f.service.redeem(guest,f.permissionId,1,{type:'restore',mark});
    for(let i=0;i<2;i++)await database.db.transaction(async tx=>{
      await tx.exec('set local role service_role');await tx.query('select choghop_private.award_passport($1::uuid)',[f.runId]);
    });
    const columns='run_id,asset_id,chain_id,collection_address,token_id,owner_actor,guest_actor,owner_wallet,guest_wallet,environment,content_version,expedition,variant_id,keeper_choice,keeper_mark,signal,restoration,completed_at';
    await expect(database.db.query(`insert into choghop_private.passport_entries(${columns}) select ${columns} from choghop_private.passport_entries where run_id=$1`,[f.runId])).rejects.toThrow('one_passport_per_nft_per_run');
    expect((await f.service.passport(owner,f.runId)).entries).toHaveLength(1);
  });
  it('rejects an owner solo attempt racing the named guest without issuing a second award',async()=>{
    const f=await issued();
    const results=await Promise.allSettled([f.service.redeem(owner,f.permissionId,1,{type:'restore',mark}),f.service.redeem(guest,f.permissionId,1,{type:'restore',mark})]);
    expect(results[0]).toMatchObject({status:'rejected',reason:{code:'wrong_guest'}});
    expect(results[1]!.status).toBe('fulfilled');
    const journal=await f.service.passport(owner,f.runId);
    expect(journal.entries).toHaveLength(1);
    expect(journal.entry?.guest).toBe(guest.wallet.toLowerCase());
  });
  it('allows only one passport under a direct owner/guest redemption race in PostgreSQL',async()=>{
    const f=await issued();
    const row=await database.db.query<{state:Parameters<typeof applyAction>[0]}>('select state from choghop_private.relay_runs where id=$1',[f.runId]);
    const proposed=applyAction(row.rows[0]!.state,1,{type:'restore',mark});if(!proposed.ok)throw new Error('Invalid fixture');
    const payload={permission:f.permissionId,revision:1,environment:'test',state:proposed.run};
    const [solo,shared]=await Promise.all([
      database.rpc('choghop_relay',{p_operation:'redeem',p_actor_id:owner.id,p_wallet:owner.wallet.toLowerCase(),p_payload:payload}),
      database.rpc('choghop_relay',{p_operation:'redeem',p_actor_id:guest.id,p_wallet:guest.wallet.toLowerCase(),p_payload:payload}),
    ]);
    expect(['wrong_guest','stale_revision']).toContain((solo as {error:string}).error);expect(shared).toMatchObject({state:{stage:'complete'}});
    expect((await f.service.passport(owner,f.runId)).entries).toHaveLength(1);
  });
  it('rolls permission, completion and state back when passport insertion fails',async()=>{
    const f=await issued();
    await database.db.exec("create function choghop_private.fail_passport() returns trigger language plpgsql as $$ begin raise exception 'test passport failure'; end $$; create trigger fail_passport before insert on choghop_private.passport_entries for each row execute function choghop_private.fail_passport();");
    try{await expect(f.service.redeem(guest,f.permissionId,1,{type:'restore',mark})).rejects.toThrow('test passport failure');}
    finally{await database.db.exec('drop trigger fail_passport on choghop_private.passport_entries; drop function choghop_private.fail_passport();');}
    expect(await f.service.guest(guest,f.permissionId)).toMatchObject({stage:'runner',status:'active',passport:null});
    expect((await database.db.query('select * from choghop_private.relay_completions where run_id=$1',[f.runId])).rows).toHaveLength(0);
    await f.service.redeem(guest,f.permissionId,1,{type:'restore',mark});
    expect((await f.service.passport(owner,f.runId)).entries).toHaveLength(1);
  });
  for(const treatment of ['direct','reflected'] as const)it(`uses the recorded ${treatment} choice for a unique, solvable follow-up and earns its own stamp`,async()=>{
    const f=await issued(treatment);await f.service.redeem(guest,f.permissionId,1,{type:'restore',mark});
    const next=await f.service.followup(owner,f.runId);
    expect(next).toMatchObject({stage:'keeper',expedition:'returning-light/v1',memoryChoice:treatment,revision:0});
    expect(next.runId).not.toBe(f.runId);
    expect((await f.service.followup(owner,f.runId)).runId).toBe(next.runId);
    const nextMark={glyph:'moon',bearing:treatment==='direct'?'east':'west'};
    await expect(f.service.prepare(owner,next.runId,0,{...prepare,mark})).rejects.toMatchObject({code:'incorrect_keeper'});
    await f.service.prepare(owner,next.runId,0,{...prepare,mark:nextMark});
    const ticket=await f.service.challenge(owner,next.runId,guest.wallet);
    expect(ticket.scope.expedition).toBe('returning-light/v1');
    await expect(f.service.issue(owner,ticket.permissionId,await keeper.signTypedData(permissionData({...ticket.scope,expedition:'last-lantern/v1'})))).rejects.toMatchObject({code:'invalid_signature'});
    await f.service.issue(owner,ticket.permissionId,await keeper.signTypedData(permissionData(ticket.scope)));
    await f.service.redeem(guest,ticket.permissionId,1,{type:'restore',mark:nextMark});
    const journal=await f.service.passport(owner,next.runId);
    expect(journal.entries.map(e=>e.title)).toEqual(['The Last Lantern','The Returning Light']);
    expect(journal.entry?.restoration).toEqual(nextMark);
    expect(journal.receipt?.runId).toBe(next.runId);
    expect((await f.service.passport(owner,f.runId)).entry?.keeperChoice).toBe(treatment);
    await expect(f.service.followup(owner,next.runId)).rejects.toMatchObject({code:'no_further_chapter'});
  });
  it('serializes simultaneous follow-up requests and ignores browser-supplied chapter variants',async()=>{
    const f=await issued();await f.service.redeem(guest,f.permissionId,1,{type:'restore',mark});
    const results=await Promise.allSettled([f.service.followup(owner,f.runId),f.service.followup(owner,f.runId)]);
    const winning=results.find(r=>r.status==='fulfilled');expect(winning?.status).toBe('fulfilled');
    const next=await f.service.followup(owner,f.runId);
    const forged=await database.rpc('choghop_relay',{p_operation:'followup',p_actor_id:owner.id,p_wallet:owner.wallet.toLowerCase(),p_payload:{run:f.runId,id:randomUUID(),environment:'test',variantId:'last-lantern-06',previousChoice:'direct'}});
    expect(forged).toMatchObject({id:next.runId,state:{variantId:'last-lantern-03'},memory_choice:'reflected'});
    expect((await database.db.query('select id from choghop_private.relay_runs where previous_run_id=$1',[f.runId])).rows).toHaveLength(1);
    await expect(f.service.followup(guest,f.runId)).rejects.toMatchObject({code:'forbidden'});
  });
  it('keeps token history after a transfer, authorizes the new owner and protects append-only records',async()=>{
    const f=await issued();await f.service.redeem(guest,f.permissionId,1,{type:'restore',mark});f.transferAway();
    const journal=await f.service.history(outsider,f.token);
    expect(journal.entries).toHaveLength(1);expect(journal.receipt).toBeNull();
    await expect(f.service.history(owner,f.token)).rejects.toMatchObject({code:'ownership_unverified'});
    expect((await f.service.passport(owner,f.runId)).receipt?.owner).toBe(owner.wallet.toLowerCase());
    for(const role of ['anon','authenticated','service_role'])await expect(database.db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.exec('delete from choghop_private.passport_entries');})).rejects.toThrow();
    await expect(database.db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query('select choghop_private.award_passport($1::uuid)',[f.runId]);})).rejects.toThrow();
    const wrong=createRelayService({config,adapter:f.adapter,environment:'production',origin:'https://choghop.test',rpc:database.rpc});
    await expect(wrong.passport(owner,f.runId)).rejects.toMatchObject({code:'wrong_environment'});
  });
});
