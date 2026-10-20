import 'server-only';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { applyAction, keeperView, runnerView } from '../puzzle/engine';
import { isRecord } from '../puzzle/grammar';
import { CONTENT_VERSION, decodePractice } from '../persistence/record';
import type { SavedPractice, SavedState } from '../persistence/record';
import { StorageUnavailable, supabaseRpc } from '../persistence/rpc.server';
import type { Rpc } from '../persistence/rpc.server';
import type { PracticeSnapshot } from './types';

type Failure = { ok: false; error: string; status: number; snapshot?: PracticeSnapshot };
type Success = { ok: true; snapshot: PracticeSnapshot };

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const validToken = (token: string) => /^[A-Za-z0-9_-]{43}$/.test(token);

function project(record: SavedPractice): PracticeSnapshot {
  const { run, accepted } = record.state;
  const base = { mode: 'practice' as const, runId: record.id, contentVersion: CONTENT_VERSION, expiresAt: record.expiresAt, revision: record.revision };
  if (run.stage === 'keeper') return { ...base, stage: 'keeper', puzzle: { ...keeperView(run), revision: record.revision } };
  if (run.stage === 'complete') return {
    ...base, stage: 'complete', restoration: { ...run.restoration }, signal: { ...run.signal }, treatment: run.treatment,
  };
  if (!accepted) return {
    ...base, stage: 'handoff', prepared: { ...run.keeperMark }, signal: { ...run.signal }, treatment: run.treatment,
  };
  return { ...base, stage: 'runner', puzzle: { ...runnerView(run), revision: record.revision } };
}

/** Each move is validated here, then committed with its event by one locked Postgres RPC. */
export function createPracticeStore(rpc: Rpc = supabaseRpc, environment: SavedPractice['environment'] = 'development') {
  const load = async (id: string) => {
    if (!validToken(id)) return undefined;
    const result = await rpc('choghop_practice_load', { p_token_hash: tokenHash(id) });
    return result === null ? undefined : decodePractice(result);
  };
  return {
    async start(previousId?: string) {
      const id = randomBytes(32).toString('base64url');
      const result = await rpc('choghop_practice_start', {
        p_token_hash: tokenHash(id), p_previous_token_hash: previousId && validToken(previousId) ? tokenHash(previousId) : null,
        p_run_id: randomUUID(), p_actor_id: randomUUID(), p_environment: environment,
      });
      return { id, snapshot: project(decodePractice(result)) };
    },
    async resume(id: string) { const record = await load(id); return record ? project(record) : undefined; },
    async submit(id: string, revision: unknown, action: unknown): Promise<Success | Failure> {
      if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0) {
        return { ok: false, error: 'invalid_revision', status: 400 };
      }
      const record = await load(id);
      if (!record) return { ok: false, error: 'session_expired', status: 410 };
      if (revision !== record.revision) return { ok: false, error: 'stale_revision', status: 409, snapshot: project(record) };
      const { run, accepted } = record.state;
      let state: SavedState | null = null;
      let event: string | null = null;
      let error: string | null = null;
      let payload: Record<string, unknown> = {};
      if (isRecord(action) && action.type === 'accept_ticket') {
        if (run.stage !== 'runner' || accepted) error = 'wrong_stage';
        else { state = { run, accepted: true }; event = 'practice_runner_started'; }
      } else if (run.stage === 'runner' && !accepted) error = 'accept_ticket_first';
      else {
        const result = applyAction(run, run.revision, action);
        if (!result.ok) error = result.code;
        else {
          state = { run: result.run, accepted };
          event = result.event.type === 'signal_prepared' ? 'practice_signal_prepared' : 'practice_completed';
          payload = result.event.type === 'signal_prepared'
            ? { treatment: result.event.treatment, mark: result.event.mark, signal: result.event.signal }
            : { mark: result.event.mark };
        }
      }
      const result = await rpc('choghop_practice_commit', {
        p_token_hash: tokenHash(id), p_expected_revision: revision, p_state: state,
        p_event: event, p_payload: payload, p_error: error,
      });
      if (!isRecord(result)) throw new StorageUnavailable();
      if (typeof result.error === 'string' && typeof result.status === 'number') return {
        ok: false, error: result.error, status: result.status,
        ...(result.record ? { snapshot: project(decodePractice(result.record)) } : {}),
      };
      return { ok: true, snapshot: project(decodePractice(result.record)) };
    },
  };
}

const environment = process.env.CHOGHOP_ENVIRONMENT ?? (process.env.NODE_ENV === 'production' ? 'production' : 'development');
export const practiceStore = createPracticeStore(supabaseRpc,
  environment === 'test' || environment === 'production' ? environment : 'development');
