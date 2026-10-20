begin;

create schema if not exists choghop_private;
revoke all on schema choghop_private from public, anon, authenticated;
grant usage on schema choghop_private to service_role;

create table choghop_private.practice_runs (
  id uuid primary key,
  actor_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  mode text not null default 'practice' check (mode = 'practice'),
  content_version text not null default 'last-lantern/v1',
  schema_version integer not null default 1 check (schema_version = 1),
  environment text not null check (environment in ('development', 'test', 'production')),
  revision integer not null default 0 check (revision >= 0),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default (clock_timestamp() + interval '2 hours'),
  closed_at timestamptz,
  attempt_window timestamptz not null default clock_timestamp(),
  attempt_count integer not null default 0 check (attempt_count between 0 and 12)
);
create index practice_expiry on choghop_private.practice_runs (expires_at);

create table choghop_private.practice_events (
  id bigint generated always as identity primary key,
  run_id uuid not null references choghop_private.practice_runs(id),
  actor_id uuid not null,
  revision integer not null,
  name text not null check (name in ('practice_started', 'practice_signal_prepared', 'practice_runner_started', 'practice_completed', 'practice_restarted')),
  content_version text not null,
  environment text not null check (environment in ('development', 'test', 'production')),
  mode text not null default 'practice' check (mode = 'practice'),
  assistance text not null default 'unknown' check (assistance = 'unknown'),
  incentive text not null default 'unknown' check (incentive = 'unknown'),
  source text not null default 'not_applicable' check (source = 'not_applicable'),
  seeded boolean not null default false check (seeded = false),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 2048),
  occurred_at timestamptz not null default clock_timestamp(),
  unique (run_id, revision)
);
create unique index practice_one_completion on choghop_private.practice_events(run_id) where name = 'practice_completed';
create index practice_event_time on choghop_private.practice_events (occurred_at);

alter table choghop_private.practice_runs enable row level security;
alter table choghop_private.practice_runs force row level security;
alter table choghop_private.practice_events enable row level security;
alter table choghop_private.practice_events force row level security;
revoke all on choghop_private.practice_runs, choghop_private.practice_events from public, anon, authenticated, service_role;
grant select, insert, update on choghop_private.practice_runs to service_role;
grant select, insert on choghop_private.practice_events to service_role;
revoke all on sequence choghop_private.practice_events_id_seq from public, anon, authenticated, service_role;
grant usage, select on sequence choghop_private.practice_events_id_seq to service_role;
create policy practice_server_runs on choghop_private.practice_runs for all to service_role using (true) with check (true);
create policy practice_server_read_events on choghop_private.practice_events for select to service_role using (true);
create policy practice_server_append_events on choghop_private.practice_events for insert to service_role with check (true);

create function public.choghop_practice_start(
  p_token_hash text, p_previous_token_hash text, p_run_id uuid, p_actor_id uuid, p_environment text
) returns jsonb language plpgsql security invoker set search_path = pg_catalog as $$
declare
  previous choghop_private.practice_runs;
  created choghop_private.practice_runs;
begin
  if p_previous_token_hash is not null then
    select * into previous from choghop_private.practice_runs where token_hash = p_previous_token_hash for update;
    if found and previous.closed_at is null then
      update choghop_private.practice_runs set closed_at = clock_timestamp(), revision = revision + 1, updated_at = clock_timestamp() where id = previous.id;
      insert into choghop_private.practice_events(run_id, actor_id, revision, name, content_version, environment)
        values(previous.id, previous.actor_id, previous.revision + 1, 'practice_restarted', previous.content_version, previous.environment);
    end if;
  end if;
  insert into choghop_private.practice_runs(id, actor_id, token_hash, environment, state)
    values(p_run_id, coalesce(previous.actor_id, p_actor_id), p_token_hash, p_environment,
      '{"run":{"variantId":"last-lantern-01","revision":0,"stage":"keeper"},"accepted":false}'::jsonb)
    returning * into created;
  insert into choghop_private.practice_events(run_id, actor_id, revision, name, content_version, environment)
    values(created.id, created.actor_id, 0, 'practice_started', created.content_version, created.environment);
  return to_jsonb(created) - 'token_hash';
end;
$$;

create function public.choghop_practice_load(p_token_hash text)
returns jsonb language sql security invoker set search_path = pg_catalog as $$
  select to_jsonb(r) - 'token_hash' from choghop_private.practice_runs r
  where r.token_hash = p_token_hash and r.closed_at is null and r.expires_at > clock_timestamp();
