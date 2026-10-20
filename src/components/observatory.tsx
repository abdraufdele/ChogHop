'use client';

import { Pip, RoleIcon } from './symbols';
import type { Glyph } from '../puzzle/grammar';

type Props = { stage: string; selected: Glyph | null; onInspect: (object: 'chart' | 'lens' | 'lanterns') => void; interactive: boolean };

export function Observatory({ stage, selected, onInspect, interactive }: Props) {
  const lit = stage === 'complete';
  return <section className={`observatory ${lit ? 'is-lit' : ''} ${stage === 'handoff' ? 'is-transmitting' : ''}`} aria-label="Moonlit observatory">
    <div className="scene-caption"><span className="coordinate-cross">+</span> THE TIDELIGHT OBSERVATORY <span>STATION 01</span></div>
    <svg className="scene-art" viewBox="0 0 900 650" fill="none" role="img" aria-labelledby="scene-title scene-desc">
      <title id="scene-title">A little observatory at the edge of the sea</title>
      <desc id="scene-desc">Pip waits beside a damaged star chart. A telescope and three lanterns sit beneath a moonlit dome. {lit ? 'The restored lighthouse sends a warm beam out to sea.' : 'The lighthouse is dark.'}</desc>
      <path d="M27 90V24h65m716 0h65v66M27 555v65h65m716 0h65v-65" stroke="#48405F" />
      <g fill="#BBA8F5">
        {[[125, 130], [219, 66], [332, 106], [452, 56], [644, 95], [781, 172], [721, 56], [89, 278], [372, 192], [815, 282], [262, 203], [572, 44]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2 : 1} />)}
      </g>
      <g stroke="#6B5D91" strokeWidth="1"><path d="m114 142 109-64 111 44 116-58m-227 14 41 115 70-71" strokeDasharray="3 8" /><path d="M114 134v16m-8-8h16m320-86v16m-8-8h16" /></g>
      <circle cx="713" cy="122" r="41" fill="#BBA8F5" /><circle cx="732" cy="108" r="34" fill="#151326" />
      <path d="m44 388 116-57 65 24 105-41 77 57 125-28 81 23 99-46 141 61" stroke="#39334E" strokeWidth="2" />
      <g stroke="#48405F" strokeLinecap="round"><path d="M51 494h120m542-13h128M98 526h63m552 32h118M48 568h141m-62 36h95m487-78h81M74 459h87" /><path d="M209 519h17m554-1h23M94 581h33m558 16h37" /></g>
      <path d="M167 449q16 104 105 125l156 40 209-64 87-105-200-73Z" fill="#24203D" stroke="#48405F" strokeWidth="2" />
      <path d="m204 483 80 54 142 38 178-42 78-66M270 528l12 45m79-24 4 49m67-24v35m66-51-3 36m69-54-14 38m62-61-8 31" stroke="#3B3455" strokeWidth="2" />
      <path d="M165 447c18-61 133-111 265-101s281 44 293 98c-12 48-156 84-285 85S167 487 165 447Z" fill="#35304B" stroke="#716186" strokeWidth="2" />
      <path d="M229 455q162 63 415-5" stroke="#4D455E" strokeWidth="2" strokeDasharray="4 9" />
      <path d="m452 449-20 40 47 8 17-48m-60 33 47 8m-50-18 51 7" fill="#48405A" stroke="#83718A" />
      <path d="M388 248h219v182c-45 35-166 30-219 0Z" fill="#24203D" stroke="#8B78A4" strokeWidth="2" />
      <path d="M388 269q102 31 219-1m-219 91q110 28 219-1m-219 53q108 29 219-1M414 277v148m168-150v149" stroke="#4B405F" strokeWidth="2" />
      <path d="M371 245c6-83 63-125 126-125s123 45 129 125c-67 39-187 34-255 0Z" fill="#3B3357" stroke="#BBA8F5" strokeWidth="2" />
      <path d="M497 121c-38 31-57 73-57 142m57-142c42 34 62 78 63 142m-180-51q116 44 238 0M497 111v-13m-7 8h14" stroke="#8270AB" strokeWidth="2" />
      <path d="M481 122h30l7 141h-43Z" fill="#151326" stroke="#8270AB" />
      <path d="m503 225 106-68 18 31-104 73Z" fill="#75648D" stroke="#BBA8F5" strokeWidth="2" /><path d="m609 157 15-9 23 38-20 2" fill="#24203D" stroke="#BBA8F5" strokeWidth="2" />
      <ellipse cx="634" cy="167" rx="10" ry="22" transform="rotate(-31 634 167)" fill="#93D6C0" stroke="#BBA8F5" strokeWidth="2" />
      <circle cx="497" cy="318" r="29" fill="#151326" stroke="#F4C76B" strokeWidth="2" /><circle cx="497" cy="318" r="21" stroke="#75648D" strokeDasharray="1 7" /><path d="m497 301 4 12 12 5-12 5-4 12-4-12-12-5 12-5Z" stroke="#F4C76B" />
      <path d="M460 445v-51a36 36 0 0 1 72 0v51" fill="#151326" stroke="#8B78A4" strokeWidth="2" /><path d="M477 445v-49a19 19 0 0 1 38 0v49" stroke="#4B405F" strokeWidth="2" />
      <path d="m218 426 9-111 107 17-12 113Z" fill="#C9BCA6" stroke="#151326" strokeWidth="3" /><path d="m235 326 86 14-10 91-83-12Z" fill="#F6EDDB" /><g stroke="#817082"><path d="m244 351 57 10m-59 12 52 10m-55 12 52 10" strokeDasharray="2 6" /><path d="m252 343 6 12 13 3-11 9 1 13-10-8-13 3 5-12-7-11Z" /></g><path d="m275 409 20-1-6 20-10-7-7 4Z" fill="#C9BCA6" />
      <path d="M217 437v18m103-8v14m-78-25-5 25" stroke="#8B78A4" strokeWidth="5" strokeLinecap="round" />
      <g transform="translate(290 358) scale(.66)"><Pip /></g>
      <g transform="translate(141 301)"><path d="M-12 82h43L25 4H-6Z" fill="#24203D" stroke="#8B78A4" strokeWidth="2" /><path d="M-9 5h37L20-8H-2Z" fill="#4B405F" stroke="#8B78A4" /><path d="M0 5h17v22H0Z" fill={lit ? '#F4C76B' : '#48405F'} /><path d="M-4 40h25m-27 16h29" stroke="#4B405F" /></g>
      <path className="lighthouse-beam" d="m148 312 270-119v213Z" fill="#F4C76B" opacity="0" />
      <path className="relay-thread" d="M278 381C310 281 388 309 496 318s189 34 146 121" stroke="#F4C76B" strokeWidth="2" strokeDasharray="5 7" opacity={stage === 'keeper' ? '.18' : '.8'} />
      {(['sun', 'moon', 'star'] as const).map((glyph, i) => <g key={glyph} transform={`translate(${563 + i * 48} ${414 - i * 6})`}>
        <ellipse cy="39" rx="19" ry="6" fill="#24203D" /><path d="M-9 29h18l3-24h-24ZM-13 4h26m-22-2v-9a9 9 0 0 1 18 0v9m-22 30h26" fill={lit || (stage === 'runner' && selected === glyph) ? '#F4C76B' : '#48405F'} stroke="#BBA8F5" strokeWidth="1.5" />
        {glyph === 'sun' ? <circle cy="16" r="4" stroke="#151326" /> : glyph === 'moon' ? <path d="M3 11a6 6 0 1 0 2 9 5 5 0 0 1-2-9Z" stroke="#151326" /> : <path d="m0 10 2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1Z" stroke="#151326" />}
      </g>)}
      <g stroke="#93D6C0" strokeWidth="2" strokeLinecap="round"><path d="M203 447q-20-32-21-53m21 53q-33-13-36-30m36 30q8-29-2-43m472 47q25-25 20-55m-20 55q36-4 43-25m-43 25q-7-20 4-36" /><path d="m184 411-9-5m9 5 7-6m504 11 9-8m-9 8-7-8" /></g>
      <path d="m350 502 27 6m-18-18 30 7m242-214 22 4m-12-15 23 4" stroke="#817082" strokeWidth="2" />
      <g transform="translate(795 560)" stroke="#BBA8F5"><circle r="23" stroke="#48405F" /><path d="M0-31v62m-31-31h62m-62 0 31-10 31 10-31 10Z" /><path d="m0-23 5 23-5-5-5 5Z" fill="#BBA8F5" /></g>
    </svg>
    <button className="scene-hotspot chart-hotspot" disabled={!interactive} onClick={() => onInspect('chart')}><RoleIcon role="keeper" /><span>Star chart</span></button>
    <button className="scene-hotspot lens-hotspot" disabled={!interactive} onClick={() => onInspect('lens')}><span className="lens-symbol" aria-hidden="true" /><span>Signal lens</span></button>
    <button className="scene-hotspot lantern-hotspot" disabled={!interactive} onClick={() => onInspect('lanterns')}><RoleIcon role="runner" /><span>Three lanterns</span></button>
    <div className="scene-footnote"><span className="sample-dot" /> PIP · ORIGINAL SAMPLE CHARACTER <span>Listen to the clues.</span></div>
  </section>;
}
