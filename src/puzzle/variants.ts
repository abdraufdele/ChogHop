import type { Bearing, Glyph, Mark, SignalRule, Slot, Treatment } from './grammar';

export type Variant = Readonly<{
  id: string;
  glyphs: readonly [Glyph, Glyph, Glyph];
  firstBearing: Bearing;
  missingSlot: Slot;
  rules: Readonly<Record<Treatment, SignalRule>>;
  exampleLanterns: readonly [Mark, Mark];
}>;

// Authored content, not NFT traits. Real metadata mapping belongs to a later adapter.
export const VARIANTS = [
  {
    id: 'last-lantern-01', glyphs: ['sun', 'moon', 'star'], firstBearing: 'north', missingSlot: 2,
    rules: {
      direct: { kind: 'direct', glyphOffset: 1, bearingOffset: 1 },
      reflected: { kind: 'reflected', glyphOffset: 0, bearingOffset: 0 },
    },
    exampleLanterns: [{ glyph: 'sun', bearing: 'north' }, { glyph: 'moon', bearing: 'east' }],
  },
  {
    id: 'last-lantern-02', glyphs: ['moon', 'star', 'sun'], firstBearing: 'east', missingSlot: 0,
    rules: {
      direct: { kind: 'direct', glyphOffset: 2, bearingOffset: 3 },
      reflected: { kind: 'reflected', glyphOffset: 1, bearingOffset: 2 },
    },
    exampleLanterns: [{ glyph: 'sun', bearing: 'south' }, { glyph: 'star', bearing: 'west' }],
  },
  {
    id: 'last-lantern-03', glyphs: ['star', 'moon', 'sun'], firstBearing: 'south', missingSlot: 1,
    rules: {
      direct: { kind: 'direct', glyphOffset: 1, bearingOffset: 2 },
      reflected: { kind: 'reflected', glyphOffset: 2, bearingOffset: 1 },
    },
    exampleLanterns: [{ glyph: 'sun', bearing: 'north' }, { glyph: 'star', bearing: 'east' }],
  },
  {
    id: 'last-lantern-04', glyphs: ['sun', 'star', 'moon'], firstBearing: 'west', missingSlot: 0,
    rules: {
      direct: { kind: 'direct', glyphOffset: 2, bearingOffset: 1 },
      reflected: { kind: 'reflected', glyphOffset: 0, bearingOffset: 3 },
    },
    exampleLanterns: [{ glyph: 'moon', bearing: 'north' }, { glyph: 'star', bearing: 'east' }],
  },
  {
    id: 'last-lantern-05', glyphs: ['moon', 'sun', 'star'], firstBearing: 'north', missingSlot: 1,
    rules: {
      direct: { kind: 'direct', glyphOffset: 1, bearingOffset: 3 },
      reflected: { kind: 'reflected', glyphOffset: 1, bearingOffset: 0 },
    },
    exampleLanterns: [{ glyph: 'moon', bearing: 'south' }, { glyph: 'star', bearing: 'west' }],
  },
  {
    id: 'last-lantern-06', glyphs: ['star', 'sun', 'moon'], firstBearing: 'south', missingSlot: 2,
    rules: {
      direct: { kind: 'direct', glyphOffset: 2, bearingOffset: 2 },
      reflected: { kind: 'reflected', glyphOffset: 2, bearingOffset: 2 },
    },
    exampleLanterns: [{ glyph: 'sun', bearing: 'east' }, { glyph: 'star', bearing: 'south' }],
  },
] as const satisfies readonly Variant[];

export function getVariant(id: string): Variant {
  const variant = VARIANTS.find(v => v.id === id);
  if (!variant) throw new RangeError(`Unknown variant: ${id}`);
  return variant;
}
