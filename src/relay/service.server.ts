import 'server-only';
import { randomBytes, randomUUID } from 'node:crypto';
import { getAddress, isAddress, verifyTypedData, type Address, type Hex } from 'viem';
import { applyAction, createRun, keeperView, runnerView, type Run } from '../puzzle/engine';
import { isRecord, sameMark } from '../puzzle/grammar';
import { supabaseRpc, type Rpc } from '../persistence/rpc.server';
import type { CollectionConfig } from '../chain/config';
import { assetKey, tokenNumber, type Asset, type CollectionAdapter } from '../chain/collection.server';
import { EXPEDITION, FOLLOWUP, permissionData, signalHash, type Scope } from './permission';
import { passportView } from './passport.server';
import { RelayError } from './errors';

export type Actor = { id: string; wallet: Address };
type Row = { id: string; actor_id: string; owner_wallet: Address; asset_id: string; generation: number; revision: number; state: Run; signal_hash: string | null; environment: string; content_version: string; expedition:string; previous_run_id:string|null; memory_choice:'direct'|'reflected'|null; permission?:{id:string;expiresAt:number}|null };
type Permit = { id: string; scope: Scope; status: string; expires_at: string; run_id: string; guest_wallet: string };
function canonical(value: unknown): Row {
  if (!isRecord(value) || !isRecord(value.state) || value.content_version!==EXPEDITION || ![EXPEDITION,FOLLOWUP].includes(String(value.expedition))) throw new RelayError('incompatible_content',503);
  const raw=value.state;
  if (typeof raw.variantId!=='string') throw new RelayError('incompatible_content',503);
  let run: Run=createRun(raw.variantId);
  if (raw.stage!=='keeper') {
    const prepared=applyAction(run,0,{type:'prepare',mark:raw.keeperMark,treatment:raw.treatment});
    if (!prepared.ok || prepared.run.stage!=='runner' || !isRecord(raw.signal) || !sameMark(prepared.run.signal,raw.signal as typeof prepared.run.signal)) throw new RelayError('incompatible_content',503);
    run=prepared.run;
    if (raw.stage==='complete') {
      const completed=applyAction(run,1,{type:'restore',mark:raw.restoration});
      if (!completed.ok) throw new RelayError('incompatible_content',503);
      run=completed.run;
    }
  }
  if (raw.stage!==run.stage || raw.revision!==run.revision) throw new RelayError('incompatible_content',503);
  return {...value,state:run} as Row;
}
function ownerView(row: Row) {
  return {runId:row.id,revision:row.revision,stage:row.state.stage,tokenId:row.asset_id.split(':')[3],
    expedition:row.expedition,memoryChoice:row.memory_choice,
    chart:keeperView(createRun(row.state.variantId)),permissionId:row.permission?.id??null,
    puzzle:row.state.stage==='keeper' ? keeperView(row.state) : row.state.stage==='runner' ? runnerView(row.state) : null,
    signal:row.state.stage!=='keeper' ? row.state.signal : null};
}

