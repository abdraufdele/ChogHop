import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { createPracticeStore } from '../src/practice/store.server';

const mark = { glyph: 'star', bearing: 'south' };
const prepare = { type: 'prepare', treatment: 'reflected', mark };

describe('isolated server-owned practice', () => {
  it('runs chart, ticket, Runner and sample passport without a wallet; refresh resumes', () => {
    const store = createPracticeStore();
    const { id } = store.start();
    expect(store.submit(id, 0, prepare)).toMatchObject({ ok: true, snapshot: { stage: 'handoff', mode: 'practice', revision: 1 } });
    expect(store.resume(id)).toMatchObject({ stage: 'handoff' });
    expect(store.submit(id, 1, { type: 'restore', mark })).toMatchObject({ ok: false, error: 'accept_ticket_first' });
    expect(store.submit(id, 1, { type: 'accept_ticket' })).toMatchObject({ ok: true, snapshot: { stage: 'runner' } });
    const view = store.resume(id);
    if (view?.stage !== 'runner') throw new Error('Runner unavailable');
    expect(Object.keys(view.puzzle)).not.toContain('keeperMark');
    expect(store.submit(id, 1, { type: 'restore', mark })).toMatchObject({ ok: true, snapshot: { stage: 'complete', revision: 2, mode: 'practice' } });
    expect(store.submit(id, 1, { type: 'restore', mark })).toMatchObject({ ok: false, error: 'stale_revision' });
    expect(store.resume(id)?.stage).toBe('complete');
  });

  it('isolates sessions and rejects client completion flags and altered answers', () => {
    const store = createPracticeStore();
    const first = store.start();
    const second = store.start();
    expect(store.submit(first.id, 0, { type: 'complete', completed: true })).toMatchObject({ ok: false, error: 'invalid_action' });
    expect(store.submit(first.id, 0, { ...prepare, mark: { glyph: 'sun', bearing: 'north' }, completed: true })).toMatchObject({ ok: false, error: 'incorrect_keeper' });
    store.submit(first.id, 0, prepare);
    expect(store.resume(second.id)?.stage).toBe('keeper');
    expect(store.submit('invented-id', 0, prepare)).toMatchObject({ ok: false, status: 410 });
  });

  it('accepts one of two simultaneous revision proposals within this process', async () => {
    const store = createPracticeStore();
    const { id } = store.start();
    const results = await Promise.all([0, 1].map(() => Promise.resolve().then(() => store.submit(id, 0, prepare))));
    expect(results.filter(r => r.ok)).toHaveLength(1);
    expect(results.filter(r => !r.ok)).toEqual([expect.objectContaining({ error: 'stale_revision' })]);
  });

  it('expires, resets and bounds practice memory without touching live records', () => {
    let clock = 100;
    const store = createPracticeStore({ now: () => clock, ttlMs: 50, capacity: 2 });
    const first = store.start();
    store.start();
    const third = store.start();
    expect(store.resume(first.id)).toBeUndefined();
    store.remove(third.id);
    expect(store.resume(third.id)).toBeUndefined();
    const next = store.start();
    clock = 150;
    expect(store.submit(next.id, 0, prepare)).toMatchObject({ status: 410 });
  });

  it('rate limits guesses without changing puzzle state and recovers after the window', () => {
    let clock = 100;
    const store = createPracticeStore({ now: () => clock });
    const { id } = store.start();
    for (let i = 0; i < 12; i++) store.submit(id, 0, {});
    expect(store.submit(id, 0, prepare)).toMatchObject({ status: 429 });
    expect(store.resume(id)?.revision).toBe(0);
    clock += 30_000;
    expect(store.submit(id, 0, prepare).ok).toBe(true);
  });
});
