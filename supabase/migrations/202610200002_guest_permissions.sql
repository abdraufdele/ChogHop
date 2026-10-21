begin;
create table choghop_private.relay_assets (
  id text primary key, generation integer not null default 0 check (generation >= 0),
  cursor bigint not null, block_hash text, owner_wallet text, synced_at timestamptz,
  constraint normalized_owner check (owner_wallet is null or owner_wallet ~ '^0x[a-f0-9]{40}$')
);
create table choghop_private.relay_runs (
  id uuid primary key, actor_id uuid not null, owner_wallet text not null,
  asset_id text not null references choghop_private.relay_assets(id), generation integer not null,
  environment text not null check (environment in ('development','test','production')),
  content_version text not null default 'last-lantern/v1', revision integer not null default 0,
  state jsonb not null, signal_hash text, created_at timestamptz not null default clock_timestamp(),
  attempt_at timestamptz not null default clock_timestamp(), attempts integer not null default 0
);
create table choghop_private.relay_permissions (
  id uuid primary key, run_id uuid not null references choghop_private.relay_runs(id),
  asset_id text not null references choghop_private.relay_assets(id),
  scope jsonb not null, guest_wallet text not null, revision integer not null, generation integer not null,
  status text not null default 'challenge' check (status in ('challenge','active','revoked','redeemed','expired','changed')),
  issued_at timestamptz not null default clock_timestamp(), expires_at timestamptz not null,
  challenge_until timestamptz not null default (clock_timestamp() + interval '5 minutes'),
  guest_actor uuid, redeemed_at timestamptz
);
create unique index relay_active_guest on choghop_private.relay_permissions(asset_id) where status='active';
create unique index relay_unique_nonce on choghop_private.relay_permissions((scope->>'nonce'));
create table choghop_private.relay_completions (
  run_id uuid primary key references choghop_private.relay_runs(id),
  asset_id text not null unique references choghop_private.relay_assets(id),
  permission_id uuid not null unique references choghop_private.relay_permissions(id),
  owner_actor uuid not null, guest_actor uuid not null, owner_wallet text not null, guest_wallet text not null,
  state jsonb not null, completed_at timestamptz not null default clock_timestamp()
);
create table choghop_private.relay_events (
  id bigint generated always as identity primary key, run_id uuid references choghop_private.relay_runs(id),
  actor_id uuid not null, name text not null, environment text not null,
  mode text not null default 'relay' check (mode='relay'), content_version text not null default 'last-lantern/v1',
  assistance text not null default 'unknown', incentive text not null default 'unknown', seeded boolean not null default false,
  occurred_at timestamptz not null default clock_timestamp()
);
do $$ declare t text; begin
  foreach t in array array['relay_assets','relay_runs','relay_permissions','relay_completions','relay_events'] loop
    execute format('alter table choghop_private.%I enable row level security',t);
    execute format('alter table choghop_private.%I force row level security',t);
    execute format('revoke all on choghop_private.%I from public,anon,authenticated,service_role',t);
    execute format('grant select,insert on choghop_private.%I to service_role',t);
    execute format('create policy server_read on choghop_private.%I for select to service_role using (true)',t);
    execute format('create policy server_insert on choghop_private.%I for insert to service_role with check (true)',t);
    if t not in ('relay_events','relay_completions') then
      execute format('grant update on choghop_private.%I to service_role',t);
      execute format('create policy server_update on choghop_private.%I for update to service_role using (true) with check (true)',t);
    end if;
  end loop;
end $$;
revoke all on sequence choghop_private.relay_events_id_seq from public,anon,authenticated;
grant usage,select on sequence choghop_private.relay_events_id_seq to service_role;