export function createRelayService(deps: { config: CollectionConfig; adapter: CollectionAdapter; environment: string; origin: string; rpc?: Rpc }) {
  const {config,adapter,environment,origin}=deps, rpc=deps.rpc ?? supabaseRpc;
  async function call<T>(actor: Actor, operation: string, payload: Record<string,unknown>): Promise<T> {
    const result=await rpc('choghop_relay',{p_operation:operation,p_actor_id:actor.id,p_wallet:actor.wallet.toLowerCase(),p_payload:{...payload,environment}});
    if (isRecord(result) && typeof result.error==='string') throw new RelayError(result.error);
    return result as T;
  }
  async function sync(actor: Actor, token: string,expedition:string=EXPEDITION) {
    const tokenId=tokenNumber(token), asset=assetKey(config,token,environment,expedition);
    const saved=await call<Asset>(actor,'asset',{asset,start:String(config.deploymentBlock)});
    const observed=await adapter.scan(tokenId,saved);
    const updated=await call<Asset>(actor,'sync',{asset,...observed});
    if (!observed.complete) throw new RelayError('ownership_syncing',202);
    return updated;
  }
  function token(row: Row) { return row.asset_id.split(':')[3]!; }
  async function load(actor: Actor, id: string) { return canonical(await call(actor,'load',{run:id})); }
  async function passport(actor:Actor,id:string){return passportView(await call(actor,'passport',{run:id}));}
  async function owned(actor:Actor,row:Row){return {...ownerView(row),passport:row.state.stage==='complete'?await passport(actor,row.id):null};}
  async function invitation(actor: Actor,id: string) {
    const result=await call<{run:unknown;permission:Permit}>(actor,'invitation',{permission:id});
    return {row:canonical(result.run),permit:result.permission};
  }
  function checkScope(scope: Scope,row: Row) {
    if (scope.origin!==origin || scope.environment!==environment || scope.chainId!==config.chainId ||
      scope.collection.toLowerCase()!==config.collection.toLowerCase() || scope.tokenId!==token(row) ||
      scope.runId!==row.id || scope.owner.toLowerCase()!==row.owner_wallet || scope.revision!==row.revision ||
      scope.signalHash!==row.signal_hash || scope.generation!==row.generation || (scope.expedition??EXPEDITION)!==row.expedition) throw new RelayError('scope_mismatch');
  }
  return {
    async start(actor: Actor,token: string) {
      await sync(actor,token);
      return owned(actor,canonical(await call(actor,'start',{id:randomUUID(),asset:assetKey(config,token,environment),state:createRun('last-lantern-01')})));
    },
    async resume(actor: Actor,id: string) { return owned(actor,await load(actor,id)); },
    passport,
    async history(actor:Actor,token:string){
      await sync(actor,token);
      return passportView(await call(actor,'passport_token',{asset:assetKey(config,token,environment)}));
    },
    async followup(actor:Actor,id:string){
      const row=await load(actor,id);
      if(row.state.stage!=='complete')throw new RelayError('complete_first');
      if(row.expedition!==EXPEDITION)throw new RelayError('no_further_chapter');
      await sync(actor,token(row),FOLLOWUP);
      return owned(actor,canonical(await call(actor,'followup',{run:id,id:randomUUID()})));
    },
    async prepare(actor: Actor,id: string,revision: number,action: unknown) {
      const row=await load(actor,id);
      if (row.state.stage==='complete') throw new RelayError('already_complete');
      // Re-preparing is a new outer revision. Canonical engine revisions remain 0/1/2.
      const result=applyAction(createRun(row.state.variantId),0,action);
      if (!result.ok) throw new RelayError(result.code,422);
      if (result.run.stage!=='runner') throw new RelayError('invalid_action',400);
      return owned(actor,canonical(await call(actor,'prepare',{run:id,revision,state:result.run,signal:signalHash(result.run,row.expedition)})));
    },
    async challenge(actor: Actor,id: string,guest: string) {
      if (!isAddress(guest)) throw new RelayError('invalid_guest',400);
      const row=await load(actor,id);
      await sync(actor,token(row),row.expedition);
      const scope={collection:config.collection,chainId:config.chainId,tokenId:token(row),environment,origin,nonce:`0x${randomBytes(32).toString('hex')}`};
      const permit=await call<Permit>(actor,'challenge',{run:id,id:randomUUID(),guest:guest.toLowerCase(),scope});
      checkScope(permit.scope,row);
      return {permissionId:permit.id,scope:permit.scope};
    },
    async issue(actor: Actor,id: string,signature: Hex) {
      const {row,permit}=await invitation(actor,id);
      if (row.actor_id!==actor.id || row.owner_wallet!==actor.wallet.toLowerCase()) throw new RelayError('forbidden',403);
      checkScope(permit.scope,row);
      if (!await verifyTypedData({...permissionData(permit.scope),address:getAddress(actor.wallet),signature})) throw new RelayError('invalid_signature',401);
      await sync(actor,token(row),row.expedition);
      await call(actor,'issue',{permission:id});
      return {permissionId:id,inviteUrl:`${origin}/relay?invite=${id}`,expiresAt:permit.scope.expiresAt};
    },
    async revoke(actor: Actor,id: string) { return call(actor,'revoke',{permission:id}); },
    async guest(actor: Actor,id: string) {
      const {row,permit}=await invitation(actor,id);
      const status=Date.parse(permit.expires_at)<=Date.now() && permit.status==='active' ? 'expired' : permit.status;
      return {permissionId:id,runId:row.id,revision:row.revision,stage:row.state.stage,status,
        expedition:row.expedition,memoryChoice:row.memory_choice,passport:row.state.stage==='complete'?await passport(actor,row.id):null,
        owner:row.owner_wallet,guest:permit.guest_wallet,tokenId:token(row),collection:config.collection,
        allowedMove:'Restore one lantern',expiresAt:permit.scope.expiresAt,
        puzzle:row.state.stage==='runner' && status==='active' ? runnerView(row.state) : null};
    },
    async redeem(actor: Actor,id: string,revision: number,action: unknown) {
      const {row,permit}=await invitation(actor,id);
      if(permit.guest_wallet!==actor.wallet.toLowerCase()||row.actor_id===actor.id)throw new RelayError('wrong_guest',403);
      if (permit.status==='redeemed') throw new RelayError('redeemed');
      checkScope(permit.scope,row);
      await sync(actor,token(row),row.expedition);
      const proposal=applyAction(row.state,row.state.revision,action);
      const payload=proposal.ok ? {state:proposal.run} : {error:proposal.code};
      await call(actor,'redeem',{permission:id,revision,...payload});
      return {runId:row.id,stage:'complete',message:'The lantern is lit. Both contributions are saved.'};
    },
  };
}
