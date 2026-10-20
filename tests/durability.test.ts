import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { openTestPostgres } from '../e2e/support/postgres.mjs';
import { createPracticeStore } from '../src/practice/store.server';

it('restores the same prepared run and revision in a separate process after the database is closed', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'choghop-postgres-'));
  const database = await openTestPostgres(directory);
  try {
    const store = createPracticeStore(database.rpc, 'test');
    const started = await store.start();
    await store.submit(started.id, 0, { type: 'prepare', mark: { glyph: 'star', bearing: 'south' }, treatment: 'reflected' });
    await database.db.close();
    const result = spawnSync(process.execPath, ['e2e/support/read-persisted.mjs'], {
      cwd: process.cwd(), encoding: 'utf8', timeout: 30_000,
      input: JSON.stringify({ directory, tokenHash: createHash('sha256').update(started.id).digest('hex') }),
    });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ id: started.snapshot.runId, revision: 1, state: { run: { stage: 'runner', treatment: 'reflected' }, accepted: false } });
  } finally {
    if (!database.db.closed) await database.db.close();
    const target = resolve(directory);
    if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith('choghop-postgres-')) throw new Error('Unexpected test directory');
    await rm(target, { recursive: true });
  }
}, 60_000);