-- Only the server role can call this gateway. Actor and wallet come from Auth getUser,
-- puzzle state from the versioned engine, and observations from the configured RPC.
create function public.choghop_relay(p_operation text,p_actor_id uuid,p_wallet text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog as $$
declare
  a choghop_private.relay_assets; r choghop_private.relay_runs;
  p choghop_private.relay_permissions; v_scope jsonb; v_name text;
  v_now timestamptz := clock_timestamp(); v_id uuid;
begin
  if p_wallet !~ '^0x[a-f0-9]{40}$' then return jsonb_build_object('error','unauthorized'); end if;
  if p_operation='asset' then
    insert into choghop_private.relay_assets(id,cursor) values(p_payload->>'asset', (p_payload->>'start')::bigint-1) on conflict do nothing;
    select * into a from choghop_private.relay_assets where id=p_payload->>'asset';
    return to_jsonb(a);
  end if;
  if p_operation='sync' then
    select * into a from choghop_private.relay_assets where id=p_payload->>'asset' for update;
    if not found then return jsonb_build_object('error','not_found'); end if;
    if a.cursor<>(p_payload->>'expected')::bigint then return jsonb_build_object('error','sync_again'); end if;
    if (p_payload->>'cursor')::bigint<a.cursor or (p_payload->>'transfers')::integer<0 then raise exception 'invalid scan'; end if;
    if (p_payload->>'transfers')::integer>0 then
      update choghop_private.relay_permissions set status='changed' where asset_id=a.id and status in ('active','challenge');
    end if;
    update choghop_private.relay_assets set cursor=(p_payload->>'cursor')::bigint,
      block_hash=p_payload->>'hash', owner_wallet=p_payload->>'owner',
      generation=generation+(p_payload->>'transfers')::integer,
      synced_at=case when (p_payload->>'complete')::boolean then v_now else null end
      where id=a.id returning * into a;
    return to_jsonb(a);
  end if;
  if p_operation='start' then
    select * into a from choghop_private.relay_assets where id=p_payload->>'asset' for update;
    if a.owner_wallet is distinct from p_wallet or a.synced_at is null or a.synced_at<v_now-interval '20 seconds' then return jsonb_build_object('error','ownership_unverified'); end if;
    select * into r from choghop_private.relay_runs where asset_id=a.id and actor_id=p_actor_id and owner_wallet=p_wallet and generation=a.generation order by created_at desc limit 1;
    if not found then
      insert into choghop_private.relay_runs(id,actor_id,owner_wallet,asset_id,generation,environment,state)
        values((p_payload->>'id')::uuid,p_actor_id,p_wallet,a.id,a.generation,p_payload->>'environment',p_payload->'state') returning * into r;
      insert into choghop_private.relay_events(run_id,actor_id,name,environment) values(r.id,p_actor_id,'relay_started',r.environment);
    end if;
    return to_jsonb(r) || jsonb_build_object('permission', (select jsonb_build_object('id',id,'expiresAt',scope->'expiresAt') from choghop_private.relay_permissions where run_id=r.id and status='active' and expires_at>v_now limit 1));
  end if;
  -- Common lock order: asset -> run -> permission. All mutations share it.
  if p_payload ? 'permission' then
    select * into p from choghop_private.relay_permissions where id=(p_payload->>'permission')::uuid;
    if not found then return jsonb_build_object('error','not_found'); end if;
    select * into r from choghop_private.relay_runs where id=p.run_id;
  else
    select * into r from choghop_private.relay_runs where id=(p_payload->>'run')::uuid;
  end if;
  if r.id is null then return jsonb_build_object('error','not_found'); end if;
  select * into a from choghop_private.relay_assets where id=r.asset_id for update;
  select * into r from choghop_private.relay_runs where id=r.id for update;
  if p.id is not null then select * into p from choghop_private.relay_permissions where id=p.id for update; end if;
  if r.environment is distinct from p_payload->>'environment' then return jsonb_build_object('error','wrong_environment'); end if;
  if p_operation='invitation' then
    if p.guest_wallet<>p_wallet and (r.actor_id<>p_actor_id or r.owner_wallet<>p_wallet) then return jsonb_build_object('error','wrong_guest'); end if;
    return jsonb_build_object('run',to_jsonb(r),'permission',to_jsonb(p));
  end if;
  if p_operation='load' then
    if r.actor_id<>p_actor_id or r.owner_wallet<>p_wallet then return jsonb_build_object('error','forbidden'); end if;
    return to_jsonb(r) || jsonb_build_object('permission', (select jsonb_build_object('id',id,'expiresAt',scope->'expiresAt') from choghop_private.relay_permissions where run_id=r.id and status='active' and expires_at>v_now limit 1));
  end if;
  if p_operation='revoke' then
    if r.actor_id<>p_actor_id or r.owner_wallet<>p_wallet then return jsonb_build_object('error','forbidden'); end if;
    if p.status not in ('active','challenge') then return jsonb_build_object('error',p.status); end if;
    update choghop_private.relay_permissions set status='revoked' where id=p.id;
    insert into choghop_private.relay_events(run_id,actor_id,name,environment) values(r.id,p_actor_id,'permission_revoked',r.environment);
    return jsonb_build_object('ok',true);
  end if;
  if r.generation is distinct from a.generation or a.owner_wallet is distinct from r.owner_wallet then return jsonb_build_object('error','ownership_changed'); end if;
  if r.environment<>p_payload->>'environment' then return jsonb_build_object('error','wrong_environment'); end if;
  if p_operation in ('challenge','issue','redeem') and (a.synced_at is null or a.synced_at<v_now-interval '20 seconds') then return jsonb_build_object('error','ownership_unverified'); end if;
  if p_operation<>'redeem' and (r.actor_id<>p_actor_id or r.owner_wallet<>p_wallet) then return jsonb_build_object('error','forbidden'); end if;
  if p_operation in ('prepare','redeem') and r.revision<>(p_payload->>'revision')::integer then return jsonb_build_object('error','stale_revision'); end if;
  if p_operation='prepare' then
    if r.state->>'stage'='complete' then return jsonb_build_object('error','already_complete'); end if;
    update choghop_private.relay_permissions set status='changed' where run_id=r.id and status in ('active','challenge');
    update choghop_private.relay_runs set state=p_payload->'state',signal_hash=p_payload->>'signal',revision=revision+1 where id=r.id returning * into r;
    v_name := 'signal_prepared';
  elsif p_operation='challenge' then
    if r.state->>'stage'<>'runner' then return jsonb_build_object('error','prepare_first'); end if;
    if exists(select 1 from choghop_private.relay_completions where asset_id=a.id) then return jsonb_build_object('error','budget_used'); end if;
    if p_payload->>'guest'=p_wallet or p_payload->>'guest' !~ '^0x[a-f0-9]{40}$' then return jsonb_build_object('error','different_guest_required'); end if;
    v_id := (p_payload->>'id')::uuid;
    v_scope := p_payload->'scope' || jsonb_build_object('id',v_id,'runId',r.id,'owner',r.owner_wallet,'guest',p_payload->>'guest',
      'revision',r.revision,'signalHash',r.signal_hash,'generation',a.generation,
      'issuedAt',floor(extract(epoch from v_now))::bigint,'expiresAt',floor(extract(epoch from v_now+interval '30 minutes'))::bigint);
    insert into choghop_private.relay_permissions(id,run_id,asset_id,scope,guest_wallet,revision,generation,expires_at)
      values(v_id,r.id,a.id,v_scope,p_payload->>'guest',r.revision,a.generation,to_timestamp((v_scope->>'expiresAt')::bigint)) returning * into p;
    return to_jsonb(p);
  elsif p_operation in ('issue','redeem') then
    if p.revision<>r.revision or p.scope->>'signalHash'<>r.signal_hash or p.generation<>a.generation then return jsonb_build_object('error','signal_changed'); end if;
    if p.expires_at<=v_now then return jsonb_build_object('error','expired'); end if;
    if p_operation='issue' then
      if p.status<>'challenge' then return jsonb_build_object('error',p.status); end if;
      if p.challenge_until<=v_now then return jsonb_build_object('error','challenge_expired'); end if;
      update choghop_private.relay_permissions set status='expired' where asset_id=a.id and status='active' and expires_at<=v_now;
      if exists(select 1 from choghop_private.relay_permissions where asset_id=a.id and status='active') then return jsonb_build_object('error','active_permission_exists'); end if;
      if exists(select 1 from choghop_private.relay_completions where asset_id=a.id) then return jsonb_build_object('error','budget_used'); end if;
      update choghop_private.relay_permissions set status='active' where id=p.id;
      v_name := 'permission_issued';
    else
      if p.guest_wallet<>p_wallet or r.actor_id=p_actor_id then return jsonb_build_object('error','wrong_guest'); end if;
      if p.status<>'active' then return jsonb_build_object('error',p.status); end if;
      if r.state->>'stage'<>'runner' then return jsonb_build_object('error','already_complete'); end if;
      if r.attempt_at<v_now-interval '30 seconds' then r.attempts:=0; r.attempt_at:=v_now; end if;
      if r.attempts>=12 then return jsonb_build_object('error','too_many_attempts'); end if;
      update choghop_private.relay_runs set attempts=r.attempts+1,attempt_at=r.attempt_at where id=r.id;
      if p_payload ? 'error' then return jsonb_build_object('error',p_payload->>'error'); end if;
      if exists(select 1 from choghop_private.relay_completions where asset_id=a.id) then return jsonb_build_object('error','budget_used'); end if;
      update choghop_private.relay_permissions set status='redeemed',guest_actor=p_actor_id,redeemed_at=v_now where id=p.id;
      update choghop_private.relay_runs set state=p_payload->'state',revision=revision+1 where id=r.id returning * into r;
      insert into choghop_private.relay_completions(run_id,asset_id,permission_id,owner_actor,guest_actor,owner_wallet,guest_wallet,state)
        values(r.id,a.id,p.id,r.actor_id,p_actor_id,r.owner_wallet,p_wallet,r.state);
      v_name := 'relay_completed';
    end if;
  else return jsonb_build_object('error','invalid_operation');
  end if;
  insert into choghop_private.relay_events(run_id,actor_id,name,environment) values(r.id,p_actor_id,v_name,r.environment);
  return to_jsonb(r);
end $$;
revoke all on function public.choghop_relay(text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.choghop_relay(text,uuid,text,jsonb) to service_role;
commit;
