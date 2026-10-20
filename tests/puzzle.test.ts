import { describe, expect, it } from 'vitest';
import {
  VARIANTS, GLYPHS, BEARINGS, TREATMENTS, createRun, keeperView,
  runnerView, applyAction, solveKeeper, solveRunner, proveVariant,
} from '../src/puzzle/index';
import type { Run, Mark, Treatment, RunnerView } from '../src/puzzle/index';

const first = VARIANTS[0];

function prepare(variantId: string = first.id, treatment: Treatment = 'direct') {
  const run = createRun(variantId);
  const answers = solveKeeper(keeperView(run));
  expect(answers).toHaveLength(1);
  const mark = answers[0]!;
  const result = applyAction(run, 0, { type: 'prepare', mark, treatment });
  if (!result.ok || result.run.stage !== 'runner') throw new Error('Preparation failed');
  return { run: result.run, mark, result };
}

describe('authored chart grammar', () => {
  it('deduces the missing glyph and arrow from two visible clues', () => {
    const view = keeperView(createRun(first.id));
    expect(view.clues).toEqual([
      { slot: 0, mark: { glyph: 'sun', bearing: 'north' } },
      { slot: 1, mark: { glyph: 'moon', bearing: 'east' } },
    ]);
    expect(view.missingSlot).toBe(2);
    expect(solveKeeper(view)).toEqual([{ glyph: 'star', bearing: 'south' }]);
    expect(JSON.stringify(view)).not.toContain('answer');
  });

  it('finds no solution for contradictory clues', () => {
    const view = keeperView(createRun(first.id));
    expect(solveKeeper({ ...view, clues: [view.clues[0], { slot: 1, mark: { glyph: 'sun', bearing: 'east' } }] })).toEqual([]);
    expect(solveKeeper({ ...view, clues: [view.clues[0], { slot: 1, mark: { glyph: 'moon', bearing: 'west' } }] })).toEqual([]);
  });

  it('rejects malformed chart structure instead of assuming an answer', () => {
    const view = keeperView(createRun(first.id));
    expect(solveKeeper({ ...view, missingSlot: 0 })).toEqual([]);
    expect(solveKeeper({ ...view, clues: [view.clues[0], view.clues[0]] })).toEqual([]);
  });

  it('has distinct authored configurations and covers all missing slots and bearings', () => {
    expect(new Set(VARIANTS.map(v => v.id)).size).toBe(VARIANTS.length);
    const views = VARIANTS.map(v => keeperView(createRun(v.id)));
    expect(new Set(views.map(v => JSON.stringify(v))).size).toBe(VARIANTS.length);
    expect(new Set(views.map(v => v.missingSlot))).toEqual(new Set([0, 1, 2]));
    expect(new Set(views.flatMap(v => solveKeeper(v).map(m => m.bearing)))).toEqual(new Set(BEARINGS));
  });
});

describe.each(TREATMENTS)('%s signal', treatment => {
  it('transforms the prepared mark with a concrete observable result', () => {
    const { run } = prepare(first.id, treatment);
    expect(runnerView(run).signal).toEqual(treatment === 'direct'
      ? { glyph: 'sun', bearing: 'west' }
      : { glyph: 'moon', bearing: 'south' });
  });

  it.each(VARIANTS)('proves $id solvable from public evidence and completes both roles', variant => {
    const proof = proveVariant(variant, treatment);
    expect(proof.keeperSolutions).toHaveLength(1);
    expect(proof.runnerSolutions).toEqual(proof.keeperSolutions);
    expect(proof.consistentRules).toBe(1);
    expect(proof.solvable).toBe(true);

    const { run, mark, result } = prepare(variant.id, treatment);
    expect(result.event).toEqual({ type: 'signal_prepared', revision: 1, treatment, mark, signal: run.signal });
    const view = runnerView(run);
    expect(view.examples).toHaveLength(2);
    expect(Object.keys(view).sort()).toEqual(['examples', 'lanterns', 'revision', 'rule', 'signal']);
    expect(solveRunner(view)).toEqual([mark]);

    const completion = applyAction(run, 1, { type: 'restore', mark });
    expect(completion.ok).toBe(true);
    if (!completion.ok) throw new Error('Restoration failed');
    expect(completion.run).toMatchObject({ stage: 'complete', revision: 2, treatment, keeperMark: mark, restoration: mark });
    expect(completion.event).toEqual({ type: 'light_restored', revision: 2, mark });

    for (const glyph of GLYPHS) for (const bearing of BEARINGS) {
      const candidate: Mark = { glyph, bearing };
      if (glyph === mark.glyph && bearing === mark.bearing) continue;
      expect(applyAction(createRun(variant.id), 0, { type: 'prepare', mark: candidate, treatment })).toMatchObject({ ok: false, code: 'incorrect_keeper' });
      expect(applyAction(run, 1, { type: 'restore', mark: candidate })).toMatchObject({ ok: false, code: 'incorrect_runner' });
    }
  });
});