$$;

create function public.choghop_practice_commit(
  p_token_hash text, p_expected_revision integer, p_state jsonb, p_event text, p_payload jsonb, p_error text
) returns jsonb language plpgsql security invoker set search_path = pg_catalog as $$
declare
  current_run choghop_private.practice_runs;
  next_run choghop_private.practice_runs;
  previous_engine jsonb;
  next_engine jsonb;
begin
  select * into current_run from choghop_private.practice_runs where token_hash = p_token_hash for update;
  if not found or current_run.closed_at is not null or current_run.expires_at <= clock_timestamp() then
    return jsonb_build_object('error', 'session_expired', 'status', 410);
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    return jsonb_build_object('error', 'invalid_revision', 'status', 400);
  end if;
  if current_run.revision <> p_expected_revision then
    return jsonb_build_object('error', 'stale_revision', 'status', 409, 'record', to_jsonb(current_run) - 'token_hash');
  end if;
  if current_run.content_version <> 'last-lantern/v1' then
    return jsonb_build_object('error', 'incompatible_content', 'status', 503);
  end if;
  if p_event is distinct from 'practice_runner_started' then
    if current_run.attempt_window <= clock_timestamp() - interval '30 seconds' then
      current_run.attempt_count := 0;
      current_run.attempt_window := clock_timestamp();
    end if;
    if current_run.attempt_count >= 12 then
      return jsonb_build_object('error', 'too_many_attempts', 'status', 429);
    end if;
    update choghop_private.practice_runs set attempt_count = current_run.attempt_count + 1, attempt_window = current_run.attempt_window where id = current_run.id;
  end if;
  if p_error is not null then
    if p_error not in ('invalid_action', 'wrong_stage', 'incorrect_keeper', 'incorrect_runner', 'accept_ticket_first') then
      raise exception 'Invalid rejection code';
    end if;
    return jsonb_build_object('error', p_error, 'status', 422);
  end if;
  previous_engine := current_run.state->'run';
  next_engine := p_state->'run';
  if p_event = 'practice_signal_prepared' then
    if previous_engine->>'stage' <> 'keeper' or next_engine->>'stage' is distinct from 'runner'
      or p_state->>'accepted' is distinct from 'false'
      or next_engine->>'variantId' is distinct from previous_engine->>'variantId'
      or (next_engine->>'revision')::integer is distinct from (previous_engine->>'revision')::integer + 1 then raise exception 'Invalid preparation transition'; end if;
  elsif p_event = 'practice_runner_started' then
    if previous_engine->>'stage' <> 'runner' or current_run.state->>'accepted' <> 'false'
      or next_engine is distinct from previous_engine or p_state->>'accepted' is distinct from 'true' then raise exception 'Invalid handoff transition'; end if;
  elsif p_event = 'practice_completed' then
    if previous_engine->>'stage' <> 'runner' or current_run.state->>'accepted' <> 'true'
      or next_engine->>'stage' is distinct from 'complete' or p_state->>'accepted' is distinct from 'true'
      or next_engine->'restoration' is distinct from previous_engine->'keeperMark'
      or (next_engine - 'stage' - 'revision' - 'restoration') is distinct from (previous_engine - 'stage' - 'revision')
      or (next_engine->>'revision')::integer is distinct from (previous_engine->>'revision')::integer + 1 then raise exception 'Invalid completion transition'; end if;
  else
    raise exception 'Invalid practice event';
  end if;
  update choghop_private.practice_runs set state = p_state, revision = revision + 1, updated_at = clock_timestamp()
    where id = current_run.id returning * into next_run;
  insert into choghop_private.practice_events(run_id, actor_id, revision, name, content_version, environment, payload)
    values(next_run.id, next_run.actor_id, next_run.revision, p_event, next_run.content_version, next_run.environment, p_payload);
  return jsonb_build_object('record', to_jsonb(next_run) - 'token_hash');
end;
$$;

revoke all on function public.choghop_practice_start(text,text,uuid,uuid,text) from public, anon, authenticated, service_role;
revoke all on function public.choghop_practice_load(text) from public, anon, authenticated, service_role;
revoke all on function public.choghop_practice_commit(text,integer,jsonb,text,jsonb,text) from public, anon, authenticated, service_role;
grant execute on function public.choghop_practice_start(text,text,uuid,uuid,text) to service_role;
grant execute on function public.choghop_practice_load(text) to service_role;
grant execute on function public.choghop_practice_commit(text,integer,jsonb,text,jsonb,text) to service_role;

commit;
