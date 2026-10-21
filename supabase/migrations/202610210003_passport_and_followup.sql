begin;

alter table choghop_private.relay_runs
  add column expedition text not null default 'last-lantern/v1' check (expedition in ('last-lantern/v1','returning-light/v1')),
  add column previous_run_id uuid unique references choghop_private.relay_runs(id),
  add column memory_choice text check (memory_choice in ('direct','reflected'));
alter table choghop_private.relay_events add column expedition text not null default 'last-lantern/v1';

create table choghop_private.passport_entries (
  id bigint generated always as identity primary key,
  run_id uuid not null references choghop_private.relay_completions(run_id),
  asset_id text not null references choghop_private.relay_assets(id),
  chain_id bigint not null check (chain_id in (143,10143)),
  collection_address text not null check (collection_address ~ '^0x[a-f0-9]{40}$'),
  token_id text not null check (token_id ~ '^(0|[1-9][0-9]{0,77})$'),
  owner_actor uuid not null, guest_actor uuid not null,
  owner_wallet text not null, guest_wallet text not null,
  environment text not null check (environment in ('development','test','production')),
  content_version text not null, expedition text not null,
  variant_id text not null, keeper_choice text not null check (keeper_choice in ('direct','reflected')),
  keeper_mark jsonb not null, signal jsonb not null, restoration jsonb not null,
  completed_at timestamptz not null,
  constraint one_passport_per_nft_per_run unique (run_id,chain_id,collection_address,token_id),
  constraint distinct_contributors check (owner_actor<>guest_actor and owner_wallet<>guest_wallet)
);
create index passport_token_history on choghop_private.passport_entries(environment,chain_id,collection_address,token_id,completed_at);
alter table choghop_private.passport_entries enable row level security;
alter table choghop_private.passport_entries force row level security;
revoke all on choghop_private.passport_entries from public,anon,authenticated,service_role;
grant select,insert on choghop_private.passport_entries to service_role;
create policy passport_server_read on choghop_private.passport_entries for select to service_role using (true);
create policy passport_server_append on choghop_private.passport_entries for insert to service_role with check (true);
revoke all on sequence choghop_private.passport_entries_id_seq from public,anon,authenticated,service_role;
grant usage,select on sequence choghop_private.passport_entries_id_seq to service_role;

-- Derived only from immutable, already-authorized completion records. Repeated
-- delivery is harmless; the explicit NFT/run constraint is the final duplicate guard.
create function choghop_private.award_passport(p_run_id uuid) returns void
language sql security invoker set search_path=pg_catalog as $$
  insert into choghop_private.passport_entries(
    run_id,asset_id,chain_id,collection_address,token_id,owner_actor,guest_actor,owner_wallet,guest_wallet,
    environment,content_version,expedition,variant_id,keeper_choice,keeper_mark,signal,restoration,completed_at)
  select c.run_id,c.asset_id,split_part(c.asset_id,':',2)::bigint,split_part(c.asset_id,':',3),split_part(c.asset_id,':',4),
    c.owner_actor,c.guest_actor,c.owner_wallet,c.guest_wallet,r.environment,r.content_version,r.expedition,
    c.state->>'variantId',c.state->>'treatment',c.state->'keeperMark',c.state->'signal',c.state->'restoration',c.completed_at
  from choghop_private.relay_completions c join choghop_private.relay_runs r on r.id=c.run_id
  where c.run_id=p_run_id and c.state->>'stage'='complete' and r.state->>'stage'='complete'
  on conflict on constraint one_passport_per_nft_per_run do nothing;
$$;
revoke all on function choghop_private.award_passport(uuid) from public,anon,authenticated,service_role;
grant execute on function choghop_private.award_passport(uuid) to service_role;
create function choghop_private.on_relay_completion() returns trigger
language plpgsql security invoker set search_path=pg_catalog as $$
begin
  perform choghop_private.award_passport(new.run_id);
  if not exists(select 1 from choghop_private.passport_entries where run_id=new.run_id) then
    raise exception 'Completion did not produce a valid passport';
  end if;
  return new;
end $$;
revoke all on function choghop_private.on_relay_completion() from public,anon,authenticated;
create trigger relay_completion_passport after insert on choghop_private.relay_completions
  for each row execute function choghop_private.on_relay_completion();

-- Include any genuine slice-4 completions, without inventing contributors or dates.
select choghop_private.award_passport(run_id) from choghop_private.relay_completions;

create function choghop_private.relay_event_expedition() returns trigger
language plpgsql security invoker set search_path=pg_catalog as $$
begin
  select expedition into new.expedition from choghop_private.relay_runs where id=new.run_id;
  return new;
end $$;
revoke all on function choghop_private.relay_event_expedition() from public,anon,authenticated;
create trigger relay_event_chapter before insert on choghop_private.relay_events
  for each row execute function choghop_private.relay_event_expedition();

-- Keep applied migrations immutable. The slice-4 gateway becomes a private helper;
-- its locks and one-use permission checks remain the single redemption path.
alter function public.choghop_relay(text,uuid,text,jsonb) rename to choghop_relay_v1;
alter function public.choghop_relay_v1(text,uuid,text,jsonb) set schema choghop_private;
revoke all on function choghop_private.choghop_relay_v1(text,uuid,text,jsonb) from public,anon,authenticated;

