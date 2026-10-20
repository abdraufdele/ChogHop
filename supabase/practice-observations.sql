-- Run as an authorized database operator. Practice is never live traction.
-- Actor IDs represent anonymous browser continuity, not verified unique people.
with outcomes as (
  select r.id, r.actor_id, r.expires_at, r.closed_at, c.occurred_at as completed_at,
    extract(epoch from (c.occurred_at - r.created_at)) as server_elapsed_seconds
  from choghop_private.practice_runs r
  left join choghop_private.practice_events c on c.run_id = r.id and c.name = 'practice_completed'
  where r.environment = 'production' and r.mode = 'practice'
)
select count(*) as started_runs,
  count(distinct actor_id) as anonymous_actor_ids,
  count(completed_at) as completed_runs,
  count(*) filter (where completed_at is null and closed_at is null and expires_at > clock_timestamp()) as pending_runs,
  count(*) filter (where completed_at is null and (closed_at is not null or expires_at <= clock_timestamp())) as ended_unfinished_runs,
  percentile_cont(0.5) within group (order by server_elapsed_seconds) as median_server_elapsed_seconds
from outcomes;

-- Assistance and incentives are explicitly unknown until a pilot records them.
-- Elapsed server time includes background time; it is not active play time.
select assistance, incentive, source, count(*) as completed_practice_runs
from choghop_private.practice_events
where environment = 'production' and mode = 'practice' and name = 'practice_completed'
group by assistance, incentive, source;
