import { BEARINGS, GLYPHS, TREATMENTS, sameMark, transform, wrap } from './grammar';
import type { Mark, SignalRule, Treatment } from './grammar';
import { chartFor, transmissionFor } from './engine';
import type { KeeperView, RunnerView } from './engine';
import type { Variant } from './variants';

const MARKS: readonly Mark[] = GLYPHS.flatMap(glyph => BEARINGS.map(bearing => ({ glyph, bearing })));

/** Enumerate candidate boards against visible constraints, independently of action validation. */
export function solveKeeper(view: KeeperView): Mark[] {
  const slots = view.clues.map(c => c.slot);
  if (new Set(slots).size !== 2 || slots.includes(view.missingSlot) ||
      ![view.missingSlot, ...slots].every(s => Number.isInteger(s) && s >= 0 && s <= 2)) return [];
  return MARKS.filter(candidate => {
    const board = [0, 1, 2].map(slot => slot === view.missingSlot ? candidate : view.clues.find(c => c.slot === slot)?.mark);
    if (board.some(m => !m)) return false;
    const marks = board as Mark[];
    if (new Set(marks.map(m => m.glyph)).size !== 3) return false;
    return marks.slice(1).every((mark, i) =>
      BEARINGS.indexOf(mark.bearing) === wrap(BEARINGS.indexOf(marks[i]!.bearing) + 1, 4));
  });
}

/** Enumerate all 24 decoding rules, using only the Runner's public examples. */
export function consistentRules(view: RunnerView): SignalRule[] {
  const candidates: SignalRule[] = [];
  for (const kind of TREATMENTS) for (const glyphOffset of [0, 1, 2] as const) {
    for (const bearingOffset of [0, 1, 2, 3] as const) {
      const rule = { kind, glyphOffset, bearingOffset };
      if (view.examples.every(e => sameMark(transform(e.signal, rule), e.lantern))) candidates.push(rule);
    }
  }
  return candidates;
}

export function solveRunner(view: RunnerView): Mark[] {
  const answers = consistentRules(view).map(rule => transform(view.signal, rule));
  return MARKS.filter(mark => answers.some(answer => sameMark(mark, answer)));
}

export function proveVariant(variant: Variant, treatment: Treatment) {
  const keeperSolutions = solveKeeper(chartFor(variant));
  const keeper = keeperSolutions[0];
  if (keeperSolutions.length !== 1 || !keeper) {
    return { solvable: false, keeperSolutions, runnerSolutions: [], consistentRules: 0 };
  }
  const view = transmissionFor(variant, keeper, treatment);
  const runnerSolutions = solveRunner(view);
  const ruleCount = consistentRules(view).length;
  const authored: Mark = {
    glyph: variant.glyphs[variant.missingSlot],
    bearing: BEARINGS[wrap(BEARINGS.indexOf(variant.firstBearing) + variant.missingSlot, 4)]!,
  };
  return {
    solvable: sameMark(keeper, authored) && ruleCount === 1 &&
      runnerSolutions.length === 1 && sameMark(runnerSolutions[0]!, keeper),
    keeperSolutions, runnerSolutions, consistentRules: ruleCount,
  };
}
