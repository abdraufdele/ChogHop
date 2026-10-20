import { applyAction, createRun } from '../puzzle/engine';
import type { Run } from '../puzzle/engine';
import { isMark, isRecord, sameMark } from '../puzzle/grammar';

export const CONTENT_VERSION = 'last-lantern/v1';
export type SavedState = Readonly<{ run: Run; accepted: boolean }>;
export type SavedPractice = Readonly<{
  id: string; actorId: string; revision: number; expiresAt: number;
  environment: 'development' | 'test' | 'production'; state: SavedState;
}>;
export class IncompatibleRecord extends Error {
  constructor() { super('Saved practice cannot be safely interpreted'); }
}

/** Reconstruct canonical state with versioned rules instead of trusting stored completion flags. */
export function decodePractice(value: unknown): SavedPractice {
  if (!isRecord(value) || value.content_version !== CONTENT_VERSION || value.schema_version !== 1 ||
      value.mode !== 'practice' || typeof value.id !== 'string' || typeof value.actor_id !== 'string' ||
      typeof value.expires_at !== 'string' || !Number.isFinite(Date.parse(value.expires_at)) ||
      !['development', 'test', 'production'].includes(String(value.environment)) ||
      !isRecord(value.state) || typeof value.state.accepted !== 'boolean' || !isRecord(value.state.run)) throw new IncompatibleRecord();
  const raw = value.state.run;
  let run: Run;
  try {
    if (typeof raw.variantId !== 'string') throw new IncompatibleRecord();
    run = createRun(raw.variantId);
    if (raw.stage !== 'keeper') {
      if (!isMark(raw.keeperMark) || !isMark(raw.signal) || (raw.treatment !== 'direct' && raw.treatment !== 'reflected')) throw new IncompatibleRecord();
      const prepared = applyAction(run, 0, { type: 'prepare', mark: raw.keeperMark, treatment: raw.treatment });
      if (!prepared.ok || prepared.run.stage !== 'runner' || !sameMark(prepared.run.signal, raw.signal)) throw new IncompatibleRecord();
      run = prepared.run;
      if (raw.stage === 'complete') {
        const completed = applyAction(run, 1, { type: 'restore', mark: raw.restoration });
        if (!completed.ok) throw new IncompatibleRecord();
        run = completed.run;
      }
    }
  } catch { throw new IncompatibleRecord(); }
  const accepted = value.state.accepted;
  const expectedRevision = run.stage === 'keeper' ? 0 : run.stage === 'complete' ? 3 : accepted ? 2 : 1;
  if (raw.stage !== run.stage || raw.revision !== run.revision || value.revision !== expectedRevision ||
      (run.stage === 'keeper' && accepted) || (run.stage === 'complete' && !accepted)) throw new IncompatibleRecord();
  return {
    id: value.id, actorId: value.actor_id, revision: expectedRevision, expiresAt: Date.parse(value.expires_at),
    environment: value.environment as SavedPractice['environment'], state: { run, accepted },
  };
}