create function public.choghop_relay(p_operation text,p_actor_id uuid,p_wallet text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog as $$
declare
  r choghop_private.relay_runs; a choghop_private.relay_assets; p choghop_private.passport_entries;
  v_asset text; v_variant text; v_result jsonb; v_timeline jsonb;
begin
  if p_actor_id is null or p_wallet is null or p_wallet !~ '^0x[a-f0-9]{40}$' then
    return jsonb_build_object('error','unauthorized');
  end if;
  if p_operation='passport_token' then
    select * into a from choghop_private.relay_assets where id=p_payload->>'asset';
    if not found or a.owner_wallet is distinct from p_wallet or a.synced_at is null or a.synced_at<clock_timestamp()-interval '20 seconds' or split_part(a.id,':',1) is distinct from p_payload->>'environment' then
      return jsonb_build_object('error','ownership_unverified');
    end if;
    select coalesce(jsonb_agg(to_jsonb(e) order by e.completed_at,e.id),'[]'::jsonb) into v_timeline
      from choghop_private.passport_entries e where e.environment=p_payload->>'environment'
      and e.chain_id=split_part(a.id,':',2)::bigint and e.collection_address=split_part(a.id,':',3) and e.token_id=split_part(a.id,':',4);
    return jsonb_build_object('entries',v_timeline,'receipt',null);
  end if;
  if p_operation='passport' then
    select * into p from choghop_private.passport_entries where run_id=(p_payload->>'run')::uuid;
    if not found then return jsonb_build_object('error','passport_not_ready'); end if;
    if p.environment is distinct from p_payload->>'environment' then return jsonb_build_object('error','wrong_environment'); end if;
    if not ((p.owner_actor=p_actor_id and p.owner_wallet=p_wallet) or (p.guest_actor=p_actor_id and p.guest_wallet=p_wallet)) then
      return jsonb_build_object('error','forbidden');
    end if;
    select coalesce(jsonb_agg(to_jsonb(e) order by e.completed_at,e.id),'[]'::jsonb) into v_timeline
      from choghop_private.passport_entries e where e.environment=p.environment and e.chain_id=p.chain_id
      and e.collection_address=p.collection_address and e.token_id=p.token_id;
    insert into choghop_private.relay_events(run_id,actor_id,name,environment)
      values(p.run_id,p_actor_id,case when p.owner_actor=p_actor_id then 'owner_receipt_opened' else 'passport_opened' end,p.environment);
    return jsonb_build_object('entries',v_timeline,'entry',to_jsonb(p),'receipt',case when p.owner_actor=p_actor_id and p.owner_wallet=p_wallet then to_jsonb(p) else null end);
  end if;
  if p_operation='followup' then
    select * into r from choghop_private.relay_runs where id=(p_payload->>'run')::uuid;
    if not found then return jsonb_build_object('error','not_found'); end if;
    if r.actor_id<>p_actor_id or r.owner_wallet<>p_wallet then return jsonb_build_object('error','forbidden'); end if;
    if r.environment is distinct from p_payload->>'environment' then return jsonb_build_object('error','wrong_environment'); end if;
    if r.expedition<>'last-lantern/v1' then return jsonb_build_object('error','no_further_chapter'); end if;
    select * into p from choghop_private.passport_entries where run_id=r.id;
    if not found then return jsonb_build_object('error','complete_first'); end if;
    v_asset := regexp_replace(r.asset_id,':last-lantern/v1$',':returning-light/v1');
    select * into a from choghop_private.relay_assets where id=v_asset for update;
    if not found or a.owner_wallet is distinct from p_wallet or a.synced_at is null or a.synced_at<clock_timestamp()-interval '20 seconds' then
      return jsonb_build_object('error','ownership_unverified');
    end if;
    -- One continuation per recorded first chapter, serialized after its new asset.
    select * into r from choghop_private.relay_runs where id=r.id for update;
    select to_jsonb(n) into v_result from choghop_private.relay_runs n where n.previous_run_id=r.id;
    if v_result is not null then
      return choghop_private.choghop_relay_v1('load',p_actor_id,p_wallet,p_payload||jsonb_build_object('run',v_result->>'id'));
    end if;
    v_variant := case p.keeper_choice when 'direct' then 'last-lantern-02' else 'last-lantern-03' end;
    insert into choghop_private.relay_runs(id,actor_id,owner_wallet,asset_id,generation,environment,state,expedition,previous_run_id,memory_choice)
      values((p_payload->>'id')::uuid,p_actor_id,p_wallet,a.id,a.generation,r.environment,
        jsonb_build_object('variantId',v_variant,'revision',0,'stage','keeper'),'returning-light/v1',r.id,p.keeper_choice)
      returning to_jsonb(relay_runs.*) into v_result;
    insert into choghop_private.relay_events(run_id,actor_id,name,environment)
      values((v_result->>'id')::uuid,p_actor_id,'followup_started',r.environment);
    return v_result;
  end if;
  if p_operation='challenge' then
    select * into r from choghop_private.relay_runs where id=(p_payload->>'run')::uuid;
    p_payload := jsonb_set(p_payload,'{scope}',coalesce(p_payload->'scope','{}'::jsonb)||jsonb_build_object('expedition',r.expedition));
  end if;
  return choghop_private.choghop_relay_v1(p_operation,p_actor_id,p_wallet,p_payload);
end $$;
revoke all on function public.choghop_relay(text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.choghop_relay(text,uuid,text,jsonb) to service_role;
commit;
