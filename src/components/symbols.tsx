import type { Bearing, Glyph, Mark } from '../puzzle/grammar';

export function GlyphIcon({ glyph, className = '' }: { glyph: Glyph; className?: string }) {
  return <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    {glyph === 'sun' && <><circle cx="16" cy="16" r="6" /><path d="M16 2v4m0 20v4M2 16h4m20 0h4M6 6l3 3m14 14 3 3M6 26l3-3M23 9l3-3" /></>}
    {glyph === 'moon' && <path d="M23 4A13 13 0 1 0 28 23 12 12 0 0 1 23 4Z" />}
    {glyph === 'star' && <path d="m16 3 4 8.5 9.5 1.3-6.8 6.7 1.6 9.3L16 24.4l-8.3 4.4 1.6-9.3-6.8-6.7 9.5-1.3Z" />}
  </svg>;
}

export function RoleIcon({ role }: { role: 'keeper' | 'runner' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    {role === 'keeper' ? <><path d="m3 4 6-1 6 2 6-2v17l-6 2-6-2-6 1ZM9 3v17m6-15v17" /><path d="m6 9 1 2-1 2-1-2Z" /></> : <><path d="M7 7h10l2 13H5ZM9 7V5a3 3 0 0 1 6 0v2M4 21h16M9 16l3-6 3 6-3 3Z" /></>}
  </svg>;
}

const turns: Record<Bearing, number> = { north: 0, east: 90, south: 180, west: 270 };
export function SignalMark({ mark, compact = false }: { mark: Mark; compact?: boolean }) {
  return <span className={`signal-mark ${compact ? 'compact' : ''}`}>
    <span className="mark-drawing"><GlyphIcon glyph={mark.glyph} /><svg className="bearing-arrow" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="30" cy="30" r="27" strokeDasharray="1 5" /><path d="M30 4v9m-4-5 4-4 4 4" transform={`rotate(${turns[mark.bearing]} 30 30)`} /></svg></span>
    <span className="mark-caption">{mark.glyph} <span>· {mark.bearing}</span></span>
  </span>;
}

/** Original sample character; not collection artwork or a verified NFT. */
export function Pip({ className = '' }: { className?: string }) {
  return <svg className={className} width="160" height="170" viewBox="0 0 160 170" fill="none" aria-hidden="true">
    <ellipse cx="81" cy="155" rx="51" ry="9" fill="#151326" />
    <path d="M39 83C17 45 35 16 53 50 65 31 98 33 109 50c24-38 45-5 23 35 20 28 11 61-12 66H46C17 143 20 108 39 83Z" fill="#BBA8F5" stroke="#151326" strokeWidth="3" />
    <path d="M39 63q-6-20 7-6m70 2q13-18 10 5" stroke="#8170B4" strokeWidth="5" strokeLinecap="round" />
    <path d="M45 115q31 17 73-1l-3 14q-28 12-66 0Z" fill="#93D6C0" />
    <path d="m94 123 10 31 16-7-13-26" fill="#93D6C0" stroke="#151326" strokeWidth="2" />
    <ellipse cx="61" cy="88" rx="5" ry="7" fill="#24203D" /><ellipse cx="102" cy="88" rx="5" ry="7" fill="#24203D" />
    <path d="m74 100 7 4 7-4" stroke="#24203D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m33 122 21 13m71-11-15 11" stroke="#8170B4" strokeWidth="7" strokeLinecap="round" />
    <path d="M56 150v8m49-8v8" stroke="#BBA8F5" strokeWidth="13" strokeLinecap="round" />
    <path d="m48 70 71 63" stroke="#F4C76B" strokeWidth="4" /><rect x="103" y="123" width="27" height="23" rx="5" fill="#F4C76B" stroke="#24203D" strokeWidth="2" /><path d="M114 127h7v7h-7Z" stroke="#24203D" />
  </svg>;
}