describe('evidence and transition integrity', () => {
  it('decodes hand-written direct and reflected examples independently of the authoring transform', () => {
    const base = { revision: 1, rule: '', lanterns: GLYPHS };
    const direct: RunnerView = { ...base, signal: { glyph: 'sun', bearing: 'west' }, examples: [
      { signal: { glyph: 'moon', bearing: 'east' }, lantern: { glyph: 'sun', bearing: 'north' } },
      { signal: { glyph: 'star', bearing: 'south' }, lantern: { glyph: 'moon', bearing: 'east' } },
    ] };
    expect(solveRunner(direct)).toEqual([{ glyph: 'star', bearing: 'south' }]);
    const reflected: RunnerView = { ...base, signal: { glyph: 'moon', bearing: 'east' }, examples: [
      { signal: { glyph: 'sun', bearing: 'north' }, lantern: { glyph: 'sun', bearing: 'north' } },
      { signal: { glyph: 'star', bearing: 'west' }, lantern: { glyph: 'moon', bearing: 'east' } },
    ] };
    expect(solveRunner(reflected)).toEqual([{ glyph: 'star', bearing: 'west' }]);
  });

  it('fails the content proof for impossible charts and ambiguous examples', () => {
    expect(proveVariant({ ...first, glyphs: ['sun', 'sun', 'star'] }, 'direct').solvable).toBe(false);
    const ambiguous = { ...first, exampleLanterns: [first.exampleLanterns[0], first.exampleLanterns[0]] as const };
    expect(proveVariant(ambiguous, 'reflected')).toMatchObject({ solvable: false, consistentRules: 2 });
  });

  it.each(VARIANTS)('$id changes the transmitted signal when the Keeper changes treatment', variant => {
    const direct = prepare(variant.id, 'direct').run;
    const reflected = prepare(variant.id, 'reflected').run;
    expect(direct.signal).not.toEqual(reflected.signal);
    for (const run of [direct, reflected]) {
      const view = runnerView(run);
      expect(view.examples.every(e => e.lantern.glyph !== run.keeperMark.glyph)).toBe(true);
      expect(view.examples.every(e => e.lantern.bearing !== run.keeperMark.bearing)).toBe(true);
    }
  });

  it('does not guess an answer with missing or contradictory environmental evidence', () => {
    const { run } = prepare();
    const view = runnerView(run);
    expect(solveRunner({ ...view, examples: [] }).length).toBeGreaterThan(1);
    const a = view.examples[0]!;
    expect(solveRunner({ ...view, examples: [a, { signal: a.signal, lantern: { glyph: 'moon', bearing: 'south' } }] })).toEqual([]);
  });

  it('rejects stale revisions, invalid revision types, stage skips and replay', () => {
    const initial = createRun(first.id);
    const { run, mark } = prepare();
    expect(applyAction(initial, 0, { type: 'restore', mark })).toMatchObject({ ok: false, code: 'wrong_stage' });
    expect(applyAction(run, 0, { type: 'restore', mark })).toMatchObject({ ok: false, code: 'stale_revision' });
    expect(applyAction(run, NaN, { type: 'restore', mark })).toMatchObject({ ok: false, code: 'invalid_revision' });
    expect(applyAction(run, -1, { type: 'restore', mark })).toMatchObject({ ok: false, code: 'invalid_revision' });
    expect(applyAction(run, 1.5, { type: 'restore', mark })).toMatchObject({ ok: false, code: 'invalid_revision' });
    expect(applyAction(run, 1, { type: 'prepare', mark, treatment: 'reflected' })).toMatchObject({ ok: false, code: 'wrong_stage' });
    const completed = applyAction(run, 1, { type: 'restore', mark });
    if (!completed.ok) throw new Error('Restoration failed');
    expect(applyAction(completed.run, 1, { type: 'restore', mark })).toMatchObject({ ok: false, code: 'stale_revision' });
    expect(applyAction(completed.run, 2, { type: 'restore', mark })).toMatchObject({ ok: false, code: 'wrong_stage' });
  });

  it.each([null, [], {}, { type: 'complete' }, { type: 'restore', mark: null },
    { type: 'prepare', mark: { glyph: 'star', bearing: 'south' }, treatment: 'magic' },
    { type: 'prepare', mark: { glyph: 'dragon', bearing: 'south' }, treatment: 'direct' },
    { type: 'prepare', mark: { glyph: 'star', bearing: 'up' }, treatment: 'direct' },
    { type: 'restore', mark: { glyph: 'star' } },
  ])('rejects untrusted action %#', action => {
    expect(applyAction(createRun(first.id), 0, action)).toMatchObject({ ok: false, code: 'invalid_action' });
  });

  it('does not mutate frozen input, emit events, or advance revision on an incorrect attempt', () => {
    const { run } = prepare();
    Object.freeze(run.signal);
    Object.freeze(run.keeperMark);
    Object.freeze(run);
    const before = JSON.stringify(run);
    expect(applyAction(run, 1, { type: 'restore', mark: { glyph: 'sun', bearing: 'north' } })).toEqual({ ok: false, code: 'incorrect_runner' });
    const answer = solveRunner(runnerView(run))[0]!;
    expect(applyAction(run, 1, { type: 'restore', mark: answer }).ok).toBe(true);
    expect(JSON.stringify(run)).toBe(before);
  });

  it('rejects unknown content and wrong-role views', () => {
    expect(() => createRun('not-authored')).toThrow('Unknown variant');
    const run: Run = createRun(first.id);
    expect(() => runnerView(run)).toThrow('Runner view unavailable');
    expect(() => keeperView(prepare().run)).toThrow('Keeper view unavailable');
  });
});
