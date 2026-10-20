import 'server-only';
import { randomUUID } from 'node:crypto';
import { applyAction, createRun, keeperView, runnerView } from '../puzzle/engine';
import type { Run } from '../puzzle/engine';
import { isRecord } from '../puzzle/grammar';
import type { PracticeSnapshot } from './types';

type Session = { run: Run; accepted: boolean; expiresAt: number; attempts: number[] };
type Failure = { ok: false; error: string; status: number; snapshot?: PracticeSnapshot };
type Success = { ok: true; snapshot: PracticeSnapshot };

function project(session: Session): PracticeSnapshot {
  const { run, expiresAt } = session;
  const base = { mode: 'practice' as const, expiresAt, revision: run.revision };
  if (run.stage === 'keeper') return { ...base, stage: 'keeper', puzzle: keeperView(run) };
  if (run.stage === 'complete') return {
    ...base, stage: 'complete', restoration: { ...run.restoration }, signal: { ...run.signal }, treatment: run.treatment,
  };
  if (!session.accepted) return {
    ...base, stage: 'handoff', prepared: { ...run.keeperMark }, signal: { ...run.signal }, treatment: run.treatment,
  };
  return { ...base, stage: 'runner', puzzle: runnerView(run) };
}

/** Ephemeral practice only. Never use this process-local store for live runs or permissions. */
export function createPracticeStore(options: { now?: () => number; ttlMs?: number; capacity?: number } = {}) {
  const now = options.now ?? Date.now;
  const ttl = options.ttlMs ?? 2 * 60 * 60 * 1000;
  const capacity = options.capacity ?? 256;
  const sessions = new Map<string, Session>();
  const read = (id: string): Session | undefined => {
    const session = sessions.get(id);
    if (session && session.expiresAt > now()) return session;
    sessions.delete(id);
  };
  return {
    start() {
      for (const id of sessions.keys()) read(id);
      if (sessions.size >= capacity) sessions.delete(sessions.keys().next().value!);
      const id = randomUUID();
      const session: Session = { run: createRun('last-lantern-01'), accepted: false, expiresAt: now() + ttl, attempts: [] };
      sessions.set(id, session);
      return { id, snapshot: project(session) };
    },
    resume(id: string) { const session = read(id); return session ? project(session) : undefined; },
    remove(id: string) { sessions.delete(id); },
    submit(id: string, revision: unknown, action: unknown): Success | Failure {
      const session = read(id);
      if (!session) return { ok: false, error: 'session_expired', status: 410 };
      if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0) {
        return { ok: false, error: 'invalid_revision', status: 400 };
      }
      if (revision !== session.run.revision) return { ok: false, error: 'stale_revision', status: 409, snapshot: project(session) };
      if (isRecord(action) && action.type === 'accept_ticket') {
        if (session.run.stage !== 'runner' || session.accepted) return { ok: false, error: 'wrong_stage', status: 409 };
        session.accepted = true;
        return { ok: true, snapshot: project(session) };
      }
      if (session.run.stage === 'runner' && !session.accepted) return { ok: false, error: 'accept_ticket_first', status: 409 };
      session.attempts = session.attempts.filter(time => time > now() - 30_000);
      if (session.attempts.length >= 12) return { ok: false, error: 'too_many_attempts', status: 429 };
      session.attempts.push(now());
      const result = applyAction(session.run, revision, action);
      if (!result.ok) return { ok: false, error: result.code, status: 422 };
      session.run = result.run;
      return { ok: true, snapshot: project(session) };
    },
  };
}

const globalPractice = globalThis as typeof globalThis & { choghopPractice?: ReturnType<typeof createPracticeStore> };
export const practiceStore = globalPractice.choghopPractice ??= createPracticeStore();
