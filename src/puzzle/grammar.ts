export const GLYPHS = ['sun', 'moon', 'star'] as const;
export const BEARINGS = ['north', 'east', 'south', 'west'] as const;
export const TREATMENTS = ['direct', 'reflected'] as const;
export type Glyph = typeof GLYPHS[number];
export type Bearing = typeof BEARINGS[number];
export type Treatment = typeof TREATMENTS[number];
export type Mark = Readonly<{ glyph: Glyph; bearing: Bearing }>;
export type Slot = 0 | 1 | 2;
export type ChartClue = Readonly<{ slot: Slot; mark: Mark }>;
export type Example = Readonly<{ signal: Mark; lantern: Mark }>;
export type SignalRule = Readonly<{ kind: Treatment; glyphOffset: Slot; bearingOffset: 0 | 1 | 2 | 3 }>;

export const CHART_RULE = 'Each glyph appears once. Moving one slot right turns the arrow one quarter clockwise.';
export const RUNNER_RULE = 'Glyph wheel: sun, moon, star. Arrow wheel: north, east, south, west. Both wheels either turn or reflect; each has its own fixed offset. Read the two signal-to-lantern examples.';
export const wrap = (value: number, size: number): number => ((value % size) + size) % size;
export const sameMark = (a: Mark, b: Mark): boolean => a.glyph === b.glyph && a.bearing === b.bearing;
export const copyMark = (mark: Mark): Mark => ({ glyph: mark.glyph, bearing: mark.bearing });

export function turnBearing(bearing: Bearing, steps: number): Bearing {
  return BEARINGS[wrap(BEARINGS.indexOf(bearing) + steps, 4)]!;
}

/** The same finite grammar describes forward transmission and inverse decoding. */
export function transform(mark: Mark, rule: SignalRule): Mark {
  const direction = rule.kind === 'direct' ? 1 : -1;
  return {
    glyph: GLYPHS[wrap(direction * GLYPHS.indexOf(mark.glyph) + rule.glyphOffset, 3)]!,
    bearing: BEARINGS[wrap(direction * BEARINGS.indexOf(mark.bearing) + rule.bearingOffset, 4)]!,
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isMark(value: unknown): value is Mark {
  return isRecord(value) && GLYPHS.some(g => g === value.glyph) && BEARINGS.some(b => b === value.bearing);
}
