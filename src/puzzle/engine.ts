import {
  CHART_RULE, GLYPHS, RUNNER_RULE, copyMark, isMark, isRecord, sameMark, transform, turnBearing,
} from './grammar';
import type { ChartClue, Example, Mark, Slot, Treatment } from './grammar';
import { getVariant } from './variants';
import type { Variant } from './variants';

type BaseRun = Readonly<{ variantId: string; revision: number }>;
export type KeeperRun = BaseRun & Readonly<{ stage: 'keeper' }>;
export type RunnerRun = BaseRun & Readonly<{
  stage: 'runner'; keeperMark: Mark; treatment: Treatment; signal: Mark;
}>;
export type CompleteRun = Omit<RunnerRun, 'stage'> & Readonly<{ stage: 'complete'; restoration: Mark }>;
export type Run = KeeperRun | RunnerRun | CompleteRun;
export type KeeperView = Readonly<{
  revision: number; rule: string; missingSlot: Slot; clues: readonly [ChartClue, ChartClue];
}>;
export type RunnerView = Readonly<{
  revision: number; rule: string; signal: Mark; examples: readonly Example[]; lanterns: typeof GLYPHS;
}>;
type Prepare = Readonly<{ type: 'prepare'; mark: Mark; treatment: Treatment }>;
type Restore = Readonly<{ type: 'restore'; mark: Mark }>;
type Action = Prepare | Restore;
export type PuzzleEvent =
  | Readonly<{ type: 'signal_prepared'; revision: number; mark: Mark; treatment: Treatment; signal: Mark }>
  | Readonly<{ type: 'light_restored'; revision: number; mark: Mark }>;
export type ActionResult =
  | Readonly<{ ok: true; run: Run; event: PuzzleEvent }>
  | Readonly<{ ok: false; code: 'invalid_action' | 'invalid_revision' | 'stale_revision' | 'wrong_stage' | 'incorrect_keeper' | 'incorrect_runner' }>;

/** Trusted state only: persist/authorize on the server; never accept a browser-supplied Run. */
export function createRun(variantId: string): KeeperRun {
  getVariant(variantId);
  return { variantId, revision: 0, stage: 'keeper' };
}

export function chartFor(variant: Variant, revision = 0): KeeperView {
  const clue = (slot: Slot): ChartClue => ({
    slot, mark: { glyph: variant.glyphs[slot], bearing: turnBearing(variant.firstBearing, slot) },
  });
  const visible = ([0, 1, 2] as const).filter(slot => slot !== variant.missingSlot);
  return {
    revision, rule: CHART_RULE, missingSlot: variant.missingSlot,
    clues: [clue(visible[0]!), clue(visible[1]!)],
  };
}

export function keeperView(run: Run): KeeperView {
  if (run.stage !== 'keeper') throw new Error('Keeper view unavailable');
  return chartFor(getVariant(run.variantId), run.revision);
}

export function transmissionFor(variant: Variant, mark: Mark, treatment: Treatment, revision = 1): RunnerView {
  const rule = variant.rules[treatment];
  return {
    revision, rule: RUNNER_RULE, signal: transform(mark, rule), lanterns: GLYPHS,
    examples: variant.exampleLanterns.map(lantern => ({ signal: transform(lantern, rule), lantern: copyMark(lantern) })),
  };
}

/** Role projection omits chart clues, the chosen treatment and the target lantern. */
export function runnerView(run: Run): RunnerView {
  if (run.stage !== 'runner') throw new Error('Runner view unavailable');
  const view = transmissionFor(getVariant(run.variantId), run.keeperMark, run.treatment, run.revision);
  return { ...view, signal: copyMark(run.signal) };
}

function isAction(value: unknown): value is Action {
  if (!isRecord(value) || !isMark(value.mark)) return false;
  return value.type === 'restore' || (value.type === 'prepare' && (value.treatment === 'direct' || value.treatment === 'reflected'));
}

/** Pure proposal. Revision checking here is not a database lock or a permission check. */
export function applyAction(run: Run, expectedRevision: number, action: unknown): ActionResult {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) return { ok: false, code: 'invalid_revision' };
  if (expectedRevision !== run.revision) return { ok: false, code: 'stale_revision' };
  if (!isAction(action)) return { ok: false, code: 'invalid_action' };
  const variant = getVariant(run.variantId);
  if (action.type === 'prepare') {
    if (run.stage !== 'keeper') return { ok: false, code: 'wrong_stage' };
    const answer: Mark = {
      glyph: variant.glyphs[variant.missingSlot],
      bearing: turnBearing(variant.firstBearing, variant.missingSlot),
    };
    if (!sameMark(action.mark, answer)) return { ok: false, code: 'incorrect_keeper' };
    const signal = transform(answer, variant.rules[action.treatment]);
    const revision = run.revision + 1;
    return {
      ok: true,
      run: { ...run, revision, stage: 'runner', keeperMark: copyMark(answer), treatment: action.treatment, signal },
      event: { type: 'signal_prepared', revision, treatment: action.treatment, mark: copyMark(answer), signal: copyMark(signal) },
    };
  }
  if (run.stage !== 'runner') return { ok: false, code: 'wrong_stage' };
  if (!sameMark(action.mark, run.keeperMark)) return { ok: false, code: 'incorrect_runner' };
  const revision = run.revision + 1;
  return {
    ok: true,
    run: { ...run, revision, stage: 'complete', restoration: copyMark(action.mark) },
    event: { type: 'light_restored', revision, mark: copyMark(action.mark) },
  };
}
