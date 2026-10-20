import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createPracticeStore } from '../src/practice/store.server';
import { openTestPostgres } from '../e2e/support/postgres.mjs';
import { IncompatibleRecord } from '../src/persistence/record';

const mark = { glyph: 'star', bearing: 'south' };
const prepare = { type: 'prepare', treatment: 'reflected', mark };
let database: Awaited<ReturnType<typeof openTestPostgres>>;
let store: ReturnType<typeof createPracticeStore>;
beforeAll(async () => { database = await openTestPostgres(undefined); store = createPracticeStore(database.rpc, 'test'); }, 30_000);
afterAll(async () => { await database?.db.close(); });

describe('persisted server-owned practice', () => {
  it('restores every stage from a fresh store instance and records one ordered event per transition', async () => {
    const { id, snapshot } = await store.start();
    expect(await store.submit(id, 0, prepare)).toMatchObject({ ok: true, snapshot: { stage: 'handoff', revision: 1 } });
    const anotherWorker = createPracticeStore(database.rpc, 'test');
    expect(await anotherWorker.resume(id)).toMatchObject({ stage: 'handoff', runId: snapshot.runId });
    expect(await anotherWorker.submit(id, 1, { type: 'restore', mark })).toMatchObject({ ok: false, error: 'accept_ticket_first' });
    expect(await anotherWorker.submit(id, 1, { type: 'accept_ticket' })).toMatchObject({ ok: true, snapshot: { stage: 'runner', revision: 2 } });
    const view = await store.resume(id);
    if (view?.stage !== 'runner') throw new Error('Runner unavailable');
    expect(Object.keys(view.puzzle)).not.toContain('keeperMark');
    expect(await store.submit(id, 2, { type: 'restore', mark })).toMatchObject({ ok: true, snapshot: { stage: 'complete', revision: 3 } });
    expect(await store.resume(id)).toMatchObject({ stage: 'complete', runId: snapshot.runId });
    const events = await database.db.query<{ name: string; revision: number; mode: string; environment: string; assistance: string }>(
      'select name, revision, mode, environment, assistance from choghop_private.practice_events where run_id = $1 order by revision', [snapshot.runId]);
    expect(events.rows.map(e => [e.name, e.revision])).toEqual([
      ['practice_started', 0], ['practice_signal_prepared', 1], ['practice_runner_started', 2], ['practice_completed', 3],
    ]);
    expect(events.rows.every(e => e.mode === 'practice' && e.environment === 'test' && e.assistance === 'unknown')).toBe(true);
  });

  it('isolates bearer sessions, hashes the token and ignores forged completion and analytics context', async () => {
    const first = await store.start();
    const second = await store.start();
    expect(await store.submit(first.id, 0, { type: 'complete', completed: true, environment: 'production' })).toMatchObject({ ok: false, error: 'invalid_action' });
    expect(await store.submit(first.id, 0, { ...prepare, mark: { glyph: 'sun', bearing: 'north' } })).toMatchObject({ ok: false, error: 'incorrect_keeper' });
    await store.submit(first.id, 0, prepare);
    expect((await store.resume(second.id))?.stage).toBe('keeper');
    expect(await store.resume('A'.repeat(43))).toBeUndefined();
    expect(await store.submit('invented-id', 0, prepare)).toMatchObject({ ok: false, status: 410 });
    const rows = await database.db.query<{ token_hash: string; state: unknown }>('select token_hash, state from choghop_private.practice_runs where id=$1', [first.snapshot.runId]);
    expect(rows.rows[0]!.token_hash).toBe(createHash('sha256').update(first.id).digest('hex'));
    expect(JSON.stringify(rows.rows)).not.toContain(first.id);
  });

  it('allows one winning proposal across independent stores and one completion event', async () => {
    const { id, snapshot } = await store.start();
    const other = createPracticeStore(database.rpc, 'test');
    const preparationRace = await Promise.all([store.submit(id, 0, prepare), other.submit(id, 0, prepare)]);
    expect(preparationRace.filter(result => result.ok)).toHaveLength(1);
    expect(preparationRace.filter(result => !result.ok)).toEqual([expect.objectContaining({ error: 'stale_revision' })]);
    await store.submit(id, 1, { type: 'accept_ticket' });
    const completions = await Promise.all([store.submit(id, 2, { type: 'restore', mark }), other.submit(id, 2, { type: 'restore', mark })]);
    expect(completions.filter(result => result.ok)).toHaveLength(1);
    expect(await store.submit(id, 3, { type: 'restore', mark })).toMatchObject({ ok: false, error: 'wrong_stage' });
    const events = await database.db.query('select * from choghop_private.practice_events where run_id=$1 and name=$2', [snapshot.runId, 'practice_completed']);
    expect(events.rows).toHaveLength(1);
  });

  it('expires according to the database clock and restarts without deleting prior history or changing the pseudonym', async () => {
    const first = await store.start();
    await database.db.query("update choghop_private.practice_runs set expires_at=clock_timestamp()-interval '1 second' where id=$1", [first.snapshot.runId]);
    expect(await store.submit(first.id, 0, prepare)).toMatchObject({ status: 410 });
    const next = await store.start(first.id);
    expect(await store.resume(first.id)).toBeUndefined();
    const rows = await database.db.query<{ actor_id: string }>('select actor_id from choghop_private.practice_runs where id in ($1,$2)', [first.snapshot.runId, next.snapshot.runId]);
    expect(new Set(rows.rows.map(row => row.actor_id)).size).toBe(1);
    const events = await database.db.query('select * from choghop_private.practice_events where run_id=$1 order by revision', [first.snapshot.runId]);
    expect(events.rows).toHaveLength(2);
  });

  it('persists attempt limits across workers and rejects stale and malformed revisions', async () => {
    const { id, snapshot } = await store.start();
    for (let i = 0; i < 12; i++) await createPracticeStore(database.rpc, 'test').submit(id, 0, {});
    expect(await store.submit(id, 0, prepare)).toMatchObject({ status: 429 });
    expect((await store.resume(id))?.revision).toBe(0);
    await database.db.query("update choghop_private.practice_runs set attempt_window=clock_timestamp()-interval '31 seconds' where id=$1", [snapshot.runId]);
    expect((await store.submit(id, 0, prepare)).ok).toBe(true);
    expect(await store.submit(id, 0, prepare)).toMatchObject({ error: 'stale_revision' });
    expect(await store.submit(id, NaN, prepare)).toMatchObject({ error: 'invalid_revision' });
  });

  it('rolls back state and revision if event insertion fails', async () => {
    const { id, snapshot } = await store.start();
    await database.db.query("insert into choghop_private.practice_events(run_id,actor_id,revision,name,content_version,environment) select id,actor_id,1,'practice_signal_prepared',content_version,environment from choghop_private.practice_runs where id=$1", [snapshot.runId]);
    await expect(store.submit(id, 0, prepare)).rejects.toThrow();
    expect(await store.resume(id)).toMatchObject({ stage: 'keeper', revision: 0 });
    const rows = await database.db.query<{ attempt_count: number }>('select attempt_count from choghop_private.practice_runs where id=$1', [snapshot.runId]);
    expect(rows.rows[0]!.attempt_count).toBe(0);
  });

  it('fails closed for unsupported content or corrupted persisted signals without overwriting the record', async () => {
    const first = await store.start();
    await database.db.query("update choghop_private.practice_runs set content_version='future/v2' where id=$1", [first.snapshot.runId]);
    await expect(store.resume(first.id)).rejects.toBeInstanceOf(IncompatibleRecord);
    const second = await store.start();
    await store.submit(second.id, 0, prepare);
    await database.db.query("update choghop_private.practice_runs set state=jsonb_set(state,'{run,signal,glyph}','\"star\"') where id=$1", [second.snapshot.runId]);
    await expect(store.resume(second.id)).rejects.toBeInstanceOf(IncompatibleRecord);
  });

  it.each(['anon', 'authenticated'])('denies %s access to rows, events and privileged RPCs', async role => {
    await expect(database.db.transaction(async tx => {
      await tx.exec(`set local role ${role}`);
      await tx.query('select * from choghop_private.practice_runs');
    })).rejects.toThrow(/permission denied/);
    await expect(database.db.transaction(async tx => {
      await tx.exec(`set local role ${role}`);
      await tx.query("select public.choghop_practice_load(repeat('a',64))");
    })).rejects.toThrow(/permission denied/);
  });

  it('enforces RLS even if a nonserver role accidentally receives table grants', async () => {
    await database.db.exec('create role rls_probe nologin; grant usage on schema choghop_private to rls_probe; grant select,insert,update on choghop_private.practice_runs to rls_probe;');
    const rows = await database.db.transaction(async tx => {
      await tx.exec('set local role rls_probe');
      return tx.query('select * from choghop_private.practice_runs');
    });
    expect(rows.rows).toEqual([]);
    await expect(database.db.transaction(async tx => {
      await tx.exec('set local role rls_probe');
      await tx.query("insert into choghop_private.practice_runs(id,actor_id,token_hash,environment,state) values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',repeat('f',64),'test','{}')");
    })).rejects.toThrow(/row-level security/);
  });

  it('does not let the service role edit or delete product events', async () => {
    for (const statement of ['delete from choghop_private.practice_events', "update choghop_private.practice_events set name='practice_started'"]) {
      await expect(database.db.transaction(async tx => { await tx.exec('set local role service_role'); await tx.query(statement); })).rejects.toThrow(/permission denied/);
    }
  });

  it('excludes test runs from the published aggregate observation queries', async () => {
    const statements = await readFile(new URL('../supabase/practice-observations.sql', import.meta.url), 'utf8');
    const results = await database.db.exec(statements);
    expect(String(results[0]!.rows[0]!.started_runs)).toBe('0');
    expect(results[1]!.rows).toEqual([]);
  });
});
